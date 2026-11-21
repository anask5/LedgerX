import os
from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS
from werkzeug.exceptions import HTTPException
from app.config import Config
from app.db import init_indexes
from app.routes.auth import auth_bp
from app.routes.folders import folders_bp
from app.routes.receipts import receipts_bp
from app.routes.reminders import reminders_bp
from app.routes.sharing import sharing_bp


def create_app():
    app = Flask(__name__)
    CORS(app)
    os.makedirs(Config.UPLOAD_FOLDER, exist_ok=True)
    init_indexes()

    @app.errorhandler(HTTPException)
    def handle_http_error(e):
        return jsonify({"detail": e.description}), e.code

    @app.route("/uploads/<path:filename>")
    def serve_upload(filename):
        return send_from_directory(Config.UPLOAD_FOLDER, filename)

    @app.route("/api/v1/health")
    def health():
        return jsonify({"status": "ok"})

    app.register_blueprint(auth_bp, url_prefix="/api/v1")
    app.register_blueprint(folders_bp, url_prefix="/api/v1")
    app.register_blueprint(receipts_bp, url_prefix="/api/v1")
    app.register_blueprint(reminders_bp, url_prefix="/api/v1")
    app.register_blueprint(sharing_bp, url_prefix="/api/v1")

    return app