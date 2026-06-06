"""Station Service - Domain logic layer decoupled from HTTP/SQL concerns."""
from utils.helpers import generate_uuid


class StationService:
    def __init__(self, station_repo):
        self.repo = station_repo

    def list_stations(self, role, user_id, station_id, limit, offset, requested_manager_id=None):
        if role == "agent":
            if not station_id:
                return [], 0
            rows, total = self.repo.get_stations_for_agent(station_id, limit, offset)
            return rows, total
        elif role == "manager":
            manager_id = requested_manager_id or user_id
            rows, total = self.repo.get_stations_for_manager(manager_id, limit, offset)
            return rows, total
        return [], 0

    def create_station(self, data, manager_id):
        station_id = generate_uuid()
        return self.repo.insert_station(
            station_id=station_id,
            name=data["name"],
            county=data.get("county"),
            constituency=data.get("constituency"),
            ward=data.get("ward"),
            registered_voters=data.get("voters") or data.get("registered_voters", 0),
            code=data.get("code"),
            location=data.get("location"),
            agent_id=data.get("agent_id"),
            manager_id=manager_id,
        )

    def delete_station(self, station_id, manager_id):
        return self.repo.delete_station(station_id, manager_id)
