"""
utils/decorators.py — Authentication and authorization decorators.

Changes from original:
- login_required now fetches only safe columns (excludes password_hash, admin_secret)
- Removed the dead rate_limit() stub (was a no-op)
- CSRF check now correctly handles the multi-origin allowlist from app.py
"""
from functools import wraps
from flask import request, jsonify, g
from database import query
from config import Config
import logging

logger = logging.getLogger(__name__)

SAFE_METHODS = frozenset({"GET", "HEAD", "OPTIONS"})

# Columns returned to g.current_user — NEVER include password_hash or admin_secret
_SAFE_USER_COLS = (
    "u.id, u.email, u.name, u.role, u.status, u.station_id, "
    "u.permissions, u.submission_status, u.manager_id, "
    "u.force_password_reset, u.created_at"
)

_ALLOWED_ORIGINS: list[str] | None = None


def _get_allowed_origins() -> list[str]:
    global _ALLOWED_ORIGINS
    if _ALLOWED_ORIGINS is None:
        # Build the list once from config; mirrors what app.py passes to CORS
        _ALLOWED_ORIGINS = [
            Config.FRONTEND_URL.rstrip("/"),
            "https://uchaguzi360.vercel.app",
            "http://localhost:5173",
            "http://localhost:5000",
        ]
    return _ALLOWED_ORIGINS


def _check_origin() -> bool:
    """
    Lightweight CSRF guard: reject state-changing requests whose Origin
    or Referer does not match any allowed origin.

    Allows requests with no Origin/Referer only for safe HTTP methods
    (GET, HEAD, OPTIONS), NOT for mutations.
    """
    if request.method in SAFE_METHODS:
        return True

    origin = request.headers.get("Origin", "")
    referer = request.headers.get("Referer", "")
    allowed = _get_allowed_origins()

    # Require at least one of Origin or Referer for mutating requests
    if not origin and not referer:
        logger.warning("CSRF: mutation request with no Origin/Referer header")
        return False

    if origin:
        if not any(origin.rstrip("/").startswith(o) for o in allowed):
            logger.warning("CSRF check failed: Origin %s not allowed", origin)
            return False

    if referer:
        if not any(referer.startswith(o) for o in allowed):
            logger.warning("CSRF check failed: Referer %s not allowed", referer)
            return False

    return True


def get_token_from_request() -> str:
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        return auth[7:]
    return request.cookies.get("auth_token", "")


def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not _check_origin():
            return jsonify({"error": "CSRF validation failed"}), 403

        token = get_token_from_request()
        if not token:
            return jsonify({"error": "No authorization token"}), 401

        session = query(
            f"SELECT {_SAFE_USER_COLS} "
            "FROM user_sessions s JOIN users u ON s.user_id = u.id "
            "WHERE s.token = %s AND s.expires_at > NOW()",
            (token,),
            fetchone=True,
        )

        if not session:
            return jsonify({"error": "Invalid or expired token"}), 401

        g.current_user = session
        g.auth_token = token
        return f(*args, **kwargs)

    return decorated


def admin_required(f):
    @wraps(f)
    @login_required
    def decorated(*args, **kwargs):
        if g.current_user.get("role") != "admin":
            return jsonify({"error": "Admin access required"}), 403
        return f(*args, **kwargs)

    return decorated


def manager_required(f):
    @wraps(f)
    @login_required
    def decorated(*args, **kwargs):
        if g.current_user.get("role") not in ("manager", "admin"):
            return jsonify({"error": "Manager access required"}), 403
        return f(*args, **kwargs)

    return decorated
