"""Poll Repository - All poll-related SQL queries decoupled from HTTP handlers."""
import json
import secrets
from database import query
from utils.helpers import generate_uuid


class PostgresPollRepository:

    def list_polls(self, manager_id, search, limit, offset):
        base = "FROM polls p WHERE p.manager_id = %s"
        params = [manager_id]
        if search:
            base += " AND p.title ILIKE %s"
            params.append(f"%{search}%")
        rows = query(
            f"SELECT p.*, (SELECT COUNT(*) FROM poll_votes v WHERE v.poll_id = p.id) as vote_count "
            f"{base} ORDER BY created_at DESC LIMIT %s OFFSET %s",
            params + [limit, offset],
            fetchall=True,
        )
        total_row = query(f"SELECT COUNT(*) as c {base}", params, fetchone=True)
        return rows or [], (total_row["c"] if total_row else 0)

    def get_poll(self, poll_id, manager_id):
        return query(
            "SELECT * FROM polls WHERE id = %s AND manager_id = %s",
            (poll_id, manager_id),
            fetchone=True,
        )

    def get_poll_by_token(self, share_token):
        return query(
            "SELECT * FROM polls WHERE share_token = %s",
            (share_token,),
            fetchone=True,
        )

    def create_poll(self, manager_id, data):
        pid = generate_uuid()
        share_token = secrets.token_urlsafe(32)
        settings = data.get("settings", {
            "allow_unregistered": True,
            "require_location": False,
            "max_location_level": "national",
        })
        return query(
            """INSERT INTO polls
               (id, manager_id, election_id, title, description, questions, status, starts_at, ends_at, share_token, settings)
               VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
               RETURNING *""",
            (
                pid, manager_id, data.get("election_id"), data["title"],
                data.get("description", ""), json.dumps(data.get("questions", [])),
                data.get("status", "draft"), data.get("starts_at"), data.get("ends_at"),
                share_token, json.dumps(settings),
            ),
            fetchone=True,
        )

    def update_poll(self, poll_id, manager_id, data):
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
            params += [poll_id, manager_id]
            return query(
                f"UPDATE polls SET {', '.join(fields)} WHERE id = %s AND manager_id = %s RETURNING *",
                params, fetchone=True,
            )
        return self.get_poll(poll_id, manager_id)

    def delete_poll(self, poll_id, manager_id):
        query("DELETE FROM polls WHERE id = %s AND manager_id = %s", (poll_id, manager_id))

    def get_votes(self, poll_id, filters):
        conditions = ["poll_id = %s"]
        params = [poll_id]
        for key, field_path in [
            ("county", "location->>'county'"),
            ("constituency", "location->>'constituency'"),
            ("ward", "location->>'ward'"),
            ("polling_station", "location->>'polling_station'"),
        ]:
            if filters.get(key):
                conditions.append(f"{field_path} = %s")
                params.append(filters[key])
        where = " AND ".join(conditions)
        return query(f"SELECT * FROM poll_votes WHERE {where}", params, fetchall=True) or []

    def insert_vote(self, poll_id, session_hash, answers, location, voter_status):
        vote_id = generate_uuid()
        return query(
            """INSERT INTO poll_votes (id, poll_id, session_hash, answers, location, voter_status)
               VALUES (%s, %s, %s, %s, %s, %s) RETURNING id""",
            (vote_id, poll_id, session_hash, json.dumps(answers), json.dumps(location), voter_status),
            fetchone=True,
        )

    def find_duplicate_vote(self, poll_id, session_hash):
        return query(
            "SELECT id FROM poll_votes WHERE poll_id = %s AND session_hash = %s",
            (poll_id, session_hash),
            fetchone=True,
        )
