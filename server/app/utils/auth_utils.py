from datetime import datetime, timedelta, timezone
from functools import wraps
import hashlib
import secrets
import bcrypt
import jwt
from bson import ObjectId
from flask import request, abort, g
from app.config import Config
from app.db import db

ACCESS_TOKEN_MINUTES = 60
REFRESH_TOKEN_DAYS = 30

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))

def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()

def create_tokens(user_id: str) -> dict:
    now = datetime.now(timezone.utc)
    access_payload = {
        "sub": user_id,
        "type": "access",
        "iat": now,
        "exp": now + timedelta(minutes=ACCESS_TOKEN_MINUTES),
    }
    access_token = jwt.encode(access_payload, Config.JWT_SECRET, algorithm="HS256")
    raw_refresh = secrets.token_urlsafe(48)

    db.users.update_one(
        {"_id": ObjectId(user_id)},
        {
            "$push": {
                "refresh_tokens": {
                    "token_hash": hash_token(raw_refresh),
                    "expires_at": now + timedelta(days=REFRESH_TOKEN_DAYS),
                }
            }
        },
    )

    return {
        "access_token": access_token,
        "refresh_token": raw_refresh,
        "expires_in": ACCESS_TOKEN_MINUTES * 60,
    }

def login_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            abort(401, description="Missing or invalid Authorization header")

        token = auth_header.split(" ", 1)[1].strip()
        try:
            payload = jwt.decode(token, Config.JWT_SECRET, algorithms=["HS256"])
            if payload.get("type") != "access":
                abort(401, description="Invalid token type")
            user_id = payload.get("sub")
        except jwt.ExpiredSignatureError:
            abort(401, description="Access token expired")
        except jwt.PyJWTError:
            abort(401, description="Invalid access token")

        user = db.users.find_one({"_id": ObjectId(user_id)})
        if not user:
            abort(401, description="User not found")

        g.current_user = user
        return fn(*args, **kwargs)

    return wrapper