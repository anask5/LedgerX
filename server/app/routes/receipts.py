from datetime import datetime, timezone
import hashlib
import os
import re
import uuid

from bson import ObjectId
from flask import Blueprint, request, jsonify, abort, g

from app.config import Config
from app.db import db
from app.services.ocr_service import parse_receipt_image
from app.utils.auth_utils import login_required
from app.utils.serializers import serialize_doc


receipts_bp = Blueprint("receipts", __name__)


def _sync_reminders_for_receipt(
    user_id: ObjectId,
    receipt_id: ObjectId,
    receipt_doc: dict,
    now: datetime
):
    """Create warranty and return-deadline reminders from a receipt."""

    db.reminders.delete_many({
        "receipt_id": receipt_id,
        "user_id": user_id
    })

    for item in receipt_doc.get("items", []):
        if item.get("status") == "returned":
            continue

        for r_type, field in [
            ("brand_warranty_expiry", "brand_warranty_expiry"),
            ("extended_warranty_expiry", "extended_warranty_expiry"),
            ("return_deadline", "return_deadline"),
        ]:
            if item.get(field):
                db.reminders.insert_one({
                    "user_id": user_id,
                    "receipt_id": receipt_id,
                    "receipt_item_id": item["id"],
                    "type": r_type,
                    "item_name": item["name"],
                    "store_name": receipt_doc.get("store_name", "Unknown Store"),
                    "deadline": item[field],
                    "snoozed_until": None,
                    "created_at": now,
                })


# =========================================================
# GET ALL RECEIPTS
# =========================================================

@receipts_bp.route("/receipts", methods=["GET"])
@login_required
def list_receipts():

    user_id = g.current_user["_id"]

    query = {
        "user_id": user_id,
        "is_archived": False
    }

    q = request.args.get("q")

    if q:
        regex = {
            "$regex": re.escape(q),
            "$options": "i"
        }

        query["$or"] = [
            {"store_name": regex},
            {"category": regex},
            {"notes": regex},
            {"items.name": regex},
        ]

    if request.args.get("category"):
        query["category"] = request.args["category"]

    if request.args.get("folder_id"):
        query["folder_id"] = ObjectId(request.args["folder_id"])

    if request.args.get("tag"):
        query["tags"] = request.args["tag"]

    if request.args.get("is_favorite") == "true":
        query["is_favorite"] = True

    if request.args.get("date_from") or request.args.get("date_to"):

        query["purchase_date"] = {}

        if request.args.get("date_from"):
            query["purchase_date"]["$gte"] = request.args["date_from"]

        if request.args.get("date_to"):
            query["purchase_date"]["$lte"] = request.args["date_to"]

    if request.args.get("amount_min") or request.args.get("amount_max"):

        query["total_amount"] = {}

        if request.args.get("amount_min"):
            query["total_amount"]["$gte"] = float(
                request.args["amount_min"]
            )

        if request.args.get("amount_max"):
            query["total_amount"]["$lte"] = float(
                request.args["amount_max"]
            )

    sort_map = {
        "newest": ("purchase_date", -1),
        "oldest": ("purchase_date", 1),
        "highest_amount": ("total_amount", -1),
        "expiring_soonest": ("return_deadline", 1),
    }

    sort_field, sort_dir = sort_map.get(
        request.args.get("sort", "newest"),
        ("purchase_date", -1)
    )

    page = max(int(request.args.get("page", 1)), 1)

    page_size = min(
        max(int(request.args.get("page_size", 20)), 1),
        100
    )

    total = db.receipts.count_documents(query)

    cursor = (
        db.receipts.find(query)
        .sort(sort_field, sort_dir)
        .skip((page - 1) * page_size)
        .limit(page_size)
    )

    items = [serialize_doc(r) for r in cursor]

    return jsonify({
        "data": items,
        "total": total,
        "page": page,
        "page_size": page_size
    }), 200


# =========================================================
# UPLOAD RECEIPT + OCR
# =========================================================

