import pytest
from database import query
from utils.helpers import hash_password, generate_uuid


def create_user(client, email, role, manager_id=None):
    user_id = generate_uuid()
    hashed = hash_password("StrongP@ss1")
    query(
        "INSERT INTO users (id, email, password_hash, name, role, status, manager_id) VALUES (%s, %s, %s, %s, %s, 'Active', %s)",
        (user_id, email, hashed, f"Test {role}", role, manager_id)
    )
    # Login to get token
    resp = client.post("/api/auth/login", json={"email": email, "password": "StrongP@ss1"})
    return user_id, resp.get_json()["token"]


@pytest.mark.usefixtures("db")
class TestSecurityFixes:

    def test_signup_admin_blocked(self, client):
        """Test blocking admin self-registration."""
        resp = client.post(
            "/api/auth/signup",
            json={
                "email": "hacker@example.com",
                "password": "StrongP@ss1",
                "name": "Hacker",
                "role": "admin"
            },
        )
        assert resp.status_code == 400
        assert resp.get_json()["error"] == "Invalid role"
        
        # Verify user is not in DB
        user = query("SELECT * FROM users WHERE email = %s", ("hacker@example.com",), fetchone=True)
        assert user is None

    def test_idor_delete_station(self, client):
        """Test that a manager cannot delete another manager's station."""
        mgr1_id, mgr1_token = create_user(client, "mgr1@example.com", "manager")
        mgr2_id, mgr2_token = create_user(client, "mgr2@example.com", "manager")

        # Manager 1 adds a station
        resp = client.post(
            "/api/stations",
            json={"name": "Station A", "county": "Nairobi"},
            headers={"Authorization": f"Bearer {mgr1_token}"}
        )
        assert resp.status_code == 201
        station_id = resp.get_json()["data"]["id"]

        # Manager 2 tries to delete Manager 1's station
        del_resp = client.delete(
            f"/api/stations/{station_id}",
            headers={"Authorization": f"Bearer {mgr2_token}"}
        )
        assert del_resp.status_code == 404
        assert "unauthorized" in del_resp.get_json()["error"].lower()

        # Manager 1 deletes their own station successfully
        del_resp2 = client.delete(
            f"/api/stations/{station_id}",
            headers={"Authorization": f"Bearer {mgr1_token}"}
        )
        assert del_resp2.status_code == 200

    def test_temp_password_not_exposed(self, client):
        """Test that adding an agent via API does not expose plaintext password."""
        mgr_id, mgr_token = create_user(client, "mgr3@example.com", "manager")
        
        resp = client.post(
            "/api/agents",
            json={"email": "agent@example.com", "name": "Agent Smith"},
            headers={"Authorization": f"Bearer {mgr_token}"}
        )
        assert resp.status_code == 201
        data = resp.get_json()
        assert "temp_password" not in data
        assert data["data"]["email"] == "agent@example.com"
