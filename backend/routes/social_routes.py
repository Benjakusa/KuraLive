import json
import logging
from flask import Blueprint, request, jsonify, g
from database import query
from utils.decorators import manager_required
from utils.helpers import generate_uuid

logger = logging.getLogger(__name__)

social_bp = Blueprint("social", __name__)

PLATFORMS = ("facebook", "twitter", "instagram", "tiktok")


@social_bp.route("/accounts", methods=["GET"])
@manager_required
def list_accounts():
    mid = g.current_user["id"]
    rows = query(
        "SELECT id, manager_id, platform, handle, page_id, follower_count, connected, last_sync FROM social_accounts WHERE manager_id = %s",
        (mid,),
        fetchall=True,
    )
    existing = {r["platform"] for r in (rows or [])}
    result = list(rows or [])
    for p in PLATFORMS:
        if p not in existing:
            result.append(
                {"platform": p, "connected": False, "handle": None, "follower_count": 0}
            )
    return jsonify({"data": result})


@social_bp.route("/accounts/connect", methods=["POST"])
@manager_required
def connect_account():
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body required"}), 400
    mid = g.current_user["id"]
    platform = data.get("platform")
    if platform not in PLATFORMS:
        return jsonify({"error": "Invalid platform"}), 400

    existing = query(
        "SELECT id FROM social_accounts WHERE manager_id = %s AND platform = %s",
        (mid, platform),
        fetchone=True,
    )
    if existing:
        query(
            """UPDATE social_accounts SET handle=%s, access_token=%s, refresh_token=%s,
               token_expires_at=%s, connected=true, last_sync=NOW()
               WHERE id=%s""",
            (
                data.get("handle"),
                data.get("access_token"),
                data.get("refresh_token"),
                data.get("expires_at"),
                existing["id"],
            ),
        )
        aid = existing["id"]
    else:
        aid = generate_uuid()
        query(
            """INSERT INTO social_accounts
               (id, manager_id, platform, handle, page_id, follower_count, access_token, refresh_token, token_expires_at, connected, last_sync)
               VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,true,NOW())""",
            (
                aid,
                mid,
                platform,
                data.get("handle"),
                data.get("page_id"),
                data.get("follower_count", 0),
                data.get("access_token"),
                data.get("refresh_token"),
                data.get("expires_at"),
            ),
        )

    row = query("SELECT * FROM social_accounts WHERE id = %s", (aid,), fetchone=True)
    return jsonify({"data": row})


@social_bp.route("/accounts/<aid>/disconnect", methods=["POST"])
@manager_required
def disconnect_account(aid):
    query(
        "UPDATE social_accounts SET connected=false, access_token=NULL, refresh_token=NULL WHERE id=%s AND manager_id=%s",
        (aid, g.current_user["id"]),
    )
    return jsonify({"message": "Disconnected"})


@social_bp.route("/posts", methods=["GET"])
@manager_required
def list_posts():
    mid = g.current_user["id"]
    status = request.args.get("status")
    sql = "SELECT * FROM scheduled_posts WHERE manager_id = %s"
    params = [mid]
    if status:
        sql += " AND status = %s"
        params.append(status)
    sql += " ORDER BY scheduled_at ASC NULLS LAST, created_at DESC"
    rows = query(sql, params, fetchall=True)
    return jsonify({"data": rows or []})


@social_bp.route("/posts", methods=["POST"])
@manager_required
def create_post():
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body required"}), 400
    mid = g.current_user["id"]
    if not data.get("content_text"):
        return jsonify({"error": "content_text is required"}), 400

    pid = generate_uuid()
    query(
        """INSERT INTO scheduled_posts
           (id, manager_id, platforms, content_text, media_urls, scheduled_at, status)
           VALUES (%s,%s,%s,%s,%s,%s,%s)""",
        (
            pid,
            mid,
            json.dumps(data.get("platforms", [])),
            data["content_text"],
            json.dumps(data.get("media_urls", [])),
            data.get("scheduled_at"),
            data.get("status", "draft"),
        ),
    )
    row = query("SELECT * FROM scheduled_posts WHERE id = %s", (pid,), fetchone=True)
    return jsonify({"data": row}), 201


@social_bp.route("/posts/<pid>", methods=["PUT"])
@manager_required
def update_post(pid):
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body required"}), 400
    mid = g.current_user["id"]
    fields, params = [], []
    for col in ["content_text", "scheduled_at", "status"]:
        if col in data:
            fields.append(f"{col} = %s")
            params.append(data[col])
    if "platforms" in data:
        fields.append("platforms = %s")
        params.append(json.dumps(data["platforms"]))
    if "media_urls" in data:
        fields.append("media_urls = %s")
        params.append(json.dumps(data["media_urls"]))
    if fields:
        params += [pid, mid]
        query(
            f"UPDATE scheduled_posts SET {', '.join(fields)} WHERE id=%s AND manager_id=%s",
            params,
        )
    row = query("SELECT * FROM scheduled_posts WHERE id = %s", (pid,), fetchone=True)
    return jsonify({"data": row})


