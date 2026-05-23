import json
import hashlib
import secrets
from flask import Blueprint, request, jsonify, g
from database import query
from utils.decorators import manager_required, login_required
from utils.helpers import generate_uuid

poll_bp = Blueprint("poll", __name__)


def make_session_hash(req):
    """SHA-256 of IP + User-Agent as a lightweight duplicate-vote guard."""
    ip = req.headers.get("X-Forwarded-For", req.remote_addr or "unknown").split(",")[0].strip()
    ua = req.headers.get("User-Agent", "")
    raw = f"{ip}|{ua}"
    return hashlib.sha256(raw.encode()).hexdigest()


# ── ADMIN: POLL MANAGEMENT ────────────────────────────


@poll_bp.route("/polls", methods=["GET"])
@manager_required
def list_polls():
    mid = g.current_user["id"]
    page = int(request.args.get("page", 1))
    per_page = int(request.args.get("per_page", 20))
    search = request.args.get("search", "")
    offset = (page - 1) * per_page

    base = "FROM polls p WHERE p.manager_id = %s"
    params = [mid]
    if search:
        base += " AND p.title ILIKE %s"
        params.append(f"%{search}%")

    rows = query(
        f"SELECT p.*, (SELECT COUNT(*) FROM poll_votes v WHERE v.poll_id = p.id) as vote_count "
        f"{base} ORDER BY created_at DESC LIMIT %s OFFSET %s",
        params + [per_page, offset],
        fetchall=True,
    )
    total = query(f"SELECT COUNT(*) as c {base}", params, fetchone=True)["c"]
    return jsonify({"data": rows or [], "total": total, "page": page, "per_page": per_page})


