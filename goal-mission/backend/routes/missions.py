"""Mission CRUD endpoints (nested under goals for create/list, flat for item access)."""
from datetime import date

from flask import Blueprint, g, jsonify, request

from extensions import db
from models import Goal, Mission
from utils.auth import require_auth
from utils.http import api_error, invalid_json, json_body, validation_error
from utils.validators import validate_bulk_missions, validate_mission

missions_bp = Blueprint("missions", __name__, url_prefix="/api")

PRIORITY_RANK = {"high": 0, "medium": 1, "low": 2}


def _owned_goal(goal_id):
    return Goal.query.filter_by(id=goal_id, user_id=g.current_user.id).first()


def _owned_mission(mission_id):
    return Mission.query.filter_by(id=mission_id, user_id=g.current_user.id).first()


def sort_missions(missions, sort: str):
    """Pending missions first, then by the requested ordering.

    sort='due_date' (default): earliest due date, then priority.
    sort='priority'          : high -> low, then earliest due date.
    sort='created'           : newest first.
    """
    far = date.max
    if sort == "created":
        return sorted(missions, key=lambda m: m.created_at, reverse=True)
    status_rank = lambda m: 0 if m.status == "pending" else 1  # noqa: E731
    if sort == "priority":
        return sorted(missions, key=lambda m: (status_rank(m), PRIORITY_RANK[m.priority], m.due_date or far))
    return sorted(missions, key=lambda m: (status_rank(m), m.due_date or far, PRIORITY_RANK[m.priority]))


def _with_progress(mission):
    return {"mission": mission.to_dict(), "goal_progress": mission.goal.progress()}


@missions_bp.get("/goals/<int:goal_id>/missions")
@require_auth
def list_goal_missions(goal_id):
    goal = _owned_goal(goal_id)
    if goal is None:
        return api_error("Goal not found.", 404, "not_found")
    missions = sort_missions(goal.missions, request.args.get("sort", "due_date"))
    return jsonify({"missions": [m.to_dict() for m in missions], "progress": goal.progress()})


@missions_bp.post("/goals/<int:goal_id>/missions")
@require_auth
def create_mission(goal_id):
    goal = _owned_goal(goal_id)
    if goal is None:
        return api_error("Goal not found.", 404, "not_found")
    data = json_body()
    if data is None:
        return invalid_json()
    clean, errors = validate_mission(data)
    if errors:
        return validation_error(errors)
    status = clean.pop("status", "pending")
    mission = Mission(goal_id=goal.id, user_id=g.current_user.id, **clean)
    mission.set_status(status)
    db.session.add(mission)
    db.session.commit()
    return jsonify(_with_progress(mission)), 201


@missions_bp.post("/goals/<int:goal_id>/missions/bulk")
@require_auth
def create_missions_bulk(goal_id):
    """Save several missions at once (used for reviewed AI plans). All-or-nothing."""
    goal = _owned_goal(goal_id)
    if goal is None:
        return api_error("Goal not found.", 404, "not_found")
    data = json_body()
    if data is None:
        return invalid_json()
    cleaned, errors = validate_bulk_missions(data)
    if errors:
        return validation_error(errors)
    ai_generated = data.get("ai_generated") is True
    created = []
    for clean in cleaned:
        status = clean.pop("status", "pending")
        mission = Mission(goal_id=goal.id, user_id=g.current_user.id, ai_generated=ai_generated, **clean)
        mission.set_status(status)
        db.session.add(mission)
        created.append(mission)
    db.session.commit()
    return jsonify({"missions": [m.to_dict() for m in created], "goal_progress": goal.progress()}), 201


@missions_bp.get("/missions")
@require_auth
def list_missions():
    """All of the user's missions with optional filters: status, priority, goal_id, overdue."""
    query = Mission.query.filter_by(user_id=g.current_user.id)
    status = request.args.get("status", "").lower()
    if status in ("pending", "completed"):
        query = query.filter(Mission.status == status)
    priority = request.args.get("priority", "").lower()
    if priority in PRIORITY_RANK:
        query = query.filter(Mission.priority == priority)
    goal_id = request.args.get("goal_id")
    if goal_id:
        if not goal_id.isdigit():
            return api_error("goal_id must be an integer.", 400, "bad_filter")
        query = query.filter(Mission.goal_id == int(goal_id))
    missions = sort_missions(query.all(), request.args.get("sort", "due_date"))
    if request.args.get("overdue") in ("1", "true"):
        missions = [m for m in missions if m.is_overdue]
    return jsonify({"missions": [m.to_dict() for m in missions]})


@missions_bp.get("/missions/<int:mission_id>")
@require_auth
def get_mission(mission_id):
    mission = _owned_mission(mission_id)
    if mission is None:
        return api_error("Mission not found.", 404, "not_found")
    return jsonify(_with_progress(mission))


@missions_bp.put("/missions/<int:mission_id>")
@require_auth
def update_mission(mission_id):
    mission = _owned_mission(mission_id)
    if mission is None:
        return api_error("Mission not found.", 404, "not_found")
    data = json_body()
    if data is None:
        return invalid_json()
    clean, errors = validate_mission(data, partial=True)
    if errors:
        return validation_error(errors)
    status = clean.pop("status", None)
    for field, value in clean.items():
        setattr(mission, field, value)
    if status:
        mission.set_status(status)
    db.session.commit()
    return jsonify(_with_progress(mission))


@missions_bp.post("/missions/<int:mission_id>/toggle")
@require_auth
def toggle_mission(mission_id):
    """Flip a mission between pending and completed."""
    mission = _owned_mission(mission_id)
    if mission is None:
        return api_error("Mission not found.", 404, "not_found")
    mission.set_status("pending" if mission.status == "completed" else "completed")
    db.session.commit()
    return jsonify(_with_progress(mission))


@missions_bp.delete("/missions/<int:mission_id>")
@require_auth
def delete_mission(mission_id):
    mission = _owned_mission(mission_id)
    if mission is None:
        return api_error("Mission not found.", 404, "not_found")
    goal = mission.goal
    db.session.delete(mission)
    db.session.commit()
    db.session.refresh(goal)
    return jsonify({"message": "Mission deleted.", "goal_progress": goal.progress()})
