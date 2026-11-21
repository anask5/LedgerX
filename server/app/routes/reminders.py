from datetime import datetime, date, timedelta, timezone
from bson import ObjectId
from flask import Blueprint, request, jsonify, abort, g
from app.db import db
from app.utils.auth_utils import login_required

reminders_bp = Blueprint("reminders", __name__)

def _format_reminder(rem: dict, today: date) -> dict:
    deadline_date = date.fromisoformat(rem["deadline"])
    days_left = (deadline_date - today).days

    if days_left < 0:
        status = "expired"
    elif days_left <= 14:
        status = "expiring_soon"
    else:
        status = "upcoming"

    snoozed = rem.get("snoozed_until")
    return {
        "id": str(rem["_id"]),
        "receipt_id": str(rem["receipt_id"]),
        "receipt_item_id": rem.get("receipt_item_id"),
        "type": rem["type"],
        "item_name": rem["item_name"],
        "store_name": rem["store_name"],
        "deadline": rem["deadline"],
        "days_left": days_left,
        "status": status,
        "snoozed_until": snoozed.isoformat() if isinstance(snoozed, datetime) else snoozed,
    }

def _get_reminders_by_status(target_status: str):
    now = datetime.now(timezone.utc)
    today = now.date()
    docs = list(
        db.reminders.find({
            "user_id": g.current_user["_id"],
            "$or": [{"snoozed_until": None}, {"snoozed_until": {"$lte": now}}],
        }).sort("deadline", 1)
    )
    formatted = [_format_reminder(d, today) for d in docs]
    return [r for r in formatted if r["status"] == target_status]

@reminders_bp.route("/reminders/upcoming", methods=["GET"])
@login_required
def list_upcoming():
    return jsonify({"data": _get_reminders_by_status("upcoming")}), 200

@reminders_bp.route("/reminders/expiring-soon", methods=["GET"])
@login_required
def list_expiring_soon():
    return jsonify({"data": _get_reminders_by_status("expiring_soon")}), 200

@reminders_bp.route("/reminders/expired", methods=["GET"])
@login_required
def list_expired():
    return jsonify({"data": _get_reminders_by_status("expired")}), 200

@reminders_bp.route("/reminders/<reminder_id>/snooze", methods=["PATCH"])
@login_required
def snooze_reminder(reminder_id):
    body = request.get_json(silent=True) or {}
    days = int(body.get("days", 7))
    snooze_until = datetime.now(timezone.utc) + timedelta(days=days)

    updated = db.reminders.find_one_and_update(
        {"_id": ObjectId(reminder_id), "user_id": g.current_user["_id"]},
        {"$set": {"snoozed_until": snooze_until}},
        return_document=True,
    )
    if not updated:
        abort(404, description="Reminder not found")

    return jsonify(_format_reminder(updated, datetime.now(timezone.utc).date())), 200