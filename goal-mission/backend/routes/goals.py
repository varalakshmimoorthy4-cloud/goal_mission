"""Goal CRUD, completion and progress endpoints. Every query is scoped to the current user."""
from datetime import date

from flask import Blueprint, g, jsonify, request
from sqlalchemy import or_

from extensions import db
from models import Goal
from models.mixins import utcnow
from utils.auth import require_auth
from utils.http import api_error, invalid_json, json_body, validation_error
from utils.validators import CATEGORIES, PRIORITIES, validate_goal

goals_bp = Blueprint("goals", __name__, url_prefix="/api/goals")

PRIORITY_RANK = {"high": 0, "medium": 1, "low": 2}


def get_owned_goal(goal_id: int):
    """Return the goal only if it belongs to the logged-in user (else None -> 404)."""
    return Goal.query.filter_by(id=goal_id, user_id=g.current_user.id).first()


def not_found():
    return api_error("Goal not found.", 404, "not_found")


def _escape_like(text: str) -> str:
    return text.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


@goals_bp.get("")
@require_auth
def list_goals():
    query = Goal.query.filter_by(user_id=g.current_user.id)

    status = request.args.get("status", "all").lower()
    if status in ("active", "completed"):
        query = query.filter(Goal.status == status)

    category = request.args.get("category", "").strip()
    if category:
        match = next((c for c in CATEGORIES if c.lower() == category.lower()), None)
        if match is None:
            return api_error("Unknown category filter.", 400, "bad_filter")
        query = query.filter(Goal.category == match)

    priority = request.args.get("priority", "").strip().lower()
    if priority:
        if priority not in PRIORITIES:
            return api_error("Unknown priority filter.", 400, "bad_filter")
        query = query.filter(Goal.priority == priority)

    search = request.args.get("search", "").strip()[:100]
    if search:
        pattern = f"%{_escape_like(search)}%"
        query = query.filter(
            or_(Goal.title.ilike(pattern, escape="\\"), Goal.description.ilike(pattern, escape="\\"))
        )

    goals = query.all()
    sort = request.args.get("sort", "created")
    if sort == "target_date":
        goals.sort(key=lambda goal: (goal.target_date or date.max, PRIORITY_RANK[goal.priority]))
    elif sort == "priority":
        goals.sort(key=lambda goal: (PRIORITY_RANK[goal.priority], goal.target_date or date.max))
    elif sort == "progress":
        goals.sort(key=lambda goal: goal.progress()["percentage"], reverse=True)
    else:
        goals.sort(key=lambda goal: goal.created_at, reverse=True)
    return jsonify({"goals": [goal.to_dict() for goal in goals]})


@goals_bp.post("")
@require_auth
def create_goal():
    data = json_body()
    if data is None:
        return invalid_json()
    clean, errors = validate_goal(data, is_create=True)
    if errors:
        return validation_error(errors)
    goal = Goal(user_id=g.current_user.id, **clean)
    db.session.add(goal)
    db.session.commit()
    return jsonify({"goal": goal.to_dict(include_missions=True)}), 201


@goals_bp.get("/<int:goal_id>")
@require_auth
def get_goal(goal_id):
    goal = get_owned_goal(goal_id)
    if goal is None:
        return not_found()
    return jsonify({"goal": goal.to_dict(include_missions=True)})


@goals_bp.put("/<int:goal_id>")
@require_auth
def update_goal(goal_id):
    goal = get_owned_goal(goal_id)
    if goal is None:
        return not_found()
    data = json_body()
    if data is None:
        return invalid_json()
    clean, errors = validate_goal(data, partial=True)
    if errors:
        return validation_error(errors)
    for field, value in clean.items():
        setattr(goal, field, value)
    db.session.commit()
    return jsonify({"goal": goal.to_dict(include_missions=True)})


@goals_bp.delete("/<int:goal_id>")
@require_auth
def delete_goal(goal_id):
    goal = get_owned_goal(goal_id)
    if goal is None:
        return not_found()
    db.session.delete(goal)  # missions are removed by the ORM cascade
    db.session.commit()
    return jsonify({"message": "Goal deleted."})


@goals_bp.post("/<int:goal_id>/complete")
@require_auth
def complete_goal(goal_id):
    """Mark a goal completed (default) or re-open it with {"completed": false}."""
    goal = get_owned_goal(goal_id)
    if goal is None:
        return not_found()
    data = json_body() or {}
    completed = data.get("completed", True)
    if not isinstance(completed, bool):
        return validation_error({"completed": "completed must be true or false."})
    goal.status = "completed" if completed else "active"
    goal.completed_at = utcnow() if completed else None
    db.session.commit()
    return jsonify({"goal": goal.to_dict(include_missions=True)})


@goals_bp.get("/<int:goal_id>/progress")
@require_auth
def goal_progress(goal_id):
    goal = get_owned_goal(goal_id)
    if goal is None:
        return not_found()
    pending = [m for m in goal.missions if m.status == "pending"]
    next_due = min((m.due_date for m in pending if m.due_date), default=None)
    return jsonify(
        {
            "goal_id": goal.id,
            "title": goal.title,
            "status": goal.status,
            "progress": goal.progress(),
            "next_due_date": next_due.isoformat() if next_due else None,
            "estimated_minutes_remaining": sum(m.estimated_minutes or 0 for m in pending),
        }
    )