@poll_bp.route("/polls", methods=["POST"])
@manager_required
def create_poll():
    data = request.get_json()
    mid = g.current_user["id"]

    if not data.get("title"):
        return jsonify({"error": "title is required"}), 400

    pid = generate_uuid()
    share_token = secrets.token_urlsafe(32)

    query(
        """INSERT INTO polls
           (id, manager_id, election_id, title, description, questions, status, starts_at, ends_at, share_token, settings)
           VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
        (
            pid, mid,
            data.get("election_id"),
            data["title"],
            data.get("description", ""),
            json.dumps(data.get("questions", [])),
            data.get("status", "draft"),
            data.get("starts_at"),
            data.get("ends_at"),
            share_token,
            json.dumps(data.get("settings", {
                "allow_unregistered": True,
                "require_location": False,
                "max_location_level": "national"
            })),
        ),
    )
    row = query("SELECT * FROM polls WHERE id = %s", (pid,), fetchone=True)
    return jsonify({"data": row}), 201


@poll_bp.route("/polls/<pid>", methods=["GET"])
@manager_required
def get_poll(pid):
    mid = g.current_user["id"]
    row = query("SELECT * FROM polls WHERE id=%s AND manager_id=%s", (pid, mid), fetchone=True)
    if not row:
        return jsonify({"error": "Poll not found"}), 404
    return jsonify({"data": row})


@poll_bp.route("/polls/<pid>", methods=["PUT"])
@manager_required
def update_poll(pid):
    data = request.get_json()
    mid = g.current_user["id"]
    fields, params = [], []
    for col in ["title", "description", "status", "starts_at", "ends_at", "election_id"]:
        if col in data:
            fields.append(f"{col} = %s")
            params.append(data[col])
    if "questions" in data:
        fields.append("questions = %s")
        params.append(json.dumps(data["questions"]))
    if "settings" in data:
        fields.append("settings = %s")
        params.append(json.dumps(data["settings"]))
    if fields:
        params += [pid, mid]
        query(f"UPDATE polls SET {', '.join(fields)} WHERE id=%s AND manager_id=%s", params)
    row = query("SELECT * FROM polls WHERE id=%s", (pid,), fetchone=True)
    return jsonify({"data": row})


@poll_bp.route("/polls/<pid>", methods=["DELETE"])
@manager_required
def delete_poll(pid):
    query("DELETE FROM polls WHERE id=%s AND manager_id=%s", (pid, g.current_user["id"]))
    return jsonify({"message": "Poll deleted"})


# ── ADMIN: POLL RESULTS ───────────────────────────────


@poll_bp.route("/polls/<pid>/results", methods=["GET"])
@manager_required
def poll_results(pid):
    mid = g.current_user["id"]
    poll = query("SELECT * FROM polls WHERE id=%s AND manager_id=%s", (pid, mid), fetchone=True)
    if not poll:
        return jsonify({"error": "Poll not found"}), 404

    votes = query("SELECT * FROM poll_votes WHERE poll_id=%s", (pid,), fetchall=True) or []
    
    county_filter = request.args.get("county")
    constituency_filter = request.args.get("constituency")
    ward_filter = request.args.get("ward")
    station_filter = request.args.get("polling_station")
    
    filtered_votes = []
    for v in votes:
        loc = v["location"] if isinstance(v["location"], dict) else json.loads(v.get("location") or "{}")
        if county_filter and loc.get("county") != county_filter: continue
        if constituency_filter and loc.get("constituency") != constituency_filter: continue
        if ward_filter and loc.get("ward") != ward_filter: continue
        if station_filter and loc.get("polling_station") != station_filter: continue
        filtered_votes.append(v)
        
    votes = filtered_votes

    questions = poll["questions"] if isinstance(poll["questions"], list) else json.loads(poll.get("questions") or "[]")
    total_votes = len(votes)

    results_by_question = []
    for qi, q in enumerate(questions):
        q_key = str(qi)
        options = q.get("options", [])
        tally = {opt: 0 for opt in options}
        reg_tally = {opt: 0 for opt in options}
        unreg_tally = {opt: 0 for opt in options}

        for v in votes:
            answers = v["answers"] if isinstance(v["answers"], dict) else json.loads(v.get("answers") or "{}")
            ans = answers.get(q_key, [])
            if isinstance(ans, str):
                ans = [ans]
            for a in ans:
                if a in tally:
                    tally[a] += 1
                    if v["voter_status"] == "registered":
                        reg_tally[a] += 1
                    else:
                        unreg_tally[a] += 1

        results_by_question.append({
            "question": q,
            "tally": tally,
            "registered_tally": reg_tally,
            "unregistered_tally": unreg_tally,
        })

    # Geographic breakdown
    geo = {}
    for v in votes:
        loc = v["location"] if isinstance(v["location"], dict) else json.loads(v.get("location") or "{}")
        for level in ["county", "constituency", "ward", "polling_station"]:
            val = loc.get(level)
            if val:
                geo.setdefault(level, {})
                geo[level][val] = geo[level].get(val, 0) + 1

    registered = sum(1 for v in votes if v["voter_status"] == "registered")
    unregistered = total_votes - registered

    return jsonify({
        "poll": poll,
        "total_votes": total_votes,
        "registered": registered,
        "unregistered": unregistered,
        "results_by_question": results_by_question,
        "geographic_breakdown": geo,
    })


# ── PUBLIC: VOTE ──────────────────────────────────────


@poll_bp.route("/public/poll/<share_token>", methods=["GET"])
def public_get_poll(share_token):
    poll = query("SELECT * FROM polls WHERE share_token=%s", (share_token,), fetchone=True)
    if not poll:
        return jsonify({"error": "Poll not found"}), 404

    # Auto-close if past ends_at
    _maybe_close_poll(poll)
    poll = query("SELECT * FROM polls WHERE share_token=%s", (share_token,), fetchone=True)

    if poll["status"] == "draft":
        return jsonify({"error": "This poll is not yet available"}), 403

    questions = poll["questions"] if isinstance(poll["questions"], list) else json.loads(poll.get("questions") or "[]")
    settings = poll["settings"] if isinstance(poll["settings"], dict) else json.loads(poll.get("settings") or "{}")

    stations = query("SELECT county, constituency, ward, name as polling_station FROM stations WHERE manager_id=%s", (poll["manager_id"],), fetchall=True) or []

    return jsonify({
        "id": poll["id"],
        "title": poll["title"],
        "description": poll["description"],
        "status": poll["status"],
        "starts_at": str(poll["starts_at"]) if poll["starts_at"] else None,
        "ends_at": str(poll["ends_at"]) if poll["ends_at"] else None,
        "questions": questions,
        "settings": settings,
        "share_token": share_token,
        "locations": stations,
    })


@poll_bp.route("/public/poll/<share_token>/vote", methods=["POST"])
def public_vote(share_token):
    poll = query("SELECT * FROM polls WHERE share_token=%s", (share_token,), fetchone=True)
    if not poll:
        return jsonify({"error": "Poll not found"}), 404

    _maybe_close_poll(poll)
    poll = query("SELECT * FROM polls WHERE share_token=%s", (share_token,), fetchone=True)

    if poll["status"] != "active":
        return jsonify({"error": "This poll is not currently accepting votes"}), 403

    data = request.get_json()
    session_hash = data.get("session_hash") or make_session_hash(request)

    # Duplicate vote check
    existing = query(
        "SELECT id FROM poll_votes WHERE poll_id=%s AND session_hash=%s",
        (poll["id"], session_hash),
        fetchone=True,
    )
    if existing:
        return jsonify({"error": "duplicate"}), 409

    settings = poll["settings"] if isinstance(poll["settings"], dict) else json.loads(poll.get("settings") or "{}")
    voter_status = data.get("voter_status", "unregistered")

    if voter_status == "unregistered" and not settings.get("allow_unregistered", True):
        return jsonify({"error": "Only registered voters may participate in this poll"}), 403

    vid = generate_uuid()
    try:
        query(
            """INSERT INTO poll_votes
               (id, poll_id, session_hash, answers, voter_status, location)
               VALUES (%s,%s,%s,%s,%s,%s)""",
            (
                vid,
                poll["id"],
                session_hash,
                json.dumps(data.get("answers", {})),
                voter_status,
                json.dumps(data.get("location", {})),
            ),
        )
    except Exception as e:
        if "unique" in str(e).lower():
            return jsonify({"error": "duplicate"}), 409
        return jsonify({"error": str(e)}), 400

    return jsonify({"message": "Vote recorded", "ends_at": str(poll["ends_at"]) if poll["ends_at"] else None})


def _maybe_close_poll(poll):
    """Auto-close poll if ends_at has passed."""
    from datetime import datetime, timezone
    if poll["status"] == "active" and poll.get("ends_at"):
        ends = poll["ends_at"]
        now = datetime.now(timezone.utc)
        if hasattr(ends, "tzinfo"):
            if (ends.tzinfo is None and ends < datetime.utcnow()) or \
               (ends.tzinfo is not None and ends < now):
                query("UPDATE polls SET status='closed' WHERE id=%s", (poll["id"],))
        else:
            try:
                from datetime import datetime as dt
                ends_dt = dt.fromisoformat(str(ends).replace("Z", "+00:00"))
                if ends_dt < now:
                    query("UPDATE polls SET status='closed' WHERE id=%s", (poll["id"],))
            except Exception:
                pass
