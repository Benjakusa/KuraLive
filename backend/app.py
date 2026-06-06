import os
import sys
import logging
import json
from flask import Flask, jsonify, request
from flask_cors import CORS
from config import Config
from database import init_pool, close_pool, check_db_health
from flask_talisman import Talisman
from models import db
from extensions import cache, limiter

# ---------------------------------------------------------------------------
# Structured JSON logging — plays well with Datadog / CloudWatch / Loki
# ---------------------------------------------------------------------------
class _JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "time": self.formatTime(record),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        if record.exc_info:
            payload["exc_info"] = self.formatException(record.exc_info)
        return json.dumps(payload)


def _configure_logging():
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(_JsonFormatter())
    root = logging.getLogger()
    root.handlers.clear()
    root.addHandler(handler)
    root.setLevel(logging.DEBUG if Config.FLASK_DEBUG else logging.INFO)


_configure_logging()
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Flask app
# ---------------------------------------------------------------------------
app = Flask(__name__)
app.config.from_object(Config)
app.config["DEBUG"] = Config.FLASK_DEBUG

_uri = Config.DATABASE_URL.replace("postgres://", "postgresql://") if Config.DATABASE_URL else ""
app.config["SQLALCHEMY_DATABASE_URI"] = _uri
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db.init_app(app)

# ---------------------------------------------------------------------------
# Extensions — configured here, instantiated in extensions.py to avoid
# circular imports (api_routes.py previously imported `cache` from app.py)
# ---------------------------------------------------------------------------
_cache_config = {
    "CACHE_TYPE": "RedisCache" if Config.REDIS_URL else "SimpleCache",
    "CACHE_REDIS_URL": Config.REDIS_URL or None,
    "CACHE_DEFAULT_TIMEOUT": 60,
}
cache.init_app(app, config=_cache_config)

_limiter_config = {
    "storage_uri": Config.REDIS_URL or "memory://",
    "default_limits": ["5000 per hour"] if not Config.DISABLE_RATE_LIMIT else [],
    "enabled": not Config.DISABLE_RATE_LIMIT,
}
limiter.init_app(app)

# ---------------------------------------------------------------------------
# Security headers — Content-Security-Policy is defined explicitly
# ---------------------------------------------------------------------------
_CSP = {
    "default-src": "'self'",
    "script-src": ["'self'"],
    "style-src": ["'self'", "'unsafe-inline'"],  # narrow further when possible
    "img-src": ["'self'", "data:", "https:"],
    "font-src": ["'self'", "https://fonts.gstatic.com"],
    "connect-src": ["'self'"],
    "frame-ancestors": "'none'",
    "base-uri": "'self'",
    "form-action": "'self'",
}

talisman = Talisman(
    app,
    content_security_policy=_CSP,
    force_https=not Config.FLASK_DEBUG,
    strict_transport_security=True,
    strict_transport_security_max_age=31536000,
    referrer_policy="strict-origin-when-cross-origin",
    feature_policy={
        "geolocation": "'none'",
        "camera": "'none'",
        "microphone": "'none'",
    },
)

# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------
_allowed_origins = [
    Config.FRONTEND_URL,
    "https://uchaguzi360.vercel.app",
    "http://localhost:5173",
    "http://localhost:5000",
]

CORS(
    app,
    supports_credentials=True,
    origins=_allowed_origins,
)

# ---------------------------------------------------------------------------
# Lazy initialisation guard (thread-safe via _app_initialized flag)
# ---------------------------------------------------------------------------
_app_initialized = False


@app.before_request
def initialize():
    global _app_initialized
    if not _app_initialized:
        init_pool()
        Config.validate()
        _app_initialized = True
        logger.info("Application initialised")


@app.before_request
def log_request():
    if request.method != "OPTIONS":
        logger.debug("request", extra={"method": request.method, "path": request.path})


@app.after_request
def add_cache_controls(response):
    # Only apply no-store to API responses; static assets can be cached
    if request.path.startswith("/api") or request.path.startswith("/uploads"):
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
        response.headers["Pragma"] = "no-cache"
    return response


# ---------------------------------------------------------------------------
# Error handlers
# ---------------------------------------------------------------------------
@app.errorhandler(400)
def bad_request(e):
    return jsonify({"error": "Bad request"}), 400


