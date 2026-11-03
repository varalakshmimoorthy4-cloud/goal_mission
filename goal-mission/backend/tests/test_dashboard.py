"""Dashboard statistics and upcoming deadline tests."""
from datetime import date, timedelta


def day(offset):
    return (date.today() + timedelta(days=offset)).isoformat()


def test_empty_dashboard(client, auth):
    stats = client.get("/api/dashboard/stats", headers=auth).get_json()
    assert stats["total_goals"] == 0 and stats["completion_percentage"] == 0
    assert len(stats["weekly"]) == 7
    assert stats["upcoming_missions"] == [] and stats["recent_activity"] == []


def test_dashboard_numbers(client, auth, goal):
    gid = goal["id"]
    ids = [
        client.post(f"/api/goals/{gid}/missions", json={"title": f"M{i}", "due_date": day(i - 1)}, headers=auth)
        .get_json()["mission"]["id"]
        for i in range(4)
    ]
    client.post(f"/api/missions/{ids[1]}/toggle", headers=auth)
    done_goal = client.post("/api/goals", json={"title": "Finished"}, headers=auth).get_json()["goal"]
    client.post(f"/api/goals/{done_goal['id']}/complete", headers=auth)

    stats = client.get("/api/dashboard/stats", headers=auth).get_json()
    assert stats["total_goals"] == 2 and stats["active_goals"] == 1 and stats["completed_goals"] == 1
    assert stats["total_missions"] == 4 and stats["completed_missions"] == 1
    assert stats["completion_percentage"] == 25
    assert stats["overdue_missions"] == 1  # M0 is due yesterday and still pending
    assert stats["weekly"][-1]["completed"] == 1  # completed today
    assert stats["completed_last_7_days"] == 1
    assert [m["title"] for m in stats["upcoming_missions"]][0] == "M2"  # soonest pending, not overdue
    assert any(item["type"] == "mission_completed" for item in stats["recent_activity"])


def test_upcoming_separates_overdue_and_future(client, auth, goal):
    gid = goal["id"]
    for title, offset in [("old", -3), ("soon", 2), ("far", 90)]:
        client.post(f"/api/goals/{gid}/missions", json={"title": title, "due_date": day(offset)}, headers=auth)
    body = client.get("/api/dashboard/upcoming?days=30", headers=auth).get_json()
    assert [m["title"] for m in body["overdue_missions"]] == ["old"]
    assert [m["title"] for m in body["upcoming_missions"]] == ["soon"]
    assert body["goal_deadlines"][0]["id"] == gid


def test_dashboard_is_isolated_per_user(client, auth, other_auth, goal):
    stats = client.get("/api/dashboard/stats", headers=other_auth).get_json()
    assert stats["total_goals"] == 0
