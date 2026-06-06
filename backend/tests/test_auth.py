import json
import pytest


@pytest.mark.usefixtures("db")
class TestSignup:
    def test_signup_success(self, client):
        resp = client.post(
            "/api/auth/signup",
            json={
                "email": "test@example.com",
                "password": "StrongP@ss1",
                "name": "Test User",
            },
        )
        assert resp.status_code == 201
        data = resp.get_json()
        assert data["user"]["email"] == "test@example.com"
        assert "token" in data
        assert "password_hash" not in data["user"]

    def test_signup_duplicate_email(self, client):
        client.post(
            "/api/auth/signup",
            json={"email": "dup@example.com", "password": "StrongP@ss1"},
        )
        resp = client.post(
            "/api/auth/signup",
            json={"email": "dup@example.com", "password": "StrongP@ss1"},
        )
        assert resp.status_code == 409

    def test_signup_weak_password(self, client):
        resp = client.post(
            "/api/auth/signup",
            json={"email": "weak@example.com", "password": "short"},
        )
        assert resp.status_code == 400
        assert "error" in resp.get_json()

    def test_signup_invalid_email(self, client):
        resp = client.post(
            "/api/auth/signup",
            json={"email": "not-an-email", "password": "StrongP@ss1"},
        )
        assert resp.status_code == 400

    def test_signup_missing_body(self, client):
        resp = client.post("/api/auth/signup")
        assert resp.status_code == 400


@pytest.mark.usefixtures("db")
class TestLogin:
    def test_login_success(self, client):
        client.post(
            "/api/auth/signup",
            json={"email": "login@example.com", "password": "StrongP@ss1"},
        )
        resp = client.post(
            "/api/auth/login",
            json={"email": "login@example.com", "password": "StrongP@ss1"},
        )
        assert resp.status_code == 200
        data = resp.get_json()
        assert "token" in data
        assert "user" in data

    def test_login_wrong_password(self, client):
        client.post(
            "/api/auth/signup",
            json={"email": "wrong@example.com", "password": "StrongP@ss1"},
        )
        resp = client.post(
            "/api/auth/login",
            json={"email": "wrong@example.com", "password": "WrongP@ss1"},
        )
        assert resp.status_code == 401

    def test_login_nonexistent_user(self, client):
        resp = client.post(
            "/api/auth/login",
            json={
                "email": "nobody@example.com",
                "password": "StrongP@ss1",
            },
        )
        assert resp.status_code == 401

    def test_login_sets_cookie(self, client):
        client.post(
            "/api/auth/signup",
            json={"email": "cookie@example.com", "password": "StrongP@ss1"},
        )
        resp = client.post(
            "/api/auth/login",
            json={"email": "cookie@example.com", "password": "StrongP@ss1"},
        )
        assert resp.status_code == 200
        cookies = resp.headers.get("Set-Cookie", "")
        assert "auth_token" in cookies
        assert "HttpOnly" in cookies
        assert "Secure" in cookies


@pytest.mark.usefixtures("db")
class TestProtectedEndpoints:
    def test_me_without_token(self, client):
        resp = client.get("/api/auth/me")
        assert resp.status_code == 401

    def test_me_with_token(self, client):
        signup = client.post(
            "/api/auth/signup",
            json={"email": "me@example.com", "password": "StrongP@ss1"},
        )
        token = signup.get_json()["token"]
        resp = client.get(
            "/api/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 200
        assert resp.get_json()["user"]["email"] == "me@example.com"

    def test_logout_invalidates_token(self, client):
        signup = client.post(
            "/api/auth/signup",
            json={"email": "logout@example.com", "password": "StrongP@ss1"},
        )
        token = signup.get_json()["token"]
        client.post(
            "/api/auth/logout",
            headers={"Authorization": f"Bearer {token}"},
        )
        resp = client.get(
            "/api/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 401


@pytest.mark.usefixtures("db")
class TestPasswordReset:
    def test_forgot_password(self, client):
        client.post(
            "/api/auth/signup",
            json={"email": "reset@example.com", "password": "StrongP@ss1"},
        )
        resp = client.post(
            "/api/auth/forgot-password",
            json={"email": "reset@example.com"},
        )
        assert resp.status_code == 200

    def test_forgot_password_nonexistent(self, client):
        resp = client.post(
            "/api/auth/forgot-password",
            json={"email": "ghost@example.com"},
        )
        assert resp.status_code == 200

    def test_reset_password(self, client):
        from database import query
        from utils.helpers import generate_token
        from datetime import datetime, timedelta

        client.post(
            "/api/auth/signup",
            json={"email": "fullreset@example.com", "password": "StrongP@ss1"},
        )
        user = query(
            "SELECT id FROM users WHERE email = %s",
            ("fullreset@example.com",),
            fetchone=True,
        )
        token = generate_token()
        query(
            "INSERT INTO user_sessions (token, user_id, expires_at) VALUES (%s, %s, %s)",
            (token, user["id"], datetime.utcnow() + timedelta(hours=1)),
        )
        resp = client.post(
            "/api/auth/reset-password",
            json={"token": token, "password": "NewStr0ng!Pass"},
        )
        assert resp.status_code == 200
