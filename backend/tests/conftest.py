import os
import sys
import pytest

os.environ.setdefault("SECRET_KEY", "test-secret-key-for-testing-only")
os.environ.setdefault(
    "DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5432/uchaguzi360_test",
)
os.environ.setdefault("FLASK_DEBUG", "false")

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


@pytest.fixture(scope="session")
def app():
    from app import app as _app

    _app.config["TESTING"] = True
    _app.config["DEBUG"] = False
    _app.config["WTF_CSRF_ENABLED"] = False
    yield _app


@pytest.fixture(scope="session")
def client(app):
    return app.test_client()


@pytest.fixture(scope="session")
def db_pool():
    from database import init_pool, close_pool

    init_pool()
    yield
    close_pool()


@pytest.fixture
def db(db_pool):
    from database import query

    tables = [
        "user_sessions",
        "poll_votes",
        "polls",
        "sms_campaigns",
        "sms_contacts",
        "sms_templates",
        "payment_history",
        "subscriptions",
        "elections",
        "stations",
        "audit_log",
        "users",
    ]
    for t in tables:
        query(f"DELETE FROM {t}")
    yield
