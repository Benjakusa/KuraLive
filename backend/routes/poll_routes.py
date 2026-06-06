import json
import secrets
import logging
from flask import Blueprint, request, jsonify, g
from database import query
from utils.decorators import manager_required, login_required
from extensions import limiter
from utils.helpers import generate_uuid, generate_session_hash, safe_json_loads
from src.infrastructure.repositories.postgres_poll_repo import PostgresPollRepository

logger = logging.getLogger(__name__)

poll_bp = Blueprint("poll", __name__)
poll_repo = PostgresPollRepository()


@poll_bp.route("/polls", methods=["GET"])
@manager_required
def list_polls():
    page = int(request.args.get("page", 1))
    per_page = min(int(request.args.get("per_page", 20)), 100)
    rows, total = poll_repo.list_polls(
        manager_id=g.current_user["id"],
        search=request.args.get("search", ""),
        limit=per_page,
        offset=(page - 1) * per_page,
    )
    return jsonify({"data": rows, "total": total, "page": page, "per_page": per_page})


@poll_bp.route("/polls", methods=["POST"])
@manager_required
def create_poll():
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body required"}), 400
    if not data.get("title"):
        return jsonify({"error": "title is required"}), 400
    row = poll_repo.create_poll(manager_id=g.current_user["id"], data=data)
    return jsonify({"data": row}), 201


@poll_bp.route("/polls/<pid>", methods=["GET"])
@manager_required
def get_poll(pid):
    row = poll_repo.get_poll(pid, manager_id=g.current_user["id"])
    if not row:
        return jsonify({"error": "Poll not found"}), 404
    return jsonify({"data": row})


@poll_bp.route("/polls/<pid>", methods=["PUT"])
@manager_required
def update_poll(pid):
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body required"}), 400
    row = poll_repo.update_poll(pid, manager_id=g.current_user["id"], data=data)
    return jsonify({"data": row})


@poll_bp.route("/polls/<pid>", methods=["DELETE"])
@manager_required
def delete_poll(pid):
    poll_repo.delete_poll(pid, manager_id=g.current_user["id"])
    return jsonify({"message": "Poll deleted"})


@poll_bp.route("/polls/<pid>/results", methods=["GET"])
@manager_required
def poll_results(pid):
    poll = poll_repo.get_poll(pid, manager_id=g.current_user["id"])
    if not poll:
        return jsonify({"error": "Poll not found"}), 404

    filters = {
        "county": request.args.get("county"),
        "constituency": request.args.get("constituency"),
        "ward": request.args.get("ward"),
        "polling_station": request.args.get("polling_station"),
    }
    votes = poll_repo.get_votes(pid, filters)

    questions = safe_json_loads(poll.get("questions"), [])
    total_votes = len(votes)

    results_by_question = []
    for qi, q in enumerate(questions):
        q_key = str(qi)
        options = q.get("options", [])
        tally = {opt: 0 for opt in options}
        reg_tally = {opt: 0 for opt in options}
        unreg_tally = {opt: 0 for opt in options}

        for v in votes:
            answers = safe_json_loads(v.get("answers"), {})
            ans = answers.get(q_key, [])
            if isinstance(ans, str):
                ans = [ans]
            for a in ans:
                if a in tally:
                    tally[a] += 1
                    if v.get("voter_status") == "registered":
                        reg_tally[a] += 1
                    else:
                        unreg_tally[a] += 1

        results_by_question.append(
            {
                "question": q,
                "tally": tally,
                "registered_tally": reg_tally,
                "unregistered_tally": unreg_tally,
            }
        )

    geo = {}
    for v in votes:
        loc = safe_json_loads(v.get("location"), {})
        for level in ["county", "constituency", "ward", "polling_station"]:
            val = loc.get(level)
            if val:
                geo.setdefault(level, {})
                geo[level][val] = geo[level].get(val, 0) + 1

    registered = sum(1 for v in votes if v.get("voter_status") == "registered")
    unregistered = total_votes - registered

    return jsonify(
        {
            "poll": poll,
            "total_votes": total_votes,
            "registered": registered,
            "unregistered": unregistered,
            "results_by_question": results_by_question,
            "geographic_breakdown": geo,
        }
    )


