from flask import Blueprint, request, jsonify, g, make_response
from database import query
from utils.helpers import hash_password, verify_password, generate_uuid, generate_secure_token
from utils.decorators import login_required
from extensions import limiter
from services.email_service import send_password_reset
from config import Config
from datetime import datetime, timezone, timedelta
import re
import logging

logger = logging.getLogger(__name__)

auth_bp = Blueprint("auth", __name__)

EMAIL_RE = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")
PASSWORD_MIN_LENGTH = 8

# Roles that can be acquired through public self-registration
# admin accounts must be seeded directly in the database
_SELF_REGISTER_ROLES = frozenset({"agent", "manager"})


def _set_auth_cookie(response, token, max_age_days=30):
    max_age = max_age_days * 24 * 60 * 60
    response.set_cookie(
        "auth_token",
        token,
        max_age=max_age,
        httponly=True,
        secure=not Config.FLASK_DEBUG,
        samesite="Lax",
        path="/",
    )


def _clear_auth_cookie(response):
    response.set_cookie(
        "auth_token",
        "",
        max_age=0,
        httponly=True,
        secure=not Config.FLASK_DEBUG,
        samesite="Lax",
        path="/",
    )


def _validate_password(password: str) -> str | None:
    if len(password) < PASSWORD_MIN_LENGTH:
        return "Password must be at least 8 characters"
    if not re.search(r"[A-Z]", password):
        return "Password must contain an uppercase letter"
    if not re.search(r"[a-z]", password):
        return "Password must contain a lowercase letter"
    if not re.search(r"[0-9]", password):
        return "Password must contain a number"
    if not re.search(r'[!@#$%^&*(),.?":{}|<>_\-]', password):
        return "Password must contain a special character"
    return None


def _validate_email(email: str) -> str | None:
    if not EMAIL_RE.match(email):
        return "Invalid email format"
    return None


def _utcnow() -> datetime:
    """Always return a timezone-aware UTC datetime."""
    return datetime.now(timezone.utc)


@auth_bp.route("/signup", methods=["POST"])
@limiter.limit("5/minute")
def signup():
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body required"}), 400

    email = (data.get("email") or "").strip().lower()
    password = data.get("password", "")
    name = (data.get("name") or email.split("@")[0])[:100]  # cap at DB column length
    role = data.get("role", "agent")

    # SECURITY: admin role cannot be self-assigned via API
    if role not in _SELF_REGISTER_ROLES:
        return jsonify({"error": "Invalid role"}), 400

    email_error = _validate_email(email)
    if email_error:
        return jsonify({"error": email_error}), 400

    pw_error = _validate_password(password)
    if pw_error:
        return jsonify({"error": pw_error}), 400

    existing = query("SELECT id FROM users WHERE email = %s", (email,), fetchone=True)
    if existing:
        return jsonify({"error": "Email already registered"}), 409

    user_id = generate_uuid()
    hashed = hash_password(password)

    user = query(
        """INSERT INTO users (id, email, password_hash, name, role)
           VALUES (%s, %s, %s, %s, %s)
           RETURNING id, email, name, role, status, created_at""",
        (user_id, email, hashed, name, role),
        fetchone=True,
    )

    token = generate_secure_token()
    query(
        "INSERT INTO user_sessions (token, user_id, expires_at) VALUES (%s, %s, %s)",
        (token, user_id, _utcnow() + timedelta(days=30)),
    )

    resp = make_response(jsonify({"user": user, "token": token}), 201)
    _set_auth_cookie(resp, token)
    return resp


@auth_bp.route("/login", methods=["POST"])
@limiter.limit("10/minute")
def login():
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body required"}), 400

    email = (data.get("email") or "").strip().lower()
    password = data.get("password", "")
    admin_secret = data.get("admin_secret", "")

    if not email or not password:
        return jsonify({"error": "Email and password required"}), 400

    # SELECT only what we need — password_hash is used locally then discarded
    user = query(
        "SELECT id, email, name, role, status, station_id, permissions, "
        "submission_status, manager_id, force_password_reset, created_at, "
        "password_hash, admin_secret "
        "FROM users WHERE email = %s",
        (email,),
        fetchone=True,
    )
    if not user or not verify_password(password, user["password_hash"]):
        return jsonify({"error": "Invalid email or password"}), 401

    if user["status"] not in ("Active",):
        return jsonify({"error": "Account suspended. Contact your administrator."}), 403

    if user["role"] == "admin":
        stored_secret = user.get("admin_secret") or ""
        if not stored_secret or admin_secret != stored_secret:
            return jsonify({"error": "Invalid admin credentials"}), 403

    # Invalidate existing sessions (single-session policy per login)
    query("DELETE FROM user_sessions WHERE user_id = %s", (user["id"],))

    token = generate_secure_token()
    query(
        "INSERT INTO user_sessions (token, user_id, expires_at) VALUES (%s, %s, %s)",
        (token, user["id"], _utcnow() + timedelta(days=30)),
    )

    # Strip sensitive fields before returning to client
    safe_fields = (
        "id", "email", "name", "role", "status", "station_id",
        "permissions", "submission_status", "manager_id",
        "force_password_reset", "created_at",
    )
    user_data = {k: user[k] for k in safe_fields if k in user}

    resp = make_response(jsonify({"user": user_data, "token": token}))
    _set_auth_cookie(resp, token)
    return resp


