"""Input validation. Every validator returns (clean_data, errors).

`errors` maps field name -> message; an empty dict means the input is valid.
"""
import re
from datetime import date

CATEGORIES = ["Academic", "Career", "Learning", "Fitness", "Personal", "Finance", "Other"]
PRIORITIES = ["low", "medium", "high"]
MISSION_STATUSES = ["pending", "completed"]
SKILL_LEVELS = ["beginner", "intermediate", "advanced"]

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

MAX_BULK_MISSIONS = 30


# ---------------------------------------------------------------- primitives
def clean_text(value, max_len=None):
    """Strip a string and optionally truncate it. Non-strings return ''."""
    if not isinstance(value, str):
        return ""
    value = value.strip()
    return value[:max_len] if max_len else value


def parse_date(value):
    """Parse 'YYYY-MM-DD' to a date. Raises ValueError for anything else."""
    if isinstance(value, date):
        return value
    if not isinstance(value, str):
        raise ValueError("Date must be a string in YYYY-MM-DD format.")
    return date.fromisoformat(value.strip())


def parse_int(value):
    """Strict integer parsing (rejects booleans and non-numeric text)."""
    if isinstance(value, bool):
        raise ValueError("Not an integer.")
    if isinstance(value, int):
        return value
    if isinstance(value, float) and value.is_integer():
        return int(value)
    if isinstance(value, str) and re.fullmatch(r"-?\d+", value.strip()):
        return int(value.strip())
    raise ValueError("Not an integer.")


def parse_number(value):
    if isinstance(value, bool):
        raise ValueError("Not a number.")
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        return float(value.strip())
    raise ValueError("Not a number.")


def password_problem(password):
    """Return a message if the password is too weak, else None."""
    if not isinstance(password, str) or len(password) < 8:
        return "Password must be at least 8 characters long."
    if len(password) > 128:
        return "Password must be at most 128 characters long."
    if not re.search(r"[A-Za-z]", password) or not re.search(r"\d", password):
        return "Password must contain at least one letter and one number."
    return None


def _validate_name(value, errors):
    name = clean_text(value, 80)
    if len(name) < 2:
        errors["name"] = "Name must be at least 2 characters long."
    return name


def _validate_email(value, errors):
    email = clean_text(value, 254).lower()
    if not EMAIL_RE.match(email):
        errors["email"] = "Enter a valid email address."
    return email


# --------------------------------------------------------------- auth / user
def validate_registration(data):
    errors = {}
    clean = {
        "name": _validate_name(data.get("name"), errors),
        "email": _validate_email(data.get("email"), errors),
        "password": data.get("password"),
    }
    problem = password_problem(clean["password"])
    if problem:
        errors["password"] = problem
    return clean, errors


def validate_login(data):
    errors = {}
    email = clean_text(data.get("email"), 254).lower()
    password = data.get("password")
    if not email:
        errors["email"] = "Email is required."
    if not isinstance(password, str) or not password:
        errors["password"] = "Password is required."
    return {"email": email, "password": password}, errors


def validate_profile_update(data):
    """Partial update of name, email and productivity preferences."""
    errors, clean = {}, {}
    if "name" in data:
        clean["name"] = _validate_name(data["name"], errors)
    if "email" in data:
        clean["email"] = _validate_email(data["email"], errors)

    prefs = data.get("preferences")
    if prefs is not None and not isinstance(prefs, dict):
        errors["preferences"] = "Preferences must be an object."
        prefs = {}
    ranges = {
        "daily_focus_minutes": (15, 960, "Daily focus time must be between 15 and 960 minutes."),
        "reminder_days": (0, 30, "Reminder window must be between 0 and 30 days."),
        "weekly_mission_target": (1, 100, "Weekly mission target must be between 1 and 100."),
    }
    for key, (low, high, message) in ranges.items():
        if prefs and key in prefs:
            try:
                number = parse_int(prefs[key])
            except ValueError:
                errors[key] = message
                continue
            if not low <= number <= high:
                errors[key] = message
            else:
                clean[key] = number
    return clean, errors


def validate_password_change(data):
    errors = {}
    current = data.get("current_password")
    new = data.get("new_password")
    if not isinstance(current, str) or not current:
        errors["current_password"] = "Current password is required."
    problem = password_problem(new)
    if problem:
        errors["new_password"] = problem
    elif isinstance(current, str) and current == new:
        errors["new_password"] = "New password must be different from the current password."
    return {"current_password": current, "new_password": new}, errors


# -------------------------------------------------------------------- goals
def _validate_optional_date(data, key, errors, clean, label, must_be_future=False):
    raw = data.get(key)
    if raw in (None, ""):
        clean[key] = None
        return
    try:
        parsed = parse_date(raw)
    except ValueError:
        errors[key] = f"{label} must be a valid date (YYYY-MM-DD)."
        return
    if must_be_future and parsed < date.today():
        errors[key] = f"{label} cannot be in the past."
        return
    clean[key] = parsed


def _validate_choice(value, allowed, label, errors, key, normalise_case=False):
    text = clean_text(value)
    if normalise_case:
        match = next((a for a in allowed if a.lower() == text.lower()), None)
    else:
        match = text.lower() if text.lower() in allowed else None
    if match is None:
        errors[key] = f"{label} must be one of: {', '.join(allowed)}."
    return match


