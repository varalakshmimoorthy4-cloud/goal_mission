"""Consistent JSON error responses.

Every error returned by the API has this shape:
    {"error": {"code": "...", "message": "...", "details": {field: message}}}
"""
from flask import jsonify, request


def api_error(message: str, status: int = 400, code: str = "bad_request", details=None):
    body = {"error": {"code": code, "message": message}}
    if details:
        body["error"]["details"] = details
    return jsonify(body), status


def validation_error(errors: dict):
    return api_error("Please correct the highlighted fields.", 422, "validation_error", errors)


def invalid_json():
    return api_error("Request body must be a JSON object.", 400, "invalid_json")


def json_body():
    """Return the request JSON as a dict, or None if it is missing/invalid."""
    data = request.get_json(silent=True)
    return data if isinstance(data, dict) else None
