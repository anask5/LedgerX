import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    MONGO_URI = os.getenv("MONGO_URI")
    MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "receiptwise_db")
    JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret")
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
    BASE_URL = os.getenv("BASE_URL", "http://localhost:8000")
    UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")