from flask import Blueprint, request, jsonify
from database import query, transaction
from utils.decorators import admin_required
from config import Config
import logging

logger = logging.getLogger(__name__)

admin_bp = Blueprint("admin", __name__)

ALLOWED_TABLES = frozenset(
    {
        "users",
        "stations",
        "results",
        "elections",
        "subscriptions",
        "payment_history",
    }
)

SAFE_USER_COLS = "id, email, name, role, status, station_id, permissions, submission_status, manager_id, force_password_reset, created_at"

SAFE_TABLE_COLS = {
    "users": SAFE_USER_COLS,
    "stations": "id, name, county, constituency, ward, code, registered_voters, location, agent_id, manager_id, created_at",
    "results": "id, station_id, agent_id, manager_id, station_name, agent_name, timestamp, created_at", # omitted JSONB for safe summary
    "elections": "id, manager_id, created_at", # omitted details
    "subscriptions": "id, manager_id, plan, status, trial_started_at, trial_expires_at, activated_at, expires_at, pending_payment, pending_plan, payment_phone, payment_confirmed, created_at, updated_at",
    "payment_history": "id, manager_id, amount, plan, payment_method, phone, status, created_at"
}


def _get_pagination_params():
    try:
        limit = int(request.args.get("limit", Config.DEFAULT_PAGE_SIZE))
    except ValueError:
        limit = Config.DEFAULT_PAGE_SIZE
    try:
        offset = int(request.args.get("offset", 0))
    except ValueError:
        offset = 0
    limit = max(1, min(limit, Config.MAX_PAGE_SIZE))
    offset = max(0, offset)
    return limit, offset


@admin_bp.route("/stats", methods=["GET"])
@admin_required
def get_stats():
    # PERF FIX: Replaced full table Python-level aggregation with COUNT() SQL queries
    user_stats = query(
        """SELECT
             COUNT(*) FILTER (WHERE role='manager') as total_clients,
             COUNT(*) FILTER (WHERE role='manager' AND status='Active') as active_users,
             COUNT(*) FILTER (WHERE role='manager' AND status!='Active') as inactive_users
           FROM users""",
        fetchone=True,
    )
    stations_count_row = query("SELECT COUNT(*) as count FROM stations", fetchone=True)
    results_count_row = query("SELECT COUNT(*) as count FROM results", fetchone=True)
    subs_count_row = query("SELECT COUNT(*) as count FROM subscriptions", fetchone=True)

    # For preview panels, get 10 most recent of each (instead of all)
    recent_profiles = query(f"SELECT {SAFE_USER_COLS} FROM users ORDER BY created_at DESC LIMIT 10", fetchall=True)
    recent_subs = query(f"SELECT {SAFE_TABLE_COLS['subscriptions']} FROM subscriptions ORDER BY created_at DESC LIMIT 10", fetchall=True)

    return jsonify(
        {
            "profiles": recent_profiles or [],
            "stations_count": stations_count_row["count"] if stations_count_row else 0,
            "results_count": results_count_row["count"] if results_count_row else 0,
            "subscriptions": recent_subs or [],
            "stats": {
                "total_clients": user_stats["total_clients"] if user_stats else 0,
                "active_users": user_stats["active_users"] if user_stats else 0,
                "inactive_users": user_stats["inactive_users"] if user_stats else 0,
                "total_stations": stations_count_row["count"] if stations_count_row else 0,
                "total_results": results_count_row["count"] if results_count_row else 0,
                "total_subscriptions": subs_count_row["count"] if subs_count_row else 0,
            },
        }
    )


@admin_bp.route("/clients", methods=["GET"])
@admin_required
def get_clients():
    limit, offset = _get_pagination_params()

    managers = (
        query(
            f"SELECT {SAFE_USER_COLS} FROM users WHERE role = 'manager' ORDER BY created_at DESC LIMIT %s OFFSET %s",
            (limit, offset),
            fetchall=True,
        )
        or []
    )

    if not managers:
        return jsonify({"data": []})

    manager_ids = [m["id"] for m in managers]

    subs = (
        query(
            "SELECT * FROM subscriptions WHERE manager_id = ANY(%s)",
            (manager_ids,),
            fetchall=True,
        )
        or []
    )
    subs_by_mgr = {s["manager_id"]: s for s in subs}

    agents_count = (
        query(
            "SELECT manager_id, COUNT(*) as count FROM users WHERE role = 'agent' AND manager_id = ANY(%s) GROUP BY manager_id",
            (manager_ids,),
            fetchall=True,
        )
        or []
    )
    agents_by_mgr = {a["manager_id"]: a["count"] for a in agents_count}

    elections_count = (
        query(
            "SELECT manager_id, COUNT(*) as count FROM elections WHERE manager_id = ANY(%s) GROUP BY manager_id",
            (manager_ids,),
            fetchall=True,
        )
        or []
    )
    elections_by_mgr = {e["manager_id"]: e["count"] for e in elections_count}

    enriched = []
    for mgr in managers:
        enriched.append(
            {
                **mgr,
                "subscription": subs_by_mgr.get(mgr["id"]),
                "agentsCount": agents_by_mgr.get(mgr["id"], 0),
                "electionsCount": elections_by_mgr.get(mgr["id"], 0),
            }
        )

    return jsonify({"data": enriched})


