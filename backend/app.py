from flask import Flask, send_from_directory
from flask_cors import CORS
from config import Config
import os

app = Flask(__name__)
app.config.from_object(Config)
CORS(app, supports_credentials=True)

from routes.auth_routes import auth_bp
from routes.api_routes import api_bp
from routes.admin_routes import admin_bp
from routes.daraja_routes import daraja_bp

app.register_blueprint(auth_bp, url_prefix="/api/auth")
app.register_blueprint(api_bp, url_prefix="/api")
app.register_blueprint(admin_bp, url_prefix="/api/admin")
app.register_blueprint(daraja_bp, url_prefix="/api/daraja")


@app.route("/uploads/<path:filename>")
def serve_upload(filename):
    return send_from_directory(Config.UPLOAD_FOLDER, filename)


if __name__ == "__main__":
    os.makedirs(Config.UPLOAD_FOLDER, exist_ok=True)
    app.run(debug=True)
