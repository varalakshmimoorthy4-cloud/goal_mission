"""Mission CRUD, sorting, overdue detection and isolation tests."""
from datetime import date, timedelta


def day(offset):
    return (date.today() + timedelta(days=offset)).isoformat()


def add(client, auth, goal_id, **fields):
    response = client.post(f"/api/goals/{goal_id}/missions", json=fields, headers=auth)
    assert response.status_code == 201, response.get_json()
    return response.get_json()["mission"]


def test_create_mission_and_validation(client, auth, goal):
    mission = add(client, auth, goal["id"], title="Write outline", priority="high", due_date=day(3), estimated_minutes=45)
    assert mission["status"] == "pending" and mission["estimated_minutes"] == 45
    assert mission["goal_title"] == "Learn Flask"

    bad = client.post(
        f"/api/goals/{goal['id']}/missions",
        json={"title": "", "priority": "urgent", "due_date": "tomorrow", "estimated_minutes": 0},
        headers=auth,
    )
    assert bad.status_code == 422
    assert {"title", "priority", "due_date", "estimated_minutes"} <= set(bad.get_json()["error"]["details"])


def test_update_toggle_and_delete_mission(client, auth, goal):
    mission = add(client, auth, goal["id"], title="Draft")
    mid = mission["id"]

    updated = client.put(f"/api/missions/{mid}", json={"title": "Draft v2", "priority": "low"}, headers=auth)
    assert updated.get_json()["mission"]["title"] == "Draft v2"

    toggled = client.post(f"/api/missions/{mid}/toggle", headers=auth).get_json()
    assert toggled["mission"]["status"] == "completed" and toggled["mission"]["completed_at"]
    assert toggled["goal_progress"]["percentage"] == 100
    back = client.post(f"/api/missions/{mid}/toggle", headers=auth).get_json()
    assert back["mission"]["status"] == "pending" and back["mission"]["completed_at"] is None

    deleted = client.delete(f"/api/missions/{mid}", headers=auth)
    assert deleted.status_code == 200 and deleted.get_json()["goal_progress"]["total_missions"] == 0
    assert client.get(f"/api/missions/{mid}", headers=auth).status_code == 404


def test_overdue_detection(client, auth, goal):
    late = add(client, auth, goal["id"], title="Late one", due_date=day(-2))
    add(client, auth, goal["id"], title="On time", due_date=day(2))
    assert late["is_overdue"] is True
    overdue = client.get("/api/missions?overdue=1", headers=auth).get_json()["missions"]
    assert [m["title"] for m in overdue] == ["Late one"]
    # Completing it clears the overdue flag
    done = client.post(f"/api/missions/{late['id']}/toggle", headers=auth).get_json()["mission"]
    assert done["is_overdue"] is False


def test_sorting_by_priority_and_due_date(client, auth, goal):
    gid = goal["id"]
    add(client, auth, gid, title="low-soon", priority="low", due_date=day(1))
    add(client, auth, gid, title="high-late", priority="high", due_date=day(9))
    add(client, auth, gid, title="medium-mid", priority="medium", due_date=day(5))
    add(client, auth, gid, title="no-date", priority="high")

    def order(sort):
        data = client.get(f"/api/goals/{gid}/missions?sort={sort}", headers=auth).get_json()
        return [m["title"] for m in data["missions"]]

    assert order("due_date") == ["low-soon", "medium-mid", "high-late", "no-date"]
    assert order("priority") == ["high-late", "no-date", "medium-mid", "low-soon"]


def test_completed_missions_sort_after_pending(client, auth, goal):
    first = add(client, auth, goal["id"], title="first", due_date=day(1))
    add(client, auth, goal["id"], title="second", due_date=day(2))
    client.post(f"/api/missions/{first['id']}/toggle", headers=auth)
    data = client.get(f"/api/goals/{goal['id']}/missions", headers=auth).get_json()
    assert [m["title"] for m in data["missions"]] == ["second", "first"]


def test_bulk_create_is_all_or_nothing(client, auth, goal):
    gid = goal["id"]
    good = client.post(
        f"/api/goals/{gid}/missions/bulk",
        json={"ai_generated": True, "missions": [{"title": "A", "due_date": day(1)}, {"title": "B", "priority": "high"}]},
        headers=auth,
    )
    assert good.status_code == 201
    assert len(good.get_json()["missions"]) == 2
    assert all(m["ai_generated"] for m in good.get_json()["missions"])

    bad = client.post(
        f"/api/goals/{gid}/missions/bulk",
        json={"missions": [{"title": "Fine"}, {"title": ""}]},
        headers=auth,
    )
    assert bad.status_code == 422
    assert len(client.get(f"/api/goals/{gid}/missions", headers=auth).get_json()["missions"]) == 2


def test_users_cannot_touch_each_others_missions(client, auth, other_auth, goal):
    mission = add(client, auth, goal["id"], title="Private")
    mid = mission["id"]
    assert client.get(f"/api/missions/{mid}", headers=other_auth).status_code == 404
    assert client.put(f"/api/missions/{mid}", json={"title": "x"}, headers=other_auth).status_code == 404
    assert client.post(f"/api/missions/{mid}/toggle", headers=other_auth).status_code == 404
    assert client.delete(f"/api/missions/{mid}", headers=other_auth).status_code == 404
    assert client.get(f"/api/goals/{goal['id']}/missions", headers=other_auth).status_code == 404
    assert client.post(f"/api/goals/{goal['id']}/missions", json={"title": "Sneaky"}, headers=other_auth).status_code == 404
    assert client.get("/api/missions", headers=other_auth).get_json()["missions"] == []
