from flask import Blueprint, request, jsonify
from database import query
from utils.decorators import admin_required

admin_bp = Blueprint("admin", __name__)


@admin_bp.route("/stats", methods=["GET"])
@admin_required
def get_stats():
    profiles = (
        query("SELECT * FROM users ORDER BY created_at DESC", fetchall=True) or []
    )
    stations = query("SELECT id FROM stations", fetchall=True) or []
    results = query("SELECT id FROM results", fetchall=True) or []
    subs = query("SELECT * FROM subscriptions", fetchall=True) or []

    manager_clients = [p for p in profiles if p["role"] == "manager"]

    return jsonify(
        {
            "profiles": profiles,
            "stations_count": len(stations),
            "results_count": len(results),
            "subscriptions": subs,
            "stats": {
                "total_clients": len(manager_clients),
                "active_users": len(
                    [p for p in manager_clients if p.get("status") == "Active"]
                ),
                "inactive_users": len(
                    [p for p in manager_clients if p.get("status") != "Active"]
                ),
                "total_stations": len(stations),
                "total_results": len(results),
            },
        }
    )


@admin_bp.route("/clients", methods=["GET"])
@admin_required
def get_clients():
    managers = (
        query(
            "SELECT * FROM users WHERE role = 'manager' ORDER BY created_at DESC",
            fetchall=True,
        )
        or []
    )
    subs = query("SELECT * FROM subscriptions", fetchall=True) or []
    agents_list = (
        query("SELECT id, manager_id FROM users WHERE role = 'agent'", fetchall=True)
        or []
    )
    elections_list = query("SELECT id, manager_id FROM elections", fetchall=True) or []

    enriched = []
    for mgr in managers:
        sub = next((s for s in subs if s["manager_id"] == mgr["id"]), None)
        agents_count = len([a for a in agents_list if a["manager_id"] == mgr["id"]])
        elections_count = len(
            [e for e in elections_list if e["manager_id"] == mgr["id"]]
        )
        enriched.append(
            {
                **mgr,
                "subscription": sub,
                "agentsCount": agents_count,
                "electionsCount": elections_count,
            }
        )

    return jsonify({"data": enriched})


@admin_bp.route("/clients/<client_id>", methods=["PUT"])
@admin_required
def update_client(client_id):
    data = request.get_json()
    fields = []
    params = []
    for field in ["name", "role", "status", "station_id", "permissions"]:
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
    query("DELETE FROM users WHERE id = %s", (client_id,))
    return jsonify({"message": "Client deleted"})


@admin_bp.route("/clients/<client_id>/status", methods=["PUT"])
@admin_required
def toggle_client_status(client_id):
    data = request.get_json()
    query("UPDATE users SET status = %s WHERE id = %s", (data["status"], client_id))
    return jsonify({"message": "Status updated"})


@admin_bp.route("/all-profiles", methods=["GET"])
@admin_required
def get_all_profiles():
    profiles = (
        query("SELECT * FROM users ORDER BY created_at DESC", fetchall=True) or []
    )
    return jsonify({"data": profiles})


@admin_bp.route("/billing", methods=["GET"])
@admin_required
def get_billing():
    payments = (
        query(
            """SELECT ph.*, u.name as manager_name, u.email as manager_email
           FROM payment_history ph
           LEFT JOIN users u ON u.id = ph.manager_id
           ORDER BY ph.created_at DESC""",
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
    subs = query("SELECT * FROM subscriptions", fetchall=True) or []
    payments = (
        query("SELECT * FROM payment_history ORDER BY created_at DESC", fetchall=True)
        or []
    )
    managers = (
        query("SELECT id, name, email FROM users WHERE role = 'manager'", fetchall=True)
        or []
    )

    return jsonify(
        {
            "subscriptions": subs,
            "payments": payments,
            "managers": managers,
        }
    )


@admin_bp.route("/table/<table_name>", methods=["GET"])
@admin_required
def get_table_data(table_name):
    allowed = {
        "users",
        "stations",
        "results",
        "elections",
        "subscriptions",
        "payment_history",
    }
    if table_name not in allowed:
        return jsonify({"error": "Invalid table"}), 400
    data = (
        query(
            f"SELECT * FROM {table_name} ORDER BY created_at DESC LIMIT 100",
            fetchall=True,
        )
        or []
    )
    return jsonify({"data": data})


@admin_bp.route("/table-counts", methods=["GET"])
@admin_required
def get_table_counts():
    counts = {}
    for table in [
        "users",
        "stations",
        "results",
        "elections",
        "subscriptions",
        "payment_history",
    ]:
        row = query(f"SELECT COUNT(*) as count FROM {table}", fetchone=True)
        counts[table] = row["count"] if row else 0
    return jsonify({"counts": counts})


@admin_bp.route("/health", methods=["GET"])
@admin_required
def check_health():
    import time

    start = time.time()
    try:
        query("SELECT 1", fetchone=True)
        latency = int((time.time() - start) * 1000)
        return jsonify(
            {"status": "healthy", "latency": f"{latency}ms", "message": "Connected"}
        )
    except Exception as e:
        return jsonify({"status": "error", "latency": "0ms", "message": str(e)})
