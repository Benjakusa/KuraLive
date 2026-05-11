from flask import Blueprint, request, jsonify, g
from database import query
from utils.helpers import hash_password, verify_password, generate_uuid, generate_token
from utils.decorators import login_required
from datetime import datetime, timedelta

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/signup", methods=["POST"])
def signup():
    data = request.get_json()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")
    name = data.get("name", email.split("@")[0])
    role = data.get("role", "agent")

    if not email or not password:
        return jsonify({"error": "Email and password required"}), 400

    existing = query("SELECT id FROM users WHERE email = %s", (email,), fetchone=True)
    if existing:
        return jsonify({"error": "Email already registered"}), 409

    user_id = generate_uuid()
    hashed = hash_password(password)

    query(
        "INSERT INTO users (id, email, password_hash, name, role) VALUES (%s, %s, %s, %s, %s)",
        (user_id, email, hashed, name, role),
    )

    token = generate_token()
    query(
        "INSERT INTO user_sessions (token, user_id, expires_at) VALUES (%s, %s, %s)",
        (token, user_id, datetime.utcnow() + timedelta(days=30)),
    )

    user = query(
        "SELECT id, email, name, role, status, created_at FROM users WHERE id = %s",
        (user_id,),
        fetchone=True,
    )
    return jsonify({"user": user, "token": token}), 201


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not email or not password:
        return jsonify({"error": "Email and password required"}), 400

    user = query("SELECT * FROM users WHERE email = %s", (email,), fetchone=True)
    if not user or not verify_password(password, user["password_hash"]):
        return jsonify({"error": "Invalid email or password"}), 401

    token = generate_token()
    query(
        "INSERT INTO user_sessions (token, user_id, expires_at) VALUES (%s, %s, %s)",
        (token, user["id"], datetime.utcnow() + timedelta(days=30)),
    )

    return jsonify(
        {
            "user": {k: v for k, v in user.items() if k != "password_hash"},
            "token": token,
        }
    )


@auth_bp.route("/me", methods=["GET"])
@login_required
def get_me():
    user = query(
        "SELECT id, email, name, role, status, station_id, permissions, submission_status, manager_id, force_password_reset, created_at FROM users WHERE id = %s",
        (g.current_user["id"],),
        fetchone=True,
    )
    return jsonify({"user": user})


@auth_bp.route("/logout", methods=["POST"])
@login_required
def logout():
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    query("DELETE FROM user_sessions WHERE token = %s", (token,))
    return jsonify({"message": "Logged out"})


@auth_bp.route("/forgot-password", methods=["POST"])
def forgot_password():
    data = request.get_json()
    email = data.get("email", "").strip().lower()
    if not email:
        return jsonify({"error": "Email required"}), 400

    user = query("SELECT id FROM users WHERE email = %s", (email,), fetchone=True)
    if not user:
        return jsonify({"error": "No account with that email"}), 404

    reset_token = generate_token()
    query(
        "INSERT INTO user_sessions (token, user_id, expires_at) VALUES (%s, %s, %s)",
        (reset_token, user["id"], datetime.utcnow() + timedelta(hours=1)),
    )

    return jsonify({"message": "Reset code sent", "reset_token": reset_token})


@auth_bp.route("/reset-with-token", methods=["POST"])
def reset_with_token():
    data = request.get_json()
    reset_token = data.get("reset_token", "")
    new_password = data.get("password", "")

    if not reset_token or not new_password:
        return jsonify({"error": "Reset token and password required"}), 400

    if len(new_password) < 8:
        return jsonify({"error": "Password must be at least 8 characters"}), 400

    session = query(
        "SELECT u.id FROM user_sessions s JOIN users u ON s.user_id = u.id WHERE s.token = %s AND s.expires_at > NOW()",
        (reset_token,),
        fetchone=True,
    )
    if not session:
        return jsonify({"error": "Invalid or expired reset token"}), 401

    hashed = hash_password(new_password)
    query(
        "UPDATE users SET password_hash = %s, force_password_reset = false WHERE id = %s",
        (hashed, session["id"]),
    )
    query("DELETE FROM user_sessions WHERE token = %s", (reset_token,))

    return jsonify({"message": "Password reset successfully"})


@auth_bp.route("/reset-password", methods=["POST"])
@login_required
def reset_password():
    data = request.get_json()
    new_password = data.get("password", "")

    if len(new_password) < 8:
        return jsonify({"error": "Password must be at least 8 characters"}), 400

    hashed = hash_password(new_password)
    query(
        "UPDATE users SET password_hash = %s, force_password_reset = false WHERE id = %s",
        (hashed, g.current_user["id"]),
    )

    return jsonify({"message": "Password updated successfully"})
