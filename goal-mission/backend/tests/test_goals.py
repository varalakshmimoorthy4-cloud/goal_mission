"""Goal CRUD, filtering, progress and user-isolation tests."""
from datetime import date, timedelta


def future(days=10):
    return (date.today() + timedelta(days=days)).isoformat()


def test_create_goal_defaults_and_validation(client, auth):
    ok = client.post("/api/goals", json={"title": "  Read a book  "}, headers=auth)
    assert ok.status_code == 201
    goal = ok.get_json()["goal"]
    assert goal["title"] == "Read a book"
    assert goal["priority"] == "medium" and goal["category"] == "Other" and goal["status"] == "active"
    assert goal["progress"]["percentage"] == 0

    bad = client.post(
        "/api/goals",
        json={"title": "", "priority": "urgent", "category": "Cooking", "target_date": "2001-01-01"},
        headers=auth,
    )
    assert bad.status_code == 422
    assert {"title", "priority", "category", "target_date"} <= set(bad.get_json()["error"]["details"])


def test_get_update_delete_goal(client, auth, goal):
    gid = goal["id"]
    assert client.get(f"/api/goals/{gid}", headers=auth).status_code == 200

    updated = client.put(f"/api/goals/{gid}", json={"title": "Master Flask", "priority": "low"}, headers=auth)
    assert updated.status_code == 200
    assert updated.get_json()["goal"]["title"] == "Master Flask"
    assert updated.get_json()["goal"]["category"] == "Learning"  # untouched fields stay

    assert client.delete(f"/api/goals/{gid}", headers=auth).status_code == 200
    assert client.get(f"/api/goals/{gid}", headers=auth).status_code == 404


def test_delete_goal_removes_its_missions(client, auth, goal):
    client.post(f"/api/goals/{goal['id']}/missions", json={"title": "Step 1"}, headers=auth)
    client.delete(f"/api/goals/{goal['id']}", headers=auth)
    assert client.get("/api/missions", headers=auth).get_json()["missions"] == []


def test_complete_and_reopen_goal(client, auth, goal):
    done = client.post(f"/api/goals/{goal['id']}/complete", headers=auth).get_json()["goal"]
    assert done["status"] == "completed" and done["completed_at"]
    reopened = client.post(f"/api/goals/{goal['id']}/complete", json={"completed": False}, headers=auth)
    assert reopened.get_json()["goal"]["status"] == "active"


def test_search_and_filters(client, auth):
    client.post("/api/goals", json={"title": "Run a 5K", "category": "Fitness", "priority": "high"}, headers=auth)
    client.post("/api/goals", json={"title": "Study calculus", "category": "Academic", "priority": "low"}, headers=auth)
    done = client.post("/api/goals", json={"title": "Fix resume", "category": "Career"}, headers=auth).get_json()["goal"]
    client.post(f"/api/goals/{done['id']}/complete", headers=auth)

    def titles(query):
        return sorted(g["title"] for g in client.get(f"/api/goals?{query}", headers=auth).get_json()["goals"])

    assert titles("search=5k") == ["Run a 5K"]
    assert titles("category=academic") == ["Study calculus"]
    assert titles("priority=high") == ["Run a 5K"]
    assert titles("status=completed") == ["Fix resume"]
    assert len(titles("status=active")) == 2
    assert titles("search=%25") == []  # '%' is matched literally, not as a wildcard
    assert client.get("/api/goals?category=Nope", headers=auth).status_code == 400


def test_progress_is_calculated_from_missions(client, auth, goal):
    gid = goal["id"]
    ids = [
        client.post(f"/api/goals/{gid}/missions", json={"title": f"M{i}", "due_date": future()}, headers=auth)
        .get_json()["mission"]["id"]
        for i in range(4)
    ]
    client.post(f"/api/missions/{ids[0]}/toggle", headers=auth)
    progress = client.get(f"/api/goals/{gid}/progress", headers=auth).get_json()["progress"]
    assert progress["total_missions"] == 4
    assert progress["completed_missions"] == 1
    assert progress["percentage"] == 25
    client.post(f"/api/missions/{ids[1]}/toggle", headers=auth)
    assert client.get(f"/api/goals/{gid}", headers=auth).get_json()["goal"]["progress"]["percentage"] == 50


def test_users_cannot_access_each_others_goals(client, auth, other_auth, goal):
    gid = goal["id"]
    assert client.get(f"/api/goals/{gid}", headers=other_auth).status_code == 404
    assert client.put(f"/api/goals/{gid}", json={"title": "Hacked"}, headers=other_auth).status_code == 404
    assert client.delete(f"/api/goals/{gid}", headers=other_auth).status_code == 404
    assert client.post(f"/api/goals/{gid}/complete", headers=other_auth).status_code == 404
    assert client.get(f"/api/goals/{gid}/progress", headers=other_auth).status_code == 404
    assert client.get("/api/goals", headers=other_auth).get_json()["goals"] == []
    # ...and the owner's goal is untouched
    assert client.get(f"/api/goals/{gid}", headers=auth).get_json()["goal"]["title"] == "Learn Flask"