@social_bp.route("/posts/<pid>", methods=["DELETE"])
@manager_required
def delete_post(pid):
    query(
        "DELETE FROM scheduled_posts WHERE id=%s AND manager_id=%s",
        (pid, g.current_user["id"]),
    )
    return jsonify({"message": "Post deleted"})


@social_bp.route("/metrics", methods=["GET"])
@manager_required
def get_metrics():
    mid = g.current_user["id"]
    platform = request.args.get("platform")
    days = int(request.args.get("days", 30))

    sql = """SELECT * FROM social_metrics
             WHERE manager_id = %s AND date >= NOW() - (%s || ' days')::INTERVAL"""
    params = [mid, str(days)]
    if platform:
        sql += " AND platform = %s"
        params.append(platform)
    sql += " ORDER BY date ASC"

    rows = query(sql, params, fetchall=True)
    return jsonify({"data": rows or []})


@social_bp.route("/metrics", methods=["POST"])
@manager_required
def upsert_metric():
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body required"}), 400
    mid = g.current_user["id"]
    query(
        """INSERT INTO social_metrics
           (id, manager_id, platform, date, followers, reach, impressions, engagements, sentiment_score)
           VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)
           ON CONFLICT (manager_id, platform, date) DO UPDATE SET
             followers=EXCLUDED.followers, reach=EXCLUDED.reach,
             impressions=EXCLUDED.impressions, engagements=EXCLUDED.engagements,
             sentiment_score=EXCLUDED.sentiment_score""",
        (
            generate_uuid(),
            mid,
            data["platform"],
            data["date"],
            data.get("followers", 0),
            data.get("reach", 0),
            data.get("impressions", 0),
            data.get("engagements", 0),
            data.get("sentiment_score", 0),
        ),
    )
    return jsonify({"message": "ok"})


@social_bp.route("/mentions", methods=["GET"])
@manager_required
def list_mentions():
    mid = g.current_user["id"]
    rows = query(
        "SELECT * FROM social_mentions WHERE manager_id = %s ORDER BY mention_at DESC LIMIT 100",
        (mid,),
        fetchall=True,
    )
    return jsonify({"data": rows or []})


@social_bp.route("/keywords", methods=["GET"])
@manager_required
def list_keywords():
    rows = query(
        "SELECT * FROM social_keywords WHERE manager_id = %s ORDER BY created_at DESC",
        (g.current_user["id"],),
        fetchall=True,
    )
    return jsonify({"data": rows or []})


@social_bp.route("/keywords", methods=["POST"])
@manager_required
def add_keyword():
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body required"}), 400
    kw = (data.get("keyword") or "").strip().lower()
    if not kw:
        return jsonify({"error": "keyword required"}), 400
    kid = generate_uuid()
    try:
        query(
            "INSERT INTO social_keywords (id, manager_id, keyword) VALUES (%s,%s,%s)",
            (kid, g.current_user["id"], kw),
        )
    except Exception:
        return jsonify({"error": "Keyword already exists"}), 409
    row = query("SELECT * FROM social_keywords WHERE id=%s", (kid,), fetchone=True)
    return jsonify({"data": row}), 201


@social_bp.route("/keywords/<kid>", methods=["DELETE"])
@manager_required
def delete_keyword(kid):
    query(
        "DELETE FROM social_keywords WHERE id=%s AND manager_id=%s",
        (kid, g.current_user["id"]),
    )
    return jsonify({"message": "Keyword deleted"})


@social_bp.route("/competitors", methods=["GET"])
@manager_required
def list_competitors():
    rows = query(
        "SELECT * FROM social_competitors WHERE manager_id=%s ORDER BY created_at DESC",
        (g.current_user["id"],),
        fetchall=True,
    )
    return jsonify({"data": rows or []})


@social_bp.route("/competitors", methods=["POST"])
@manager_required
def add_competitor():
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body required"}), 400
    cid = generate_uuid()
    query(
        """INSERT INTO social_competitors
           (id, manager_id, platform, handle, follower_count, engagement_rate, posts_last_30d)
           VALUES (%s,%s,%s,%s,%s,%s,%s)""",
        (
            cid,
            g.current_user["id"],
            data.get("platform", "twitter"),
            data["handle"],
            data.get("follower_count", 0),
            data.get("engagement_rate", 0),
            data.get("posts_last_30d", 0),
        ),
    )
    row = query("SELECT * FROM social_competitors WHERE id=%s", (cid,), fetchone=True)
    return jsonify({"data": row}), 201


@social_bp.route("/competitors/<cid>", methods=["DELETE"])
@manager_required
def delete_competitor(cid):
    query(
        "DELETE FROM social_competitors WHERE id=%s AND manager_id=%s",
        (cid, g.current_user["id"]),
    )
    return jsonify({"message": "Competitor removed"})
