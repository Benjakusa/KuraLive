import pytest
from database import query
from utils.helpers import hash_password, generate_uuid


def create_admin(client):
    user_id = generate_uuid()
    hashed = hash_password("StrongP@ss1")
    query(
        "INSERT INTO users (id, email, password_hash, name, role, status, admin_secret) VALUES (%s, %s, %s, %s, %s, 'Active', %s)",
        (user_id, "admin@example.com", hashed, "Admin", "admin", "admin_secret_123")
    )
    resp = client.post("/api/auth/login", json={"email": "admin@example.com", "password": "StrongP@ss1", "admin_secret": "admin_secret_123"})
    return user_id, resp.get_json()["token"]


@pytest.mark.usefixtures("db")
class TestAdminPerformanceAndBounds:

    def test_admin_stats_aggregate(self, client):
        """Test admin stats endpoints load metadata correctly without crashes from full table fetches."""
        admin_id, token = create_admin(client)
        
        # Insert test users
        for i in range(5):
             query(
                "INSERT INTO users (id, email, password_hash, name, role, status) VALUES (%s, %s, %s, %s, %s, 'Active')",
                (generate_uuid(), f"manager{i}@example.com", "hash", f"Mgr{i}", "manager")
             )
        
        resp = client.get("/api/admin/stats", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 200
        stats = resp.get_json()["stats"]
        assert stats["total_clients"] == 5
        assert stats["active_users"] == 5

    def test_pagination_bounds(self, client):
        """Test that list endpoints cap pagination limits properly."""
        from config import Config
        admin_id, token = create_admin(client)
        
        # Request an abnormally large per_page size via admin table endpoint
        resp = client.get(
            f"/api/admin/table/users?per_page={Config.MAX_PAGE_SIZE + 5000}", 
            headers={"Authorization": f"Bearer {token}"}
        )
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["per_page"] == Config.MAX_PAGE_SIZE

        # Request it for clients list too
        resp2 = client.get(
            f"/api/admin/clients?limit={Config.MAX_PAGE_SIZE + 5000}", 
            headers={"Authorization": f"Bearer {token}"}
        )
        assert resp2.status_code == 200