@poll_bp.route("/public/poll/<share_token>", methods=["GET"])
@limiter.limit("60/minute")
def public_get_poll(share_token):
    poll = poll_repo.get_poll_by_token(share_token)
    if not poll:
        return jsonify({"error": "Poll not found"}), 404

    _maybe_close_poll(poll)
    poll = poll_repo.get_poll_by_token(share_token)

    if poll["status"] == "draft":
        return jsonify({"error": "This poll is not yet available"}), 403

    questions = safe_json_loads(poll.get("questions"), [])
    settings = safe_json_loads(poll.get("settings"), {})

    stations = (
        query(
            "SELECT county, constituency, ward, name as polling_station FROM stations WHERE manager_id=%s AND name IS NOT NULL",
            (poll["manager_id"],),
            fetchall=True,
        )
        or []
    )

    return jsonify(
        {
            "id": poll["id"],
            "title": poll["title"],
            "description": poll["description"],
            "status": poll["status"],
            "starts_at": str(poll["starts_at"]) if poll.get("starts_at") else None,
            "ends_at": str(poll["ends_at"]) if poll.get("ends_at") else None,
            "questions": questions,
            "settings": settings,
            "share_token": share_token,
            "locations": stations,
        }
    )


@poll_bp.route("/public/poll/<share_token>/vote", methods=["POST"])
@limiter.limit("20/minute")
def public_vote(share_token):
    poll = poll_repo.get_poll_by_token(share_token)
    if not poll:
        return jsonify({"error": "Poll not found"}), 404

    _maybe_close_poll(poll)
    poll = poll_repo.get_poll_by_token(share_token)

    if poll["status"] != "active":
        return jsonify({"error": "This poll is not currently accepting votes"}), 403

    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body required"}), 400

    session_hash = data.get("session_hash") or generate_session_hash(request)

    if poll_repo.find_duplicate_vote(poll["id"], session_hash):
        return jsonify({"error": "duplicate"}), 409

    settings = safe_json_loads(poll.get("settings"), {})
    voter_status = data.get("voter_status", "unregistered")

    if voter_status == "unregistered" and not settings.get("allow_unregistered", True):
        return jsonify({"error": "Only registered voters may participate in this poll"}), 403

    try:
        poll_repo.insert_vote(
            poll_id=poll["id"],
            session_hash=session_hash,
            answers=data.get("answers", {}),
            location=data.get("location", {}),
            voter_status=voter_status,
        )
    except Exception as e:
        if "unique" in str(e).lower():
            return jsonify({"error": "duplicate"}), 409
        logger.error(f"Vote insert error: {e}")
        return jsonify({"error": "Could not record vote"}), 400

    return jsonify({"message": "Vote recorded", "ends_at": str(poll["ends_at"]) if poll.get("ends_at") else None})


def _maybe_close_poll(poll):
    from datetime import datetime, timezone

    if poll.get("status") == "active" and poll.get("ends_at"):
        ends = poll["ends_at"]
        now = datetime.now(timezone.utc)
        try:
            if hasattr(ends, "tzinfo"):
                if (ends.tzinfo is None and ends.replace(tzinfo=timezone.utc) < now) or (
                    ends.tzinfo is not None and ends < now
                ):
                    query("UPDATE polls SET status='closed' WHERE id=%s", (poll["id"],))
            else:
                from datetime import datetime as dt

                ends_dt = dt.fromisoformat(str(ends).replace("Z", "+00:00"))
                if ends_dt.tzinfo is None:
                    ends_dt = ends_dt.replace(tzinfo=timezone.utc)
                if ends_dt < now:
                    query("UPDATE polls SET status='closed' WHERE id=%s", (poll["id"],))
        except Exception as e:
            logger.warning(f"Failed to auto-close poll {poll['id']}: {e}")