@receipts_bp.route("/receipts", methods=["POST"])
@login_required
def upload_receipt():

    user_id = g.current_user["_id"]

    file = request.files.get("file") or request.files.get("image")

    if not file:
        abort(400, description="Receipt file is required")

    raw_bytes = file.read()

    if not raw_bytes:
        abort(400, description="Uploaded file is empty")

    img_hash = hashlib.sha256(raw_bytes).hexdigest()

    # -----------------------------------------------------
    # DUPLICATE DETECTION
    # -----------------------------------------------------

    if request.form.get("force") != "true":

        existing = db.receipts.find_one({
            "user_id": user_id,
            "image_hash": img_hash
        })

        if existing:

            return jsonify({
                "data": {
                    "id": str(existing["_id"]),
                    "status": existing.get("status", "unknown"),
                    "duplicate": True,
                    "existing_id": str(existing["_id"]),
                }
            }), 200

    # -----------------------------------------------------
    # SAVE IMAGE
    # -----------------------------------------------------

    ext = os.path.splitext(file.filename or "receipt.jpg")[1] or ".jpg"

    filename = f"{uuid.uuid4().hex}{ext}"

    save_path = os.path.join(
        Config.UPLOAD_FOLDER,
        filename
    )

    os.makedirs(Config.UPLOAD_FOLDER, exist_ok=True)

    with open(save_path, "wb") as f:
        f.write(raw_bytes)

    image_url = f"{Config.BASE_URL}/uploads/{filename}"

    now = datetime.now(timezone.utc)

    # -----------------------------------------------------
    # OCR PROCESSING
    # -----------------------------------------------------

    try:

        print("[OCR] Starting receipt extraction...")

        parsed = parse_receipt_image(
            raw_bytes,
            file.mimetype or "image/jpeg"
        )

        if not parsed:
            raise ValueError("OCR returned an empty result")

        if not isinstance(parsed, dict):
            raise ValueError(
                f"OCR returned unexpected type: {type(parsed).__name__}"
            )

        print("[OCR] Extraction successful")

    except Exception as e:

        print(f"[OCR Error] Receipt processing failed: {repr(e)}")

        return jsonify({
            "error": "Receipt OCR failed",
            "message": (
                "The receipt image was uploaded but could not be "
                "processed. Please try again."
            )
        }), 422

    # -----------------------------------------------------
    # RECEIPT DOCUMENT
    # -----------------------------------------------------

    receipt_doc = {

        "user_id": user_id,

        "folder_id": (
            ObjectId(request.form["folder_id"])
            if request.form.get("folder_id")
            else None
        ),

        "store_name": "New Receipt",
        "store_address": None,
        "store_phone": None,

        "purchase_date": now.strftime("%Y-%m-%d"),
        "total_amount": 0,
        "currency": "INR",

        "payment_mode": "other",
        "receipt_number": None,

        "subtotal": 0,
        "tax": 0,

        "category": "Other",

        "image_url": image_url,
        "thumbnail_url": image_url,
        "image_hash": img_hash,

        "status": "needs_review",
        "ocr_confidence": None,
        "needs_review": [],

        "items": [],
        "tags": [],

        "is_favorite": False,
        "is_archived": False,

        "return_deadline": None,
        "notes": None,

        "created_at": now,
        "updated_at": now,
    }

    # -----------------------------------------------------
    # APPLY OCR RESULTS
    # -----------------------------------------------------

    receipt_doc.update({
        k: v
        for k, v in parsed.items()
        if v is not None
    })

    # Never automatically consider an OCR result fully confirmed.
    receipt_doc["status"] = "needs_review"

    # -----------------------------------------------------
    # INSERT INTO DATABASE
    # -----------------------------------------------------

    res = db.receipts.insert_one(receipt_doc)

    # -----------------------------------------------------
    # SYNC REMINDERS
    # -----------------------------------------------------

    _sync_reminders_for_receipt(
        user_id,
        res.inserted_id,
        receipt_doc,
        now
    )

    # -----------------------------------------------------
    # RESPONSE
    # -----------------------------------------------------

    return jsonify({
        "data": {
            "id": str(res.inserted_id),
            "status": receipt_doc["status"]
        }
    }), 201


