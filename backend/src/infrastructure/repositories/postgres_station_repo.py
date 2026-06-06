"""Station Repository - Full implementation for all station SQL queries."""
from database import query


class PostgresStationRepository:

    def get_stations_for_agent(self, station_id, limit, offset):
        rows = query(
            "SELECT * FROM stations WHERE id = %s LIMIT %s OFFSET %s",
            (station_id, limit, offset),
            fetchall=True,
        )
        row = query("SELECT COUNT(*) as count FROM stations WHERE id = %s", (station_id,), fetchone=True)
        return rows or [], (row["count"] if row else 0)

    def get_stations_for_manager(self, manager_id, limit, offset):
        rows = query(
            "SELECT * FROM stations WHERE manager_id = %s ORDER BY name LIMIT %s OFFSET %s",
            (manager_id, limit, offset),
            fetchall=True,
        )
        row = query("SELECT COUNT(*) as count FROM stations WHERE manager_id = %s", (manager_id,), fetchone=True)
        return rows or [], (row["count"] if row else 0)

    def insert_station(self, station_id, name, county, constituency, ward,
                       registered_voters, code, location, agent_id, manager_id):
        return query(
            """INSERT INTO stations
               (id, name, county, constituency, ward, registered_voters, code, location, agent_id, manager_id)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
               RETURNING *""",
            (station_id, name, county, constituency, ward,
             registered_voters, code, location, agent_id, manager_id),
            fetchone=True,
        )

    def delete_station(self, station_id, manager_id):
        return query(
            "DELETE FROM stations WHERE id = %s AND manager_id = %s RETURNING id",
            (station_id, manager_id),
            fetchone=True,
        )