@app.errorhandler(404)
def not_found(e):
    return jsonify({"error": "Not found"}), 404


@app.errorhandler(405)
def method_not_allowed(e):
    return jsonify({"error": "Method not allowed"}), 405


@app.errorhandler(413)
def too_large(e):
    return jsonify({"error": "Request entity too large"}), 413


@app.errorhandler(429)
def ratelimit_handler(e):
    return jsonify({"error": "Rate limit exceeded", "retry_after": str(e.description)}), 429


@app.errorhandler(500)
def internal_error(e):
    logger.exception("Internal server error")
    return jsonify({"error": "Internal server error"}), 500


# ---------------------------------------------------------------------------
# Core routes
# ---------------------------------------------------------------------------
@app.route("/")
def home():
    return jsonify({"status": "ok", "message": "Uchaguzi360 API is running", "version": "1.0.0"})


@app.route("/health")
def health():
    db_ok, db_error = check_db_health()
    redis_ok = _check_redis_health()
    overall_ok = db_ok and redis_ok
    status_code = 200 if overall_ok else 503
    return jsonify(
        {
            "status": "healthy" if overall_ok else "degraded",
            "database": "connected" if db_ok else f"error: {db_error}",
            "redis": "connected" if redis_ok else "unavailable",
            "version": "1.0.0",
        }
    ), status_code


def _check_redis_health() -> bool:
    if not Config.REDIS_URL:
        return True  # Redis optional; consider healthy when not configured
    try:
        import redis as _redis
        r = _redis.from_url(Config.REDIS_URL, socket_connect_timeout=2)
        r.ping()
        return True
    except Exception:
        return False


# ---------------------------------------------------------------------------
# Blueprint registration
# ---------------------------------------------------------------------------
from routes.auth_routes import auth_bp        # noqa: E402
from routes.api_routes import api_bp          # noqa: E402
from routes.admin_routes import admin_bp      # noqa: E402
from routes.daraja_routes import daraja_bp    # noqa: E402
from routes.sms_routes import sms_bp          # noqa: E402
from routes.social_routes import social_bp    # noqa: E402
from routes.contacts_routes import contacts_bp  # noqa: E402
from routes.poll_routes import poll_bp        # noqa: E402

app.register_blueprint(auth_bp, url_prefix="/api/auth")
app.register_blueprint(api_bp, url_prefix="/api")
app.register_blueprint(admin_bp, url_prefix="/api/admin")
app.register_blueprint(daraja_bp, url_prefix="/api/daraja")
app.register_blueprint(sms_bp, url_prefix="/api/sms")
app.register_blueprint(social_bp, url_prefix="/api/social")
app.register_blueprint(poll_bp, url_prefix="/api")
app.register_blueprint(contacts_bp, url_prefix="/api/contacts")

# ---------------------------------------------------------------------------
# Secure file serving
# ---------------------------------------------------------------------------
from utils.decorators import login_required   # noqa: E402
from flask import g                            # noqa: E402


@app.route("/uploads/<path:filename>")
@login_required
def serve_upload(filename):
    from flask import send_from_directory, redirect
    from utils.storage import generate_presigned_url

    safe_path = os.path.normpath(filename)
    if safe_path.startswith("..") or safe_path.startswith("/"):
        return jsonify({"error": "Invalid path"}), 400

    parts = safe_path.split(os.sep)
    owner_id = parts[0] if parts else None
    user_id = str(g.current_user["id"])
    role = g.current_user.get("role", "")

    if owner_id != user_id and role not in ("manager", "admin"):
        return jsonify({"error": "Forbidden"}), 403

    presigned = generate_presigned_url(safe_path)
    if presigned:
        return redirect(presigned)

    return send_from_directory(Config.UPLOAD_FOLDER, safe_path)


# ---------------------------------------------------------------------------
# Graceful shutdown
# ---------------------------------------------------------------------------
import atexit  # noqa: E402

atexit.register(close_pool)

if __name__ == "__main__":
    os.makedirs(Config.UPLOAD_FOLDER, exist_ok=True)
    init_pool()
    Config.validate()
    port = int(os.getenv("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=Config.FLASK_DEBUG)
