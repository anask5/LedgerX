from pymongo import MongoClient, ASCENDING, DESCENDING
from app.config import Config

client = MongoClient(Config.MONGO_URI)
db = client[Config.MONGO_DB_NAME]

def init_indexes():
    db.users.create_index([("email", ASCENDING)], unique=True)
    db.share_links.create_index([("token", ASCENDING)], unique=True)
    db.receipts.create_index([("user_id", ASCENDING), ("purchase_date", DESCENDING)])
    db.receipts.create_index([("user_id", ASCENDING), ("folder_id", ASCENDING)])
    db.receipts.create_index([("user_id", ASCENDING), ("tags", ASCENDING)])
    db.receipts.create_index([("user_id", ASCENDING), ("image_hash", ASCENDING)])
    db.receipts.create_index([("items.id", ASCENDING)])
    db.reminders.create_index([("user_id", ASCENDING), ("deadline", ASCENDING)])