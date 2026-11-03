"""Dashboard statistics and upcoming-deadline endpoints."""
from collections import Counter
from datetime import date, timedelta

from flask import Blueprint, g, jsonify, request

from models import Goal, Mission
from models.mixins import iso, utcnow
from utils.auth import require_auth

dashboard_bp = Blueprint("dashboard", __name__, url_prefix="/api/dashboard")


def _int_arg(name: str, default: int, low: int, high: int) -> int:
    try:
        value = int(request.args.get(name, default))
    except (TypeError, ValueError):
        return default
    return min(max(value, low), high)


def _recent_activity(goals, missions, limit=10):
    """Build an activity feed from timestamps already stored on goals and missions."""
    titles = {goal.id: goal.title for goal in goals}
    events = []
    for goal in goals:
        events.append(("goal_created", f'Created goal "{goal.title}"', goal.title, goal.created_at))
        if goal.completed_at:
            events.append(("goal_completed", f'Completed goal "{goal.title}"', goal.title, goal.completed_at))
    for mission in missions:
        if mission.completed_at:
            events.append(
                ("mission_completed", f'Completed mission "{mission.title}"',
                 titles.get(mission.goal_id), mission.completed_at)
            )
    events.sort(key=lambda event: event[3], reverse=True)
    return [
        {"type": kind, "message": message, "goal_title": goal_title, "timestamp": iso(when)}
        for kind, message, goal_title, when in events[:limit]
    ]


@dashboard_bp.get("/stats")
@require_auth
def stats():
    user = g.current_user
    goals = Goal.query.filter_by(user_id=user.id).all()
    missions = Mission.query.filter_by(user_id=user.id).all()
    today = date.today()

    total_missions = len(missions)
    completed_missions = sum(1 for m in missions if m.status == "completed")
    overdue_missions = sum(1 for m in missions if m.is_overdue)
    completed_goals = sum(1 for goal in goals if goal.status == "completed")

    # Overall completion = completed missions / all missions.
    # With no missions yet, fall back to completed goals / all goals.
    if total_missions:
        overall = round(completed_missions / total_missions * 100)
    elif goals:
        overall = round(completed_goals / len(goals) * 100)
    else:
        overall = 0

    # Weekly completion chart (last 7 days). The browser passes its UTC offset so
    # that "today" matches the user's own calendar day.
    tz_offset = timedelta(minutes=_int_arg("tz_offset", 0, -840, 840))
    local_today = (utcnow() + tz_offset).date()
    days = [local_today - timedelta(days=offset) for offset in range(6, -1, -1)]
    done_per_day = Counter(
        (m.completed_at + tz_offset).date() for m in missions if m.completed_at
    )
    weekly = [
        {"date": d.isoformat(), "label": d.strftime("%a"), "completed": done_per_day.get(d, 0)}
        for d in days
    ]

    active_goals = [goal for goal in goals if goal.status == "active"]
    upcoming = sorted(
        (m for m in missions if m.status == "pending" and m.due_date and m.due_date >= today),
        key=lambda m: (m.due_date, m.priority != "high"),
    )[:5]

    return jsonify(
        {
            "user_name": user.name,
            "total_goals": len(goals),
            "active_goals": len(active_goals),
            "completed_goals": completed_goals,
            "total_missions": total_missions,
            "completed_missions": completed_missions,
            "pending_missions": total_missions - completed_missions,
            "overdue_missions": overdue_missions,
            "completion_percentage": overall,
            "weekly": weekly,
            "completed_last_7_days": sum(item["completed"] for item in weekly),
            "weekly_target": user.weekly_mission_target,
            "category_breakdown": [
                {"category": name, "count": count}
                for name, count in Counter(goal.category for goal in goals).most_common()
            ],
            "goal_progress": [
                {"id": goal.id, "title": goal.title, "percentage": goal.progress()["percentage"]}
                for goal in sorted(active_goals, key=lambda x: x.created_at, reverse=True)[:8]
            ],
            "upcoming_missions": [m.to_dict() for m in upcoming],
            "recent_activity": _recent_activity(goals, missions),
        }
    )


@dashboard_bp.get("/upcoming")
@require_auth
def upcoming():
    """Overdue and upcoming deadlines for the Calendar page.

    Query: days (1-365, default 30) = how far ahead to look.
    """
    user = g.current_user
    days = _int_arg("days", 30, 1, 365)
    today = date.today()
    horizon = today + timedelta(days=days)

    pending = Mission.query.filter_by(user_id=user.id, status="pending").all()
    with_dates = [m for m in pending if m.due_date]
    overdue = sorted((m for m in with_dates if m.due_date < today), key=lambda m: m.due_date)
    coming = sorted(
        (m for m in with_dates if today <= m.due_date <= horizon),
        key=lambda m: (m.due_date, m.priority != "high"),
    )

    active_goals = Goal.query.filter_by(user_id=user.id, status="active").all()
    goal_deadlines = sorted(
        (goal for goal in active_goals if goal.target_date and goal.target_date <= horizon),
        key=lambda goal: goal.target_date,
    )
    return jsonify(
        {
            "today": today.isoformat(),
            "days": days,
            "reminder_days": user.reminder_days,
            "overdue_missions": [m.to_dict() for m in overdue],
            "upcoming_missions": [m.to_dict() for m in coming],
            "goal_deadlines": [goal.to_dict() for goal in goal_deadlines],
        }
    )
