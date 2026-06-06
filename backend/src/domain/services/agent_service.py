"""Agent Service - Domain logic layer decoupled from HTTP/SQL concerns."""
import random
import string
from utils.helpers import generate_uuid, hash_password


class AgentService:
    def __init__(self, agent_repo):
        self.repo = agent_repo

    def list_agents(self, role, user_id, limit, offset):
        if role == "agent":
            rows, total = self.repo.get_agent_self(user_id, limit, offset)
        elif role == "manager":
            rows, total = self.repo.get_agents_for_manager(user_id, limit, offset)
        else:
            return [], 0
        return rows, total

    def create_agent(self, data, manager_id):
        temp_password = data.get("password") or (
            "".join(random.choices(string.ascii_letters + string.digits, k=10)) + "A1!"
        )
        agent_id = generate_uuid()
        hashed = hash_password(temp_password)
        return self.repo.insert_agent(
            agent_id=agent_id,
            email=data["email"],
            password_hash=hashed,
            name=data.get("name", "Agent"),
            station_id=data.get("stationId"),
            permissions=data.get("permissions", "edit"),
            submission_status=data.get("submissionStatus", "Pending"),
            status=data.get("status", "Active"),
            manager_id=manager_id,
        )

    def update_agent(self, agent_id, manager_id, data):
        allowed = ["name", "email", "status", "station_id", "permissions", "submission_status"]
        updates = {k: v for k, v in data.items() if k in allowed}
        if not updates:
            return None
        return self.repo.update_agent(agent_id, manager_id, updates)

    def delete_agent(self, agent_id, manager_id):
        return self.repo.delete_agent(agent_id, manager_id)