# =========================================================
# GET SINGLE RECEIPT
# =========================================================

@receipts_bp.route("/receipts/<receipt_id>", methods=["GET"])
@login_required
def get_receipt(receipt_id):

    receipt = db.receipts.find_one({
        "_id": ObjectId(receipt_id),
        "user_id": g.current_user["_id"],
    })

    if not receipt:
        abort(404, description="Receipt not found")

    return jsonify(serialize_doc(receipt)), 200


# =========================================================
# UPDATE RECEIPT
# =========================================================

@receipts_bp.route("/receipts/<receipt_id>", methods=["PATCH"])
@login_required
def update_receipt(receipt_id):

    user_id = g.current_user["_id"]

    rid = ObjectId(receipt_id)

    body = request.get_json(silent=True) or {}

    allowed = {
        "store_name",
        "store_address",
        "store_phone",
        "purchase_date",
        "total_amount",
        "currency",
        "payment_mode",
        "receipt_number",
        "subtotal",
        "tax",
        "category",
        "items",
        "tags",
        "is_favorite",
        "is_archived",
        "return_deadline",
        "notes",
    }

    updates = {
        k: body[k]
        for k in allowed
        if k in body
    }

    # Ensure newly added items have IDs

    if "items" in updates and isinstance(updates["items"], list):

        for item in updates["items"]:

            if not item.get("id"):
                item["id"] = str(ObjectId())

    # Folder handling

    if "folder_id" in body:

        updates["folder_id"] = (
            ObjectId(body["folder_id"])
            if body["folder_id"]
            else None
        )

    # Confirm receipt

    if body.get("confirm"):

        updates["needs_review"] = []

    now = datetime.now(timezone.utc)

    updates["updated_at"] = now

    updated = db.receipts.find_one_and_update(
        {
            "_id": rid,
            "user_id": user_id
        },
        {
            "$set": updates
        },
        return_document=True,
    )

    if not updated:
        abort(404, description="Receipt not found")

    # Sync reminders if receipt details changed

    if any(k in updates for k in ("items", "store_name")):

        _sync_reminders_for_receipt(
            user_id,
            rid,
            updated,
            now
        )

    return jsonify(serialize_doc(updated)), 200


# =========================================================
# DELETE RECEIPT
# =========================================================

@receipts_bp.route("/receipts/<receipt_id>", methods=["DELETE"])
@login_required
def delete_receipt(receipt_id):

    user_id = g.current_user["_id"]

    rid = ObjectId(receipt_id)

    res = db.receipts.delete_one({
        "_id": rid,
        "user_id": user_id
    })

    if res.deleted_count == 0:
        abort(404, description="Receipt not found")

    db.reminders.delete_many({
        "receipt_id": rid,
        "user_id": user_id
    })

    return "", 204


# =========================================================
# UPDATE RECEIPT ITEM
# =========================================================

@receipts_bp.route("/receipt-items/<item_id>", methods=["PATCH"])
@login_required
def update_receipt_item(item_id):

    user_id = g.current_user["_id"]

    body = request.get_json(silent=True) or {}

    now = datetime.now(timezone.utc)

    set_fields = {
        f"items.$.{k}": v
        for k, v in body.items()
        if k != "id"
    }

    set_fields["updated_at"] = now

    receipt = db.receipts.find_one_and_update(
        {
            "user_id": user_id,
            "items.id": item_id
        },
        {
            "$set": set_fields
        },
        return_document=True,
    )

    if not receipt:
        abort(404, description="Receipt item not found")

    # Sync reminders

    _sync_reminders_for_receipt(
        user_id,
        receipt["_id"],
        receipt,
        now
    )

    updated_item = next(
        (
            i for i in receipt.get("items", [])
            if i.get("id") == item_id
        ),
        {}
    )

    return jsonify(updated_item), 200