@auth_bp.route("/me", methods=["GET"])
@login_required
def get_me():
    user = query(
        "SELECT id, email, name, role, status, station_id, permissions, "
        "submission_status, manager_id, force_password_reset, created_at "
        "FROM users WHERE id = %s",
        (g.current_user["id"],),
        fetchone=True,
    )
    return jsonify({"user": user})


@auth_bp.route("/logout", methods=["POST"])
@login_required
def logout():
    token = g.get("auth_token") or request.headers.get("Authorization", "").replace("Bearer ", "")
    query("DELETE FROM user_sessions WHERE token = %s", (token,))
    resp = make_response(jsonify({"message": "Logged out"}))
    _clear_auth_cookie(resp)
    return resp


@auth_bp.route("/logout-all", methods=["POST"])
@login_required
def logout_all():
    query("DELETE FROM user_sessions WHERE user_id = %s", (g.current_user["id"],))
    resp = make_response(jsonify({"message": "Logged out of all sessions"}))
    _clear_auth_cookie(resp)
    return resp


@auth_bp.route("/forgot-password", methods=["POST"])
@limiter.limit("3/minute")
def forgot_password():
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body required"}), 400

    email = (data.get("email") or "").strip().lower()
    if not email:
        return jsonify({"error": "Email required"}), 400

    # Always return 200 to prevent email enumeration
    user = query("SELECT id, email, name FROM users WHERE email = %s", (email,), fetchone=True)
    if user:
        reset_token = generate_secure_token()
        query(
            "INSERT INTO password_reset_tokens (token, user_id, expires_at) VALUES (%s, %s, %s)",
            (reset_token, user["id"], _utcnow() + timedelta(hours=1)),
        )
        reset_link = f"{Config.FRONTEND_URL}/reset-password?token={reset_token}"
        send_password_reset(user["email"], user.get("name", "there"), reset_link)

    return jsonify({"message": "If the email exists, a reset link has been sent"}), 200


@auth_bp.route("/reset-password", methods=["POST"])
@limiter.limit("5/minute")
def reset_with_token():
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body required"}), 400

    reset_token = data.get("token", "")
    new_password = data.get("password", "")

    if not reset_token or not new_password:
        return jsonify({"error": "Token and password required"}), 400

    pw_error = _validate_password(new_password)
    if pw_error:
        return jsonify({"error": pw_error}), 400

    token_row = query(
        "SELECT user_id FROM password_reset_tokens WHERE token = %s AND expires_at > NOW()",
        (reset_token,),
        fetchone=True,
    )
    if not token_row:
        return jsonify({"error": "Invalid or expired reset token"}), 401

    hashed = hash_password(new_password)
    query(
        "UPDATE users SET password_hash = %s, force_password_reset = false WHERE id = %s",
        (hashed, token_row["user_id"]),
    )
    query("DELETE FROM password_reset_tokens WHERE token = %s", (reset_token,))
    query("DELETE FROM user_sessions WHERE user_id = %s", (token_row["user_id"],))

    return jsonify({"message": "Password reset successfully"})


@auth_bp.route("/change-password", methods=["POST"])
@login_required
def change_password():
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body required"}), 400

    new_password = data.get("new_password", "")
    if not new_password:
        return jsonify({"error": "New password is required"}), 400

    user = query(
        "SELECT password_hash, force_password_reset FROM users WHERE id = %s",
        (g.current_user["id"],),
        fetchone=True,
    )
    if not user:
        return jsonify({"error": "User not found"}), 404

    if not user.get("force_password_reset"):
        current_password = data.get("current_password", "")
        if not current_password:
            return jsonify({"error": "Current password is required"}), 400
        if not verify_password(current_password, user["password_hash"]):
            return jsonify({"error": "Current password is incorrect"}), 403

    pw_error = _validate_password(new_password)
    if pw_error:
        return jsonify({"error": pw_error}), 400

    hashed = hash_password(new_password)
    query(
        "UPDATE users SET password_hash = %s, force_password_reset = false WHERE id = %s",
        (hashed, g.current_user["id"]),
    )
    # Invalidate all other sessions, keep the current one
    query(
        "DELETE FROM user_sessions WHERE user_id = %s AND token != %s",
        (g.current_user["id"], g.get("auth_token", "")),
    )

    return jsonify({"message": "Password updated successfully"})