def validate_goal(data, partial=False, is_create=False):
    errors, clean = {}, {}

    if "title" in data or not partial:
        title = clean_text(data.get("title"), 200)
        if not title:
            errors["title"] = "Title is required."
        elif len(clean_text(data.get("title"))) > 200:
            errors["title"] = "Title must be at most 200 characters."
        else:
            clean["title"] = title

    if "description" in data or not partial:
        raw = data.get("description") or ""
        if not isinstance(raw, str) or len(raw.strip()) > 2000:
            errors["description"] = "Description must be text of at most 2000 characters."
        else:
            clean["description"] = raw.strip()

    if "category" in data or not partial:
        raw = data.get("category") or "Other"
        match = _validate_choice(raw, CATEGORIES, "Category", errors, "category", True)
        if match:
            clean["category"] = match

    if "priority" in data or not partial:
        raw = data.get("priority") or "medium"
        match = _validate_choice(raw, PRIORITIES, "Priority", errors, "priority")
        if match:
            clean["priority"] = match

    if "target_date" in data or not partial:
        _validate_optional_date(data, "target_date", errors, clean, "Target date", must_be_future=is_create)

    return clean, errors


# ----------------------------------------------------------------- missions
def validate_mission(data, partial=False):
    errors, clean = {}, {}

    if "title" in data or not partial:
        title = clean_text(data.get("title"), 200)
        if not title:
            errors["title"] = "Title is required."
        elif len(clean_text(data.get("title"))) > 200:
            errors["title"] = "Title must be at most 200 characters."
        else:
            clean["title"] = title

    if "description" in data or not partial:
        raw = data.get("description") or ""
        if not isinstance(raw, str) or len(raw.strip()) > 2000:
            errors["description"] = "Description must be text of at most 2000 characters."
        else:
            clean["description"] = raw.strip()

    if "priority" in data or not partial:
        raw = data.get("priority") or "medium"
        match = _validate_choice(raw, PRIORITIES, "Priority", errors, "priority")
        if match:
            clean["priority"] = match

    if "due_date" in data or not partial:
        _validate_optional_date(data, "due_date", errors, clean, "Due date")

    if "estimated_minutes" in data or not partial:
        raw = data.get("estimated_minutes")
        if raw in (None, ""):
            clean["estimated_minutes"] = None
        else:
            try:
                minutes = parse_int(raw)
            except ValueError:
                minutes = None
            if minutes is None or not 1 <= minutes <= 1440:
                errors["estimated_minutes"] = "Estimated time must be between 1 and 1440 minutes."
            else:
                clean["estimated_minutes"] = minutes

    if "status" in data:
        match = _validate_choice(data.get("status"), MISSION_STATUSES, "Status", errors, "status")
        if match:
            clean["status"] = match

    return clean, errors


def validate_bulk_missions(data):
    """Validate {'missions': [...]} used when saving an AI plan."""
    items = data.get("missions")
    if not isinstance(items, list) or not items:
        return [], {"missions": "Provide a non-empty list of missions."}
    if len(items) > MAX_BULK_MISSIONS:
        return [], {"missions": f"You can save at most {MAX_BULK_MISSIONS} missions at once."}
    cleaned, errors = [], {}
    for index, item in enumerate(items):
        if not isinstance(item, dict):
            errors[f"missions[{index}]"] = "Each mission must be an object."
            continue
        clean, item_errors = validate_mission(item)
        for key, message in item_errors.items():
            errors[f"missions[{index}].{key}"] = message
        cleaned.append(clean)
    return cleaned, errors


# ----------------------------------------------------------------------- AI
def validate_plan_request(data):
    errors, clean = {}, {}

    goal = clean_text(data.get("goal"), 200)
    if not goal:
        errors["goal"] = "Describe the goal you want a plan for."
    elif len(clean_text(data.get("goal"))) > 200:
        errors["goal"] = "Goal must be at most 200 characters."
    clean["goal"] = goal

    try:
        hours = parse_number(data.get("hours_per_week"))
        if not 0.5 <= hours <= 100:
            raise ValueError
        clean["hours_per_week"] = round(hours, 1)
    except (ValueError, TypeError):
        errors["hours_per_week"] = "Available time must be between 0.5 and 100 hours per week."

    level = clean_text(data.get("skill_level") or "beginner").lower()
    if level not in SKILL_LEVELS:
        errors["skill_level"] = f"Skill level must be one of: {', '.join(SKILL_LEVELS)}."
    clean["skill_level"] = level

    try:
        deadline = parse_date(data.get("deadline"))
        if deadline < date.today():
            errors["deadline"] = "Deadline cannot be in the past."
        clean["deadline"] = deadline
    except (ValueError, TypeError):
        errors["deadline"] = "Deadline must be a valid date (YYYY-MM-DD)."

    notes = data.get("notes") or ""
    if not isinstance(notes, str) or len(notes.strip()) > 500:
        errors["notes"] = "Notes must be text of at most 500 characters."
    clean["notes"] = notes.strip() if isinstance(notes, str) else ""
    return clean, errors


def validate_chat_message(data):
    errors, clean = {}, {}
    message = clean_text(data.get("message"))
    if not message:
        errors["message"] = "Type a message first."
    elif len(message) > 2000:
        errors["message"] = "Message must be at most 2000 characters."
    clean["message"] = message

    goal_id = data.get("goal_id")
    if goal_id in (None, ""):
        clean["goal_id"] = None
    else:
        try:
            clean["goal_id"] = parse_int(goal_id)
        except ValueError:
            errors["goal_id"] = "goal_id must be an integer."
    return clean, errors
