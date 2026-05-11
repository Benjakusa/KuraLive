from functools import wraps
from flask import request, jsonify, g
from database import query


def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get("Authorization", "").replace("Bearer ", "")
        if not token:
            return jsonify({"error": "No authorization token"}), 401

        session = query(
            "SELECT u.* FROM user_sessions s JOIN users u ON s.user_id = u.id WHERE s.token = %s AND s.expires_at > NOW()",
            (token,),
            fetchone=True,
        )

        if not session:
            return jsonify({"error": "Invalid or expired token"}), 401

        g.current_user = session
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
