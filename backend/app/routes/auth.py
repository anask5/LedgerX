from datetime import datetime, timezone
from flask import Blueprint, request, jsonify, abort, g
from pymongo.errors import DuplicateKeyError
from app.db import db
from app.utils.auth_utils import (
    hash_password,
    verify_password,
    hash_token,
    create_tokens,
    login_required,
)
from app.utils.serializers import serialize_doc

auth_bp = Blueprint("auth", __name__)

def _public_user(user: dict) -> dict:
    data = serialize_doc(user)
    data.pop("password_hash", None)
    data.pop("refresh_tokens", None)
    return data

@auth_bp.route("/auth/signup", methods=["POST"])
def signup():
    body = request.get_json(silent=True) or {}
    email = (body.get("email") or "").strip().lower()
    password = body.get("password") or ""
    name = (body.get("name") or "").strip()

    if not email or not password or not name:
        abort(400, description="Email, password, and name are required")
    if len(password) < 6:
        abort(400, description="Password must be at least 6 characters")

    now = datetime.now(timezone.utc)
    user_doc = {
        "email": email,
        "password_hash": hash_password(password),
        "name": name,
        "avatar_url": None,
        "refresh_tokens": [],
        "created_at": now,
        "updated_at": now,
    }

    try:
        res = db.users.insert_one(user_doc)
    except DuplicateKeyError:
        abort(409, description="An account with this email already exists")

    tokens = create_tokens(str(res.inserted_id))
    return jsonify(tokens), 201

@auth_bp.route("/auth/login", methods=["POST"])
def login():
    body = request.get_json(silent=True) or {}
    email = (body.get("email") or "").strip().lower()
    password = body.get("password") or ""

    user = db.users.find_one({"email": email})
    if not user or not verify_password(password, user["password_hash"]):
        abort(401, description="Invalid email or password")

    tokens = create_tokens(str(user["_id"]))
    return jsonify(tokens), 200

@auth_bp.route("/auth/refresh", methods=["POST"])
def refresh():
    body = request.get_json(silent=True) or {}
    raw_refresh = body.get("refresh_token")
    if not raw_refresh:
        abort(400, description="refresh_token is required")

    token_h = hash_token(raw_refresh)
    now = datetime.now(timezone.utc)

    user = db.users.find_one({
        "refresh_tokens": {
            "$elemMatch": {
                "token_hash": token_h,
                "expires_at": {"$gt": now},
            }
        }
    })
    if not user:
        abort(401, description="Invalid or expired refresh token")

    # Rotate refresh token: revoke old one and issue a fresh pair
    db.users.update_one(
        {"_id": user["_id"]},
        {"$pull": {"refresh_tokens": {"token_hash": token_h}}},
    )
    tokens = create_tokens(str(user["_id"]))
    return jsonify(tokens), 200

@auth_bp.route("/auth/logout", methods=["POST"])
@login_required
def logout():
    body = request.get_json(silent=True) or {}
    raw_refresh = body.get("refresh_token")
    if raw_refresh:
        db.users.update_one(
            {"_id": g.current_user["_id"]},
            {"$pull": {"refresh_tokens": {"token_hash": hash_token(raw_refresh)}}},
        )
    else:
        db.users.update_one(
            {"_id": g.current_user["_id"]},
            {"$set": {"refresh_tokens": []}},
        )
    return "", 204

@auth_bp.route("/auth/forgot-password", methods=["POST"])
def forgot_password():
    # Always return 204 to avoid leaking registered emails
    return "", 204

@auth_bp.route("/me", methods=["GET"])
@login_required
def get_me():
    return jsonify(_public_user(g.current_user)), 200

@auth_bp.route("/me", methods=["PATCH"])
@login_required
def update_me():
    body = request.get_json(silent=True) or {}
    updates = {}
    if "name" in body and body["name"]:
        updates["name"] = body["name"].strip()
    if "avatar_url" in body:
        updates["avatar_url"] = body["avatar_url"]

    if updates:
        updates["updated_at"] = datetime.now(timezone.utc)
        db.users.update_one({"_id": g.current_user["_id"]}, {"$set": updates})

    updated = db.users.find_one({"_id": g.current_user["_id"]})
    return jsonify(_public_user(updated)), 200

@auth_bp.route("/me", methods=["DELETE"])
@login_required
def delete_account():
    user_id = g.current_user["_id"]
    db.receipts.delete_many({"user_id": user_id})
    db.folders.delete_many({"user_id": user_id})
    db.reminders.delete_many({"user_id": user_id})
    db.share_links.delete_many({"user_id": user_id})
    db.users.delete_one({"_id": user_id})
    return "", 204