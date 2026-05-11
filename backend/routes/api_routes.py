import json
from flask import Blueprint, request, jsonify, g
from database import query
from utils.decorators import login_required, manager_required
from utils.helpers import generate_uuid

api_bp = Blueprint("api", __name__)

# ── PROFILE ──────────────────────────────────────────


@api_bp.route("/profile", methods=["GET"])
@login_required
def get_profile():
    profile = query(
        "SELECT id, email, name, role, status, station_id, permissions, submission_status, manager_id, force_password_reset, created_at FROM users WHERE id = %s",
        (g.current_user["id"],),
        fetchone=True,
    )
    return jsonify({"profile": profile})


# ── ELECTIONS ────────────────────────────────────────


@api_bp.route("/elections", methods=["GET"])
@login_required
def get_elections():
    manager_id = (
        request.args.get("manager_id")
        or g.current_user.get("manager_id")
        or g.current_user["id"]
    )
    if g.current_user["role"] == "agent":
        manager_id = g.current_user["manager_id"]
    elif g.current_user["role"] == "manager":
        manager_id = g.current_user["id"]
    elif g.current_user["role"] == "admin":
        elections = query(
            "SELECT * FROM elections ORDER BY created_at DESC", fetchall=True
        )
        return jsonify({"data": elections})

    elections = query(
        "SELECT * FROM elections WHERE manager_id = %s ORDER BY created_at DESC LIMIT 1",
        (manager_id,),
        fetchone=True,
    )
    return jsonify({"data": elections})


@api_bp.route("/elections", methods=["POST"])
@login_required
def save_election():
    data = request.get_json()
    details = data.get("details")
    manager_id = (
        g.current_user["id"]
        if g.current_user["role"] == "manager"
        else g.current_user.get("manager_id")
    )

    existing = query(
        "SELECT id FROM elections WHERE manager_id = %s LIMIT 1",
        (manager_id,),
        fetchone=True,
    )

    details_json = json.dumps(details) if not isinstance(details, str) else details
    if existing:
        query(
            "UPDATE elections SET details = %s WHERE id = %s",
            (details_json, existing["id"]),
        )
    else:
        query(
            "INSERT INTO elections (id, details, manager_id) VALUES (%s, %s, %s)",
            (generate_uuid(), details_json, manager_id),
        )

    return jsonify({"message": "Election saved"})


# ── STATIONS ─────────────────────────────────────────


@api_bp.route("/stations", methods=["GET"])
@login_required
def get_stations():
    manager_id = request.args.get("manager_id")
    if g.current_user["role"] == "agent":
        query_str = "SELECT * FROM stations WHERE id = %s ORDER BY name"
        stations = (
            query(query_str, (g.current_user.get("station_id"),), fetchall=True)
            if g.current_user.get("station_id")
            else []
        )
    elif g.current_user["role"] == "manager":
        mid = manager_id or g.current_user["id"]
        stations = query(
            "SELECT * FROM stations WHERE manager_id = %s ORDER BY name",
            (mid,),
            fetchall=True,
        )
    else:
        stations = query("SELECT * FROM stations ORDER BY name", fetchall=True)
    return jsonify({"data": stations or []})


@api_bp.route("/stations", methods=["POST"])
@login_required
def add_station():
    data = request.get_json()
    manager_id = (
        g.current_user["id"]
        if g.current_user["role"] == "manager"
        else g.current_user.get("manager_id")
    )
    station_id = generate_uuid()
    query(
        """INSERT INTO stations (id, name, county, constituency, ward, registered_voters, code, location, agent_id, manager_id)
           VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
        (
            station_id,
            data["name"],
            data.get("county"),
            data.get("constituency"),
            data.get("ward"),
            data.get("voters") or data.get("registered_voters", 0),
            data.get("code"),
            data.get("location"),
            data.get("agent_id"),
            manager_id,
        ),
    )
    station = query(
        "SELECT * FROM stations WHERE id = %s", (station_id,), fetchone=True
    )
    return jsonify({"data": station}), 201


@api_bp.route("/stations/<station_id>", methods=["DELETE"])
@login_required
def delete_station(station_id):
    query("DELETE FROM stations WHERE id = %s", (station_id,))
    return jsonify({"message": "Station deleted"})


# ── AGENTS ───────────────────────────────────────────


@api_bp.route("/agents", methods=["GET"])
@login_required
def get_agents():
    manager_id = request.args.get("manager_id")
    if g.current_user["role"] == "agent":
        agents = query(
            "SELECT * FROM users WHERE id = %s", (g.current_user["id"],), fetchall=True
        )
    elif g.current_user["role"] == "manager":
        mid = manager_id or g.current_user["id"]
        agents = query(
            "SELECT * FROM users WHERE role = 'agent' AND manager_id = %s ORDER BY name",
            (mid,),
            fetchall=True,
        )
    else:
        agents = query(
            "SELECT * FROM users WHERE role = 'agent' ORDER BY name", fetchall=True
        )
    return jsonify({"data": agents or []})


@api_bp.route("/agents", methods=["POST"])
@login_required
def add_agent():
    data = request.get_json()
    manager_id = (
        g.current_user["id"]
        if g.current_user["role"] == "manager"
        else g.current_user.get("manager_id")
    )
    from utils.helpers import hash_password
    import random
    import string

    temp_password = data.get("password") or (
        "".join(random.choices(string.ascii_letters + string.digits, k=10)) + "A1!"
    )
    agent_id = generate_uuid()
    hashed = hash_password(temp_password)

    query(
        """INSERT INTO users (id, email, password_hash, name, role, station_id, permissions, submission_status, status, manager_id)
           VALUES (%s, %s, %s, %s, 'agent', %s, %s, %s, %s, %s)""",
        (
            agent_id,
            data["email"],
            hashed,
            data.get("name", "Agent"),
            data.get("stationId"),
            data.get("permissions", "edit"),
            data.get("submissionStatus", "Pending"),
            data.get("status", "Active"),
            manager_id,
        ),
    )

    agent = query(
        "SELECT id, email, name, role, station_id, permissions, submission_status, status, manager_id, created_at FROM users WHERE id = %s",
        (agent_id,),
        fetchone=True,
    )

    return jsonify({"data": agent, "temp_password": temp_password}), 201


@api_bp.route("/agents/<agent_id>", methods=["PUT"])
@login_required
def update_agent(agent_id):
    data = request.get_json()
    fields = []
    params = []
    for field in [
        "name",
        "email",
        "status",
        "station_id",
        "permissions",
        "submission_status",
    ]:
        if field in data:
            fields.append(f"{field} = %s")
            params.append(data[field])
    if fields:
        params.append(agent_id)
        query(f"UPDATE users SET {', '.join(fields)} WHERE id = %s", params)
    agent = query(
        "SELECT id, email, name, role, station_id, permissions, submission_status, status, manager_id, created_at FROM users WHERE id = %s",
        (agent_id,),
        fetchone=True,
    )
    return jsonify({"data": agent})


@api_bp.route("/agents/<agent_id>", methods=["DELETE"])
@login_required
def delete_agent(agent_id):
    query("DELETE FROM users WHERE id = %s", (agent_id,))
    return jsonify({"message": "Agent deleted"})


# ── RESULTS ──────────────────────────────────────────


@api_bp.route("/results", methods=["GET"])
@login_required
def get_results():
    manager_id = request.args.get("manager_id")
    if g.current_user["role"] == "manager":
        mid = manager_id or g.current_user["id"]
        results = query(
            "SELECT * FROM results WHERE manager_id = %s ORDER BY timestamp DESC",
            (mid,),
            fetchall=True,
        )
    elif g.current_user["role"] == "agent":
        results = query(
            "SELECT * FROM results WHERE agent_id = %s ORDER BY timestamp DESC",
            (g.current_user["id"],),
            fetchall=True,
        )
    else:
        results = query("SELECT * FROM results ORDER BY timestamp DESC", fetchall=True)
    return jsonify({"data": results or []})


@api_bp.route("/results", methods=["POST"])
@login_required
def submit_result():
    data = request.get_json()
    manager_id = (
        g.current_user.get("manager_id")
        if g.current_user["role"] == "agent"
        else g.current_user["id"]
    )

    agent = query(
        "SELECT submission_status FROM users WHERE id = %s",
        (g.current_user["id"],),
        fetchone=True,
    )
    if agent and agent["submission_status"] in ("Submitted", "Locked"):
        return jsonify(
            {"error": "Results already submitted. Contact manager to unlock."}
        ), 403

    result_id = generate_uuid()
    try:
        query(
            """INSERT INTO results (id, station_id, agent_id, manager_id, station_name, agent_name, results_data, stats, proof_image)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)""",
            (
                result_id,
                data["station_id"],
                g.current_user["id"],
                manager_id,
                data.get("station_name"),
                data.get("agent_name"),
                json.dumps(data.get("results_data", {})),
                json.dumps(data.get("stats", {})),
                data.get("proof_image"),
            ),
        )
    except Exception as e:
        return jsonify({"error": str(e)}), 400

    query(
        "UPDATE users SET submission_status = 'Submitted' WHERE id = %s",
        (g.current_user["id"],),
    )

    result = query("SELECT * FROM results WHERE id = %s", (result_id,), fetchone=True)
    return jsonify({"data": result}), 201


# ── UPLOAD ───────────────────────────────────────────


@api_bp.route("/upload", methods=["POST"])
@login_required
def upload_file():
    import os
    from config import Config

    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400
    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "No file selected"}), 400

    upload_dir = os.path.join(Config.UPLOAD_FOLDER, g.current_user["id"])
    os.makedirs(upload_dir, exist_ok=True)
    filename = f"{int(__import__('time').time())}_{file.filename}"
    filepath = os.path.join(upload_dir, filename)
    file.save(filepath)

    return jsonify({"url": f"/uploads/{g.current_user['id']}/{filename}"})


# ── SUBSCRIPTIONS ────────────────────────────────────


@api_bp.route("/subscriptions", methods=["GET"])
@login_required
def get_subscription():
    sub = query(
        "SELECT * FROM subscriptions WHERE manager_id = %s",
        (
            g.current_user["id"]
            if g.current_user["role"] == "manager"
            else g.current_user.get("manager_id"),
        ),
        fetchone=True,
    )
    if not sub:
        sub_id = generate_uuid()
        query(
            """INSERT INTO subscriptions (id, manager_id, plan, status, trial_started_at, trial_expires_at)
               VALUES (%s, %s, 'free', 'trial', NOW(), NOW() + INTERVAL '14 days')""",
            (
                sub_id,
                g.current_user["id"]
                if g.current_user["role"] == "manager"
                else g.current_user.get("manager_id"),
            ),
        )
        sub = query(
            "SELECT * FROM subscriptions WHERE id = %s", (sub_id,), fetchone=True
        )
    return jsonify({"data": sub})


@api_bp.route("/subscriptions/upgrade", methods=["POST"])
@login_required
def upgrade_subscription():
    data = request.get_json()
    plan_id = data.get("plan")
    phone_number = data.get("phoneNumber")
    manager_id = (
        g.current_user["id"]
        if g.current_user["role"] == "manager"
        else g.current_user.get("manager_id")
    )

    if plan_id == "free":
        query(
            """UPDATE subscriptions SET plan = 'free', status = 'trial',
               trial_started_at = NOW(), trial_expires_at = NOW() + INTERVAL '14 days'
               WHERE manager_id = %s""",
            (manager_id,),
        )
        sub = query(
            "SELECT * FROM subscriptions WHERE manager_id = %s",
            (manager_id,),
            fetchone=True,
        )
        return jsonify({"data": sub})

    if not phone_number:
        return jsonify({"error": "Phone number required for payment"}), 400

    return jsonify({"message": "Initiate M-Pesa payment first"}), 400


@api_bp.route("/subscriptions/activate", methods=["POST"])
@login_required
def activate_subscription():
    data = request.get_json()
    manager_id = (
        g.current_user["id"]
        if g.current_user["role"] == "manager"
        else g.current_user.get("manager_id")
    )

    sub = query(
        "SELECT * FROM subscriptions WHERE manager_id = %s",
        (manager_id,),
        fetchone=True,
    )
    if not sub or not sub.get("payment_confirmed"):
        return jsonify({"error": "Payment not confirmed"}), 400

    query(
        """UPDATE subscriptions SET plan = pending_plan, status = 'active', activated_at = NOW(),
           expires_at = NOW() + INTERVAL '365 days', pending_payment = false, pending_plan = NULL,
           checkout_request_id = NULL, payment_phone = NULL, payment_confirmed = false
           WHERE id = %s""",
        (sub["id"],),
    )

    sub = query(
        "SELECT * FROM subscriptions WHERE id = %s", (sub["id"],), fetchone=True
    )
    return jsonify({"data": sub})


@api_bp.route("/payment-history", methods=["GET"])
@login_required
def get_payment_history():
    history = query(
        "SELECT * FROM payment_history WHERE manager_id = %s ORDER BY created_at DESC",
        (
            g.current_user["id"]
            if g.current_user["role"] == "manager"
            else g.current_user.get("manager_id"),
        ),
        fetchall=True,
    )
    return jsonify({"data": history or []})


# ── MANAGERS (for admin) ─────────────────────────────


@api_bp.route("/managers", methods=["GET"])
@login_required
def get_managers():
    managers = query(
        "SELECT id, email, name, role, status, created_at FROM users WHERE role = 'manager' ORDER BY name",
        fetchall=True,
    )
    return jsonify({"data": managers or []})
