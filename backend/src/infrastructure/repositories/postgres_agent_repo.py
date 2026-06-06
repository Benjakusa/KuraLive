"""Agent Repository - Full implementation for all agent SQL queries."""
from database import query


class PostgresAgentRepository:

    def get_agent_self(self, user_id, limit, offset):
        cols = "id, email, name, role, station_id, permissions, submission_status, status, manager_id, created_at"
        rows = query(
            f"SELECT {cols} FROM users WHERE id = %s LIMIT %s OFFSET %s",
            (user_id, limit, offset),
            fetchall=True,
        )
        row = query("SELECT COUNT(*) as count FROM users WHERE id = %s", (user_id,), fetchone=True)
        return rows or [], (row["count"] if row else 0)

    def get_agents_for_manager(self, manager_id, limit, offset):
        cols = "id, email, name, role, station_id, permissions, submission_status, status, manager_id, created_at"
        rows = query(
            f"SELECT {cols} FROM users WHERE role = 'agent' AND manager_id = %s ORDER BY name LIMIT %s OFFSET %s",
            (manager_id, limit, offset),
            fetchall=True,
        )
        row = query(
            "SELECT COUNT(*) as count FROM users WHERE role = 'agent' AND manager_id = %s",
            (manager_id,),
            fetchone=True,
        )
        return rows or [], (row["count"] if row else 0)

    def insert_agent(self, agent_id, email, password_hash, name, station_id,
                     permissions, submission_status, status, manager_id):
        return query(
            """INSERT INTO users
               (id, email, password_hash, name, role, station_id, permissions, submission_status, status, manager_id)
               VALUES (%s, %s, %s, %s, 'agent', %s, %s, %s, %s, %s)
               RETURNING id, email, name, role, station_id, permissions, submission_status, status, manager_id, created_at""",
            (agent_id, email, password_hash, name, station_id,
             permissions, submission_status, status, manager_id),
            fetchone=True,
        )

    def update_agent(self, agent_id, manager_id, updates):
        fields = [f"{k} = %s" for k in updates]
        values = list(updates.values()) + [agent_id, manager_id]
        return query(
            f"UPDATE users SET {', '.join(fields)} WHERE id = %s AND manager_id = %s "
            "RETURNING id, email, name, role, station_id, permissions, submission_status, status, manager_id, created_at",
            values,
            fetchone=True,
        )

    def delete_agent(self, agent_id, manager_id):
        return query(
            "DELETE FROM users WHERE id = %s AND manager_id = %s AND role = 'agent' RETURNING id",
            (agent_id, manager_id),
            fetchone=True,
        )
