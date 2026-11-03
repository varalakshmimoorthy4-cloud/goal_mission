"""Authentication, profile and demo-mode tests."""
from conftest import register
from models import User


def test_register_success_hashes_password(client, app):
    body = register(client)
    assert body["user"]["email"] == "alice@example.com"
    assert "password" not in body["user"] and "password_hash" not in body["user"]
    with app.app_context():
        stored = User.query.filter_by(email="alice@example.com").one()
        assert stored.password_hash != "Passw0rd123"
        assert stored.check_password("Passw0rd123")


def test_register_validation_errors(client):
    response = client.post("/api/auth/register", json={"name": "A", "email": "bad", "password": "short"})
    assert response.status_code == 422
    details = response.get_json()["error"]["details"]
    assert {"name", "email", "password"} <= set(details)


def test_register_duplicate_email(client):
    register(client)
    response = client.post(
        "/api/auth/register",
        json={"name": "Alice Two", "email": "ALICE@example.com", "password": "Passw0rd123"},
    )
    assert response.status_code == 409


def test_login_success_and_failure(client):
    register(client)
    ok = client.post("/api/auth/login", json={"email": "alice@example.com", "password": "Passw0rd123"})
    assert ok.status_code == 200 and ok.get_json()["token"]
    bad = client.post("/api/auth/login", json={"email": "alice@example.com", "password": "wrong"})
    assert bad.status_code == 401
    unknown = client.post("/api/auth/login", json={"email": "nobody@example.com", "password": "Passw0rd123"})
    assert unknown.status_code == 401
    assert bad.get_json()["error"]["message"] == unknown.get_json()["error"]["message"]


def test_login_is_rate_limited_after_repeated_failures(client):
    register(client)
    for _ in range(8):
        client.post("/api/auth/login", json={"email": "alice@example.com", "password": "wrong"})
    response = client.post("/api/auth/login", json={"email": "alice@example.com", "password": "Passw0rd123"})
    assert response.status_code == 429


def test_protected_routes_need_a_valid_token(client):
    assert client.get("/api/goals").status_code == 401
    assert client.get("/api/auth/me", headers={"Authorization": "Bearer nonsense"}).status_code == 401
    assert client.get("/api/dashboard/stats").status_code == 401


def test_me_and_logout(client, auth):
    me = client.get("/api/auth/me", headers=auth)
    assert me.status_code == 200 and me.get_json()["user"]["name"] == "Alice Tester"
    assert client.post("/api/auth/logout", headers=auth).status_code == 200


def test_update_profile_and_preferences(client, auth):
    response = client.put(
        "/api/auth/me",
        json={"name": "Alice Updated", "preferences": {"daily_focus_minutes": 90, "reminder_days": 5}},
        headers=auth,
    )
    assert response.status_code == 200
    user = response.get_json()["user"]
    assert user["name"] == "Alice Updated"
    assert user["preferences"]["daily_focus_minutes"] == 90
    assert user["preferences"]["reminder_days"] == 5


def test_update_profile_rejects_bad_preferences_and_duplicate_email(client, auth, other_auth):
    bad = client.put("/api/auth/me", json={"preferences": {"reminder_days": 999}}, headers=auth)
    assert bad.status_code == 422
    clash = client.put("/api/auth/me", json={"email": "bob@example.com"}, headers=auth)
    assert clash.status_code == 409


def test_change_password_invalidates_old_token(client, auth):
    wrong = client.put(
        "/api/auth/password", json={"current_password": "nope1234", "new_password": "NewPass456"}, headers=auth
    )
    assert wrong.status_code == 400
    ok = client.put(
        "/api/auth/password", json={"current_password": "Passw0rd123", "new_password": "NewPass456"}, headers=auth
    )
    assert ok.status_code == 200
    assert client.get("/api/auth/me", headers=auth).status_code == 401  # old token revoked
    new_headers = {"Authorization": f"Bearer {ok.get_json()['token']}"}
    assert client.get("/api/auth/me", headers=new_headers).status_code == 200
    login = client.post("/api/auth/login", json={"email": "alice@example.com", "password": "NewPass456"})
    assert login.status_code == 200


def test_demo_mode_creates_labelled_sample_data(client):
    response = client.post("/api/auth/demo")
    assert response.status_code == 201
    body = response.get_json()
    assert body["user"]["is_demo"] is True
    headers = {"Authorization": f"Bearer {body['token']}"}
    goals = client.get("/api/goals", headers=headers).get_json()["goals"]
    assert len(goals) >= 3
    assert all(g["description"].startswith("[Sample data]") for g in goals)