@admin_bp.route("/clients/<client_id>", methods=["PUT"])
@admin_required
def update_client(client_id):
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body required"}), 400

    allowed_fields = frozenset({"name", "role", "status", "station_id", "permissions"})
    fields = []
    params = []
    for field in allowed_fields:
        if field in data:
            fields.append(f"{field} = %s")
            params.append(data[field])
    if fields:
        params.append(client_id)
        query(f"UPDATE users SET {', '.join(fields)} WHERE id = %s", params)
    return jsonify({"message": "Client updated"})


@admin_bp.route("/clients/<client_id>", methods=["DELETE"])
@admin_required
def delete_client(client_id):
    with transaction():
        query("DELETE FROM subscriptions WHERE manager_id = %s", (client_id,))
        query("DELETE FROM results WHERE manager_id = %s", (client_id,))
        query("DELETE FROM stations WHERE manager_id = %s", (client_id,))
        query("DELETE FROM elections WHERE manager_id = %s", (client_id,))
        query("UPDATE users SET manager_id = NULL WHERE manager_id = %s", (client_id,))
        query("DELETE FROM users WHERE id = %s", (client_id,))
    return jsonify({"message": "Client and all related data deleted"})


@admin_bp.route("/clients/<client_id>/status", methods=["PUT"])
@admin_required
def toggle_client_status(client_id):
    data = request.get_json()
    if not data or "status" not in data:
        return jsonify({"error": "Status is required"}), 400
    if data["status"] not in ("Active", "Inactive", "Suspended"):
        return jsonify({"error": "Invalid status value"}), 400
    query("UPDATE users SET status = %s WHERE id = %s", (data["status"], client_id))
    return jsonify({"message": "Status updated"})


@admin_bp.route("/all-profiles", methods=["GET"])
@admin_required
def get_all_profiles():
    limit, offset = _get_pagination_params()
    profiles = (
        query(
            f"SELECT {SAFE_USER_COLS} FROM users ORDER BY created_at DESC LIMIT %s OFFSET %s",
            (limit, offset),
            fetchall=True,
        )
        or []
    )
    return jsonify({"data": profiles})


@admin_bp.route("/billing", methods=["GET"])
@admin_required
def get_billing():
    limit, offset = _get_pagination_params()
    payments = (
        query(
            """SELECT ph.*, u.name as manager_name, u.email as manager_email
           FROM payment_history ph
           LEFT JOIN users u ON u.id = ph.manager_id
           ORDER BY ph.created_at DESC LIMIT %s OFFSET %s""",
            (limit, offset),
            fetchall=True,
        )
        or []
    )
    return jsonify({"data": payments})


@admin_bp.route("/billing/<payment_id>/mark-paid", methods=["POST"])
@admin_required
def mark_paid(payment_id):
    query("UPDATE payment_history SET status = 'Paid' WHERE id = %s", (payment_id,))
    return jsonify({"message": "Marked as paid"})


@admin_bp.route("/analytics", methods=["GET"])
@admin_required
def get_analytics():
    # Return aggregated counts, not full table loads
    subs_stats = query(
        """SELECT plan, COUNT(*) as count FROM subscriptions GROUP BY plan""",
        fetchall=True,
    )
    payments_stats = query(
        """SELECT status, SUM(amount) as total_amount FROM payment_history GROUP BY status""",
        fetchall=True,
    )
    
    return jsonify(
        {
            "subscriptions_summary": subs_stats or [],
            "payments_summary": payments_stats or [],
        }
    )


@admin_bp.route("/table/<table_name>", methods=["GET"])
@admin_required
def get_table_data(table_name):
    if table_name not in ALLOWED_TABLES:
        return jsonify({"error": "Invalid table"}), 400

    limit = 100
    try:
        page = int(request.args.get("page", 1))
        per_page = int(request.args.get("per_page", limit))
    except ValueError:
        page = 1
        per_page = limit
        
    per_page = max(1, min(per_page, Config.MAX_PAGE_SIZE))
    page = max(1, page)
    offset = (page - 1) * per_page
    
    # SECURITY: Using specific safe columns for every table, not just fallback to "*"
    cols = SAFE_TABLE_COLS.get(table_name, "id, created_at")

    data = (
        query(
            f"SELECT {cols} FROM {table_name} ORDER BY created_at DESC NULLS LAST LIMIT %s OFFSET %s",
            (per_page, offset),
            fetchall=True,
        )
        or []
    )
    return jsonify({"data": data, "page": page, "per_page": per_page})


@admin_bp.route("/table-counts", methods=["GET"])
@admin_required
def get_table_counts():
    counts = {}
    for table in ALLOWED_TABLES:
        row = query(f"SELECT COUNT(*) as count FROM {table}", fetchone=True)
        counts[table] = row["count"] if row else 0
    return jsonify({"counts": counts})
