from flask import Flask, send_from_directory, jsonify, request
from flask_cors import CORS
from config import Config
import os

app = Flask(__name__)
app.config.from_object(Config)

CORS(
    app,
    supports_credentials=True,
    origins=[
        "https://uchaguzi360.vercel.app",
        "http://localhost:5173",
        "http://localhost:5000",
    ],
)


@app.before_request
def handle_preflight():
    if request.method == "OPTIONS":
        return jsonify({"ok": True}), 200


@app.after_request
def add_cors_headers(response):
    origin = request.headers.get("Origin")
    allowed = [
        "https://uchaguzi360.vercel.app",
        "http://localhost:5173",
        "http://localhost:5000",
    ]
    if origin in allowed:
        response.headers["Access-Control-Allow-Origin"] = origin
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    response.headers["Access-Control-Allow-Methods"] = (
        "GET, POST, PUT, DELETE, OPTIONS, PATCH"
    )
    response.headers["Access-Control-Allow-Credentials"] = "true"
    return response


@app.route("/")
def home():
    return jsonify(
        {"status": "ok", "message": "Uchaguzi360 API is running", "docs": "/api"}
    )


from routes.auth_routes import auth_bp
from routes.api_routes import api_bp
from routes.admin_routes import admin_bp
from routes.daraja_routes import daraja_bp
from routes.sms_routes import sms_bp
from routes.social_routes import social_bp
from routes.contacts_routes import contacts_bp
from routes.poll_routes import poll_bp

app.register_blueprint(auth_bp, url_prefix="/api/auth")
app.register_blueprint(api_bp, url_prefix="/api")
app.register_blueprint(admin_bp, url_prefix="/api/admin")
app.register_blueprint(daraja_bp, url_prefix="/api/daraja")
app.register_blueprint(sms_bp, url_prefix="/api/sms")
app.register_blueprint(social_bp, url_prefix="/api/social")
app.register_blueprint(poll_bp, url_prefix="/api")
app.register_blueprint(contacts_bp, url_prefix="/api/contacts")


@app.route("/uploads/<path:filename>")
def serve_upload(filename):
    return send_from_directory(Config.UPLOAD_FOLDER, filename)


if __name__ == "__main__":
    os.makedirs(Config.UPLOAD_FOLDER, exist_ok=True)
    app.run(debug=True)
