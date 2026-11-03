"""Shared pytest fixtures: a fresh in-memory app per test and helper clients."""
import pytest

from app import create_app
from config import TestConfig
from extensions import db


class FakeClaude:
    """Stand-in for ClaudeService so tests never call the real API."""

    model = "fake-model"
    is_available = True

    def __init__(self, plan=None, chat_reply="Keep going - one small step today!", error=None):
        self.plan = plan
        self.chat_reply = chat_reply
        self.error = error
        self.calls = 0

    def unavailable_reason(self):
        return "test"

    def generate_plan(self, params, today=None):
        self.calls += 1
        if self.error:
            raise self.error
        return self.plan

    def chat(self, history, message, context=""):
        self.calls += 1
        if self.error:
            raise self.error
        return self.chat_reply


@pytest.fixture()
def app():
    application = create_app(TestConfig)
    yield application
    with application.app_context():
        db.session.remove()
        db.drop_all()


@pytest.fixture()
def client(app):
    return app.test_client()


def register(client, name="Alice Tester", email="alice@example.com", password="Passw0rd123"):
    response = client.post("/api/auth/register", json={"name": name, "email": email, "password": password})
    assert response.status_code == 201, response.get_json()
    return response.get_json()


@pytest.fixture()
def auth(client):
    """Headers for a freshly registered user."""
    body = register(client)
    return {"Authorization": f"Bearer {body['token']}"}


@pytest.fixture()
def other_auth(client):
    """Headers for a second, unrelated user (for isolation tests)."""
    body = register(client, name="Bob Other", email="bob@example.com")
    return {"Authorization": f"Bearer {body['token']}"}


@pytest.fixture()
def goal(client, auth):
    from datetime import date, timedelta

    response = client.post(
        "/api/goals",
        json={"title": "Learn Flask", "category": "Learning", "priority": "high",
              "target_date": (date.today() + timedelta(days=30)).isoformat()},
        headers=auth,
    )
    assert response.status_code == 201, response.get_json()
    return response.get_json()["goal"]
