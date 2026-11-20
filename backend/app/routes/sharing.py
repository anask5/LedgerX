import csv
import io
import os
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from bson import ObjectId
from flask import Blueprint, request, jsonify, abort, g
from app.config import Config
from app.db import db
from app.utils.auth_utils import login_required
from app.utils.serializers import serialize_doc

sharing_bp = Blueprint("sharing", __name__)

EXPIRY_MAP = {
    "24h": timedelta(hours=24),
    "7d": timedelta(days=7),
    "30d": timedelta(days=30),
}

def _serialize_link(link: dict) -> dict:
    data = serialize_doc(link)
    data["url"] = f"{Config.BASE_URL}/api/v1/public/share/{link['token']}"
    return data

@sharing_bp.route("/receipts/<receipt_id>/share-links", methods=["POST"])
@login_required
def create_share_link(receipt_id):
    user_id = g.current_user["_id"]
    rid = ObjectId(receipt_id)
    if not db.receipts.find_one({"_id": rid, "user_id": user_id}):
        abort(404, description="Receipt not found")

    body = request.get_json(silent=True) or {}
    delta = EXPIRY_MAP.get(body.get("expiry", "7d"), timedelta(days=7))
    now = datetime.now(timezone.utc)

    doc = {
        "user_id": user_id,
        "receipt_id": rid,
        "token": secrets.token_urlsafe(24),
        "expires_at": now + delta,
        "hide_payment": bool(body.get("hide_payment", False)),
        "hide_phone": bool(body.get("hide_phone", False)),
        "view_count": 0,
        "created_at": now,
    }
    res = db.share_links.insert_one(doc)
    doc["_id"] = res.inserted_id
    return jsonify(_serialize_link(doc)), 201

@sharing_bp.route("/receipts/<receipt_id>/share-links", methods=["GET"])
@login_required
def list_share_links(receipt_id):
    links = list(db.share_links.find({
        "receipt_id": ObjectId(receipt_id),
        "user_id": g.current_user["_id"],
    }))
    return jsonify({"data": [_serialize_link(l) for l in links]}), 200

@sharing_bp.route("/share-links/<link_id>", methods=["DELETE"])
@login_required
def revoke_share_link(link_id):
    db.share_links.delete_one({
        "_id": ObjectId(link_id),
        "user_id": g.current_user["_id"],
    })
    return "", 204

@sharing_bp.route("/public/share/<token>", methods=["GET"])
def public_share_view(token):
    now = datetime.now(timezone.utc)
    link = db.share_links.find_one_and_update(
        {"token": token, "expires_at": {"$gt": now}},
        {"$inc": {"view_count": 1}},
        return_document=True,
    )
    if not link:
        abort(404, description="Share link is invalid or expired")

    receipt = db.receipts.find_one({"_id": link["receipt_id"]})
    if not receipt:
        abort(404, description="Receipt not found")

    data = serialize_doc(receipt)
    if link.get("hide_payment"):
        data["payment_mode"] = "other"
    if link.get("hide_phone"):
        data["store_phone"] = None
    return jsonify(data), 200

@sharing_bp.route("/receipts/<receipt_id>/proof", methods=["GET"])
@login_required
def download_proof(receipt_id):
    receipt = db.receipts.find_one({
        "_id": ObjectId(receipt_id),
        "user_id": g.current_user["_id"],
    })
    if not receipt:
        abort(404, description="Receipt not found")
    # Returns the stored receipt image/document URL directly
    return jsonify({"url": receipt["image_url"]}), 200

@sharing_bp.route("/exports/receipts.csv", methods=["GET"])
@login_required
def export_csv():
    query = {"user_id": g.current_user["_id"], "is_archived": False}
    if request.args.get("category"):
        query["category"] = request.args["category"]
    if request.args.get("date_from") or request.args.get("date_to"):
        query["purchase_date"] = {}
        if request.args.get("date_from"):
            query["purchase_date"]["$gte"] = request.args["date_from"]
        if request.args.get("date_to"):
            query["purchase_date"]["$lte"] = request.args["date_to"]

    receipts = list(db.receipts.find(query).sort("purchase_date", -1))
    filename = f"export_{uuid.uuid4().hex[:8]}.csv"
    filepath = os.path.join(Config.UPLOAD_FOLDER, filename)

    with open(filepath, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["Store Name", "Purchase Date", "Total Amount", "Currency", "Category", "Payment Mode", "Receipt Number", "Notes"])
        for r in receipts:
            writer.writerow([
                r.get("store_name", ""),
                r.get("purchase_date", ""),
                r.get("total_amount", 0),
                r.get("currency", "INR"),
                r.get("category", ""),
                r.get("payment_mode", ""),
                r.get("receipt_number", ""),
                r.get("notes", ""),
            ])

    return jsonify({"url": f"{Config.BASE_URL}/uploads/{filename}"}), 200

@sharing_bp.route("/imports/receipts.csv", methods=["POST"])
@login_required
def import_csv():
    file = request.files.get("file")
    if not file:
        abort(400, description="CSV file is required")

    text = file.read().decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(text))
    now = datetime.now(timezone.utc)
    imported = 0

    for row in reader:
        store = (row.get("Store Name") or row.get("store_name") or "").strip()
        if not store:
            continue
        db.receipts.insert_one({
            "user_id": g.current_user["_id"],
            "folder_id": None,
            "store_name": store,
            "store_address": None,
            "store_phone": None,
            "purchase_date": row.get("Purchase Date") or row.get("purchase_date") or now.strftime("%Y-%m-%d"),
            "total_amount": float(row.get("Total Amount") or row.get("total_amount") or 0),
            "currency": row.get("Currency") or row.get("currency") or "INR",
            "payment_mode": row.get("Payment Mode") or row.get("payment_mode") or "other",
            "receipt_number": row.get("Receipt Number") or row.get("receipt_number") or None,
            "subtotal": None,
            "tax": None,
            "category": row.get("Category") or row.get("category") or "Other",
            "image_url": "",
            "thumbnail_url": None,
            "image_hash": None,
            "status": "ready",
            "ocr_confidence": None,
            "needs_review": [],
            "items": [],
            "tags": ["imported"],
            "is_favorite": False,
            "is_archived": False,
            "return_deadline": None,
            "notes": row.get("Notes") or row.get("notes") or None,
            "created_at": now,
            "updated_at": now,
        })
        imported += 1

    return jsonify({"imported": imported}), 200