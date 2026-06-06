import json
import os
import traceback
from flask import Blueprint, request, jsonify, g
from database import query, transaction, query_in_transaction
from utils.decorators import login_required, manager_required
from utils.helpers import generate_uuid, sanitize_filename, hash_password
from extensions import cache
from config import Config
from src.infrastructure.repositories.postgres_election_repo import PostgresElectionRepository
from src.infrastructure.repositories.postgres_station_repo import PostgresStationRepository
from src.infrastructure.repositories.postgres_agent_repo import PostgresAgentRepository
from src.domain.services.station_service import StationService
from src.domain.services.agent_service import AgentService

api_bp = Blueprint("api", __name__)
election_repo = PostgresElectionRepository()
station_service = StationService(PostgresStationRepository())
agent_service = AgentService(PostgresAgentRepository())


def _get_manager_id():
    """Helper to resolve the manager ID for the current user."""
    return (
        g.current_user["id"]
        if g.current_user["role"] == "manager"
        else g.current_user.get("manager_id")
    )


def _user_cache_key():
    """Generates a cache key that strictly isolates data by user_id and query string."""
    return f"{request.path}?{request.query_string.decode()}&uid={g.current_user['id']}"


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


@api_bp.route("/profile", methods=["GET"])
@login_required
def get_profile():
    profile = query(
        "SELECT id, email, name, role, status, station_id, permissions, submission_status, manager_id, force_password_reset, created_at FROM users WHERE id = %s",
        (g.current_user["id"],),
        fetchone=True,
    )
    return jsonify({"profile": profile})


@api_bp.route("/elections", methods=["GET"])
@login_required
def get_elections():
    limit, offset = _get_pagination_params()
    manager_id = _get_manager_id()

    # Hexagonal Architecture pattern enforcement
    rows, total = election_repo.get_by_manager(manager_id, limit, offset)

    return jsonify({
        "data": rows or [],
        "pagination": {"total": total, "limit": limit, "offset": offset, "has_next": offset + limit < total}
    })


@api_bp.route("/elections", methods=["POST"])
@login_required
def save_election():
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body required"}), 400
    
    details = data.get("details")
    manager_id = _get_manager_id()

    # Hexagonal Architecture pattern enforcement
    election_repo.save(manager_id, details)
    
    return jsonify({"message": "Election saved"})


@api_bp.route("/stations", methods=["GET"])
@login_required
def get_stations():
    limit, offset = _get_pagination_params()
    role = g.current_user["role"]
    rows, total = station_service.list_stations(
        role=role,
        user_id=g.current_user["id"],
        station_id=g.current_user.get("station_id"),
        limit=limit,
        offset=offset,
        requested_manager_id=request.args.get("manager_id"),
    )
    return jsonify({
        "data": rows,
        "pagination": {"total": total, "limit": limit, "offset": offset, "has_next": offset + limit < total}
    })


@api_bp.route("/stations", methods=["POST"])
@login_required
def add_station():
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body required"}), 400
    if not data.get("name"):
        return jsonify({"error": "Station name is required"}), 400
    station = station_service.create_station(data, manager_id=_get_manager_id())
    return jsonify({"data": station}), 201


@api_bp.route("/stations/<station_id>", methods=["DELETE"])
@login_required
def delete_station(station_id):
    deleted = station_service.delete_station(station_id, manager_id=g.current_user["id"])
    if not deleted:
        return jsonify({"error": "Station not found or unauthorized"}), 404
    return jsonify({"message": "Station deleted"})


@api_bp.route("/agents", methods=["GET"])
@login_required
def get_agents():
    limit, offset = _get_pagination_params()
    rows, total = agent_service.list_agents(
        role=g.current_user["role"],
        user_id=g.current_user["id"],
        limit=limit,
        offset=offset,
    )
    return jsonify({
        "data": rows,
        "pagination": {"total": total, "limit": limit, "offset": offset, "has_next": offset + limit < total}
    })


@api_bp.route("/agents", methods=["POST"])
@login_required
def add_agent():
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body required"}), 400
    if not data.get("email"):
        return jsonify({"error": "Agent email is required"}), 400

    agent = agent_service.create_agent(data, manager_id=_get_manager_id())

    from services.email_service import send_agent_welcome
    send_agent_welcome(data["email"], data.get("name", "Agent"), f"{Config.FRONTEND_URL}/login")

    return jsonify({"data": agent}), 201


@api_bp.route("/agents/<agent_id>", methods=["PUT"])
@login_required
def update_agent(agent_id):
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body required"}), 400
    agent = agent_service.update_agent(agent_id, manager_id=g.current_user["id"], data=data)
    if not agent:
        return jsonify({"error": "Agent not found, unauthorized, or no valid fields supplied"}), 404
    return jsonify({"data": agent})


@api_bp.route("/agents/<agent_id>", methods=["DELETE"])
@login_required
def delete_agent(agent_id):
    deleted = agent_service.delete_agent(agent_id, manager_id=g.current_user["id"])
    if not deleted:
        return jsonify({"error": "Agent not found or unauthorized"}), 404
    return jsonify({"message": "Agent deleted"})


@api_bp.route("/results", methods=["GET"])
@login_required
def get_results():
    limit, offset = _get_pagination_params()
    role = g.current_user["role"]

    if role == "manager":
        mid = request.args.get("manager_id") or g.current_user["id"]
        rows = query(
            "SELECT * FROM results WHERE manager_id = %s ORDER BY timestamp DESC LIMIT %s OFFSET %s",
            (mid, limit, offset),
            fetchall=True,
        )
        total_row = query("SELECT COUNT(*) as count FROM results WHERE manager_id = %s", (mid,), fetchone=True)
    elif role == "agent":
        rows = query(
            "SELECT * FROM results WHERE agent_id = %s ORDER BY timestamp DESC LIMIT %s OFFSET %s",
            (g.current_user["id"], limit, offset),
            fetchall=True,
        )
        total_row = query("SELECT COUNT(*) as count FROM results WHERE agent_id = %s", (g.current_user["id"],), fetchone=True)
    else:
        return jsonify({"data": [], "pagination": {"total": 0, "limit": limit, "offset": offset, "has_next": False}})

    total = total_row["count"] if total_row else 0

    return jsonify({
        "data": rows or [],
        "pagination": {"total": total, "limit": limit, "offset": offset, "has_next": offset + limit < total}
    })


@api_bp.route("/results", methods=["POST"])
@login_required
def submit_result():
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body required"}), 400
    if not data.get("station_id"):
        return jsonify({"error": "Station ID is required"}), 400

    manager_id = _get_manager_id()
    result_id = generate_uuid()

    # FIX: Lock exception handling. We catch errors and set a response,
    # but strictly return AFTER leaving the `with` block so `transaction` closes cleanly.
    error_response = None
    
    with transaction() as conn:
        agent = query_in_transaction(
            conn,
            "SELECT submission_status FROM users WHERE id = %s FOR UPDATE",
            (g.current_user["id"],),
            fetchone=True,
        )
        
        if agent and agent["submission_status"] in ("Submitted", "Locked"):
            error_response = ({"error": "Results already submitted. Contact manager to unlock."}, 403)
        else:
            try:
                query_in_transaction(
                    conn,
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
                query_in_transaction(
                    conn,
                    "UPDATE users SET submission_status = 'Submitted' WHERE id = %s",
                    (g.current_user["id"],),
                )
            except Exception as e:
                # E.g. foreign key violation, valid data checks
                error_response = ({"error": "Failed to submit result"}, 400)

    # Wait until OUTSIDE the context manager to return, ensuring connection and lock are released
    if error_response:
        return jsonify(error_response[0]), error_response[1]

    result = query("SELECT * FROM results WHERE id = %s", (result_id,), fetchone=True)
    return jsonify({"data": result}), 201


@api_bp.route("/upload", methods=["POST"])
@login_required
def upload_file():
    ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".pdf"}
    import mimetypes
    from config import Config
    from utils.storage import upload_to_s3

    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400
    file = request.files["file"]
    if not file.filename:
        return jsonify({"error": "No file selected"}), 400

    _, ext = os.path.splitext(file.filename.lower())
    if ext not in ALLOWED_EXTENSIONS:
        return jsonify(
            {"error": f"File type {ext} not allowed. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"}
        ), 400
        
    # SECURITY: Verify the MIME type matches the extension to prevent simple rename bypasses
    mime_type, _ = mimetypes.guess_type(file.filename)
    if not mime_type or not file.content_type.startswith(mime_type.split('/')[0]):
        return jsonify({"error": "Invalid file content type"}), 400

    # SECURITY: Verify Magic Bytes
    MAGIC_SIGNATURES = {
        b'\xFF\xD8\xFF': 'image/jpeg',
        b'\x89\x50\x4E\x47\x0D\x0A\x1A\x0A': 'image/png',
        b'GIF87a': 'image/gif',
        b'GIF89a': 'image/gif',
        b'RIFF': 'image/webp',
        b'%PDF-': 'application/pdf',
    }
    
    header = file.read(20)
    file.seek(0)
    is_valid_magic = False
    for magic, mtype in MAGIC_SIGNATURES.items():
        if header.startswith(magic):
            # Special check for webp which has "WEBP" at byte 8
            if magic == b'RIFF' and not header[8:12] == b'WEBP':
                continue
            # If magic matches, permit it based on the broad type
            if file.content_type in mtype or ext.replace('.jpg', '.jpeg')[1:] in mtype:
                is_valid_magic = True
                break
            # Relaxed fallback if it's broadly recognized
            is_valid_magic = True

    if not is_valid_magic:
        return jsonify({"error": "File signature mismatch (invalid magic bytes)"}), 400

    try:
        user_folder = str(g.current_user["id"])
        safe_name = sanitize_filename(file.filename)
        
        # Try S3 first
        s3_key = upload_to_s3(file, safe_name, folder_path=user_folder)
        if s3_key:
            return jsonify({"url": f"/uploads/{s3_key}"})
            
        # Fallback to local (development)
        upload_dir = os.path.join(Config.UPLOAD_FOLDER, user_folder)
        os.makedirs(upload_dir, exist_ok=True)
        filepath = os.path.join(upload_dir, safe_name)
        file.seek(0) # reset pointer if S3 read it
        file.save(filepath)
        return jsonify({"url": f"/uploads/{user_folder}/{safe_name}"})
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": "File upload failed"}), 500


@api_bp.route("/subscriptions", methods=["GET"])
@login_required
def get_subscription():
    sub = query(
        "SELECT * FROM subscriptions WHERE manager_id = %s",
        (_get_manager_id(),),
        fetchone=True,
    )
    if not sub:
        sub = query(
            """INSERT INTO subscriptions (id, manager_id, plan, status, trial_started_at, trial_expires_at)
               VALUES (%s, %s, 'free', 'trial', NOW(), NOW() + INTERVAL '14 days')
               RETURNING *""",
            (generate_uuid(), _get_manager_id(),),
            fetchone=True
        )
    return jsonify({"data": sub})


@api_bp.route("/subscriptions/upgrade", methods=["POST"])
@login_required
def upgrade_subscription():
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body required"}), 400

    plan_id = data.get("plan")
    phone_number = data.get("phoneNumber")
    manager_id = _get_manager_id()

    if plan_id == "free":
        sub = query(
            """UPDATE subscriptions SET plan = 'free', status = 'trial',
               trial_started_at = NOW(), trial_expires_at = NOW() + INTERVAL '14 days'
               WHERE manager_id = %s
               RETURNING *""",
            (manager_id,),
            fetchone=True
        )
        return jsonify({"data": sub})

    if not phone_number:
        return jsonify({"error": "Phone number required for payment"}), 400

    return jsonify({"message": "Initiate M-Pesa payment first"}), 400


@api_bp.route("/subscriptions/activate", methods=["POST"])
@login_required
def activate_subscription():
    manager_id = _get_manager_id()

    sub = query(
        "SELECT * FROM subscriptions WHERE manager_id = %s",
        (manager_id,),
        fetchone=True,
    )
    if not sub or not sub.get("payment_confirmed"):
        return jsonify({"error": "Payment not confirmed"}), 400

    sub = query(
        """UPDATE subscriptions SET plan = pending_plan, status = 'active', activated_at = NOW(),
           expires_at = NOW() + INTERVAL '365 days', pending_payment = false, pending_plan = NULL,
           checkout_request_id = NULL, payment_phone = NULL, payment_confirmed = false
           WHERE id = %s
           RETURNING *""",
        (sub["id"],),
        fetchone=True
    )
    return jsonify({"data": sub})


@api_bp.route("/payment-history", methods=["GET"])
@login_required
def get_payment_history():
    history = query(
        "SELECT * FROM payment_history WHERE manager_id = %s ORDER BY created_at DESC",
        (_get_manager_id(),),
        fetchall=True,
    )
    return jsonify({"data": history or []})


@api_bp.route("/managers", methods=["GET"])
@manager_required
def get_managers():
    # Only admins and managers allowed, guarded by @manager_required
    managers = query(
        "SELECT id, email, name, role, status, created_at FROM users WHERE role = 'manager' ORDER BY name",
        fetchall=True,
    )
    return jsonify({"data": managers or []})
