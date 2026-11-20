from datetime import datetime, timezone
from bson import ObjectId
from flask import Blueprint, request, jsonify, abort, g
from app.db import db
from app.utils.auth_utils import login_required
from app.utils.serializers import serialize_doc

folders_bp = Blueprint("folders", __name__)

def _folder_with_count(folder: dict, user_id: ObjectId) -> dict:
    data = serialize_doc(folder)
    data["receipt_count"] = db.receipts.count_documents({
        "user_id": user_id,
        "folder_id": folder["_id"],
        "is_archived": False,
    })
    return data

@folders_bp.route("/folders", methods=["GET"])
@login_required
def list_folders():
    user_id = g.current_user["_id"]
    folders = list(db.folders.find({"user_id": user_id}).sort("created_at", 1))
    return jsonify({"data": [_folder_with_count(f, user_id) for f in folders]}), 200

@folders_bp.route("/folders", methods=["POST"])
@login_required
def create_folder():
    body = request.get_json(silent=True) or {}
    name = (body.get("name") or "").strip()
    if not name:
        abort(400, description="Folder name is required")

    doc = {
        "user_id": g.current_user["_id"],
        "name": name,
        "emoji": body.get("emoji") or "📁",
        "color": body.get("color") or "#0F766E",
        "created_at": datetime.now(timezone.utc),
    }
    res = db.folders.insert_one(doc)
    doc["_id"] = res.inserted_id
    out = serialize_doc(doc)
    out["receipt_count"] = 0
    return jsonify(out), 201

@folders_bp.route("/folders/<folder_id>", methods=["PATCH"])
@login_required
def update_folder(folder_id):
    body = request.get_json(silent=True) or {}
    updates = {k: body[k] for k in ("name", "emoji", "color") if k in body}
    user_id = g.current_user["_id"]

    folder = db.folders.find_one_and_update(
        {"_id": ObjectId(folder_id), "user_id": user_id},
        {"$set": updates},
        return_document=True,
    )
    if not folder:
        abort(404, description="Folder not found")
    return jsonify(_folder_with_count(folder, user_id)), 200

@folders_bp.route("/folders/<folder_id>", methods=["DELETE"])
@login_required
def delete_folder(folder_id):
    user_id = g.current_user["_id"]
    fid = ObjectId(folder_id)
    db.folders.delete_one({"_id": fid, "user_id": user_id})
    db.receipts.update_many(
        {"user_id": user_id, "folder_id": fid},
        {"$set": {"folder_id": None}},
    )
    return "", 204

# --- TAGS (Aggregated directly from receipts.tags) ---

@folders_bp.route("/tags", methods=["GET"])
@login_required
def list_tags():
    pipeline = [
        {"$match": {"user_id": g.current_user["_id"]}},
        {"$unwind": "$tags"},
        {"$group": {"_id": "$tags", "receipt_count": {"$sum": 1}}},
        {"$project": {"_id": 0, "id": "$_id", "name": "$_id", "receipt_count": 1}},
        {"$sort": {"receipt_count": -1}},
    ]
    tags = list(db.receipts.aggregate(pipeline))
    return jsonify({"data": tags}), 200

@folders_bp.route("/tags", methods=["POST"])
@login_required
def create_tag():
    body = request.get_json(silent=True) or {}
    name = (body.get("name") or "").strip().lower()
    if not name:
        abort(400, description="Tag name is required")
    return jsonify({"id": name, "name": name, "receipt_count": 0}), 201

@folders_bp.route("/tags/<tag_name>", methods=["DELETE"])
@login_required
def delete_tag(tag_name):
    db.receipts.update_many(
        {"user_id": g.current_user["_id"]},
        {"$pull": {"tags": tag_name}},
    )
    return "", 204