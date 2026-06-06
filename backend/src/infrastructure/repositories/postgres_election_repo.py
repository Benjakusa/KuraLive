import json
from typing import List, Dict, Tuple
from src.domain.repositories.election_repository import ElectionRepository
from database import query
from utils.helpers import generate_uuid

class PostgresElectionRepository(ElectionRepository):
    def get_by_manager(self, manager_id: str, limit: int, offset: int) -> Tuple[List[Dict], int]:
        rows = query(
            "SELECT id, details, manager_id, created_at FROM elections WHERE manager_id = %s ORDER BY created_at DESC LIMIT %s OFFSET %s",
            (manager_id, limit, offset), fetchall=True
        )
        total_row = query(
            "SELECT COUNT(*) as count FROM elections WHERE manager_id = %s",
            (manager_id,), fetchone=True
        )
        total = total_row["count"] if total_row else 0
        return rows, total

    def save(self, manager_id: str, details: Dict) -> None:
        details_json = json.dumps(details)
        existing = query("SELECT id FROM elections WHERE manager_id = %s LIMIT 1", (manager_id,), fetchone=True)
        if existing:
            query("UPDATE elections SET details = %s WHERE id = %s", (details_json, existing["id"]))
        else:
            query("INSERT INTO elections (id, details, manager_id) VALUES (%s, %s, %s)",
                  (generate_uuid(), details_json, manager_id))
