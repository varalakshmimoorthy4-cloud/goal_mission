# API Documentation

Base URL: `http://127.0.0.1:5000/api` (the frontend calls `/api/...` through the Vite proxy).
Format: JSON. Private endpoints need `Authorization: Bearer <token>` (token returned by register/login/demo).

## Errors
Every error has the same shape:
```json
{"error": {"code": "validation_error", "message": "Please correct the highlighted fields.", "details": {"title": "Title is required."}}}
```
| Status | Meaning |
|---|---|
| 400 | Malformed request / bad filter / wrong current password |
| 401 | Missing, invalid or expired token; bad login |
| 404 | Not found **or not owned by you** |
| 409 | Email already registered |
| 422 | Validation failed (`details` maps field -> message) |
| 429 | Rate limited (login failures, AI calls, demo sessions) |
| 500 | Unexpected server error |

## Authentication
| Method | Path | Body | Success |
|---|---|---|---|
| POST | `/auth/register` | `name, email, password` (min 8 chars, letter + number) | 201 `{user, token}` |
| POST | `/auth/login` | `email, password` | 200 `{user, token}` |
| POST | `/auth/logout` | - | 200 `{message}` |
| POST | `/auth/demo` | - | 201 `{user, token}` (temporary account with sample data) |
| GET | `/auth/me` | - | 200 `{user}` |
| PUT | `/auth/me` | `name?, email?, preferences?{daily_focus_minutes, reminder_days, weekly_mission_target}` | 200 `{user}` |
| PUT | `/auth/password` | `current_password, new_password` | 200 `{message, token}` (old tokens stop working) |

## Goals (private)
| Method | Path | Notes |
|---|---|---|
| GET | `/goals` | Query: `status` (all/active/completed), `category`, `priority`, `search`, `sort` (created/target_date/priority/progress) -> `{goals}` |
| POST | `/goals` | Body: `title`*, `description`, `category`, `priority`, `target_date` (not in the past) -> 201 `{goal}` |
| GET | `/goals/{id}` | `{goal}` including `missions` |
| PUT | `/goals/{id}` | Partial update -> `{goal}` |
| DELETE | `/goals/{id}` | Deletes the goal and its missions |
| POST | `/goals/{id}/complete` | Body `{"completed": true|false}` (default true) -> `{goal}` |
| GET | `/goals/{id}/progress` | `{progress{total,completed,pending,overdue,percentage}, next_due_date, estimated_minutes_remaining}` |

## Missions (private)
| Method | Path | Notes |
|---|---|---|
| GET | `/goals/{goalId}/missions` | Query `sort` = due_date (default) / priority / created -> `{missions, progress}` |
| POST | `/goals/{goalId}/missions` | Body: `title`*, `description`, `priority`, `due_date`, `estimated_minutes` (1-1440) -> 201 `{mission, goal_progress}` |
| POST | `/goals/{goalId}/missions/bulk` | Body: `{missions:[...], ai_generated}` (max 30, all-or-nothing) -> 201 |
| GET | `/missions` | Query: `status`, `priority`, `goal_id`, `overdue=1`, `sort` -> `{missions}` |
| GET | `/missions/{id}` | `{mission, goal_progress}` |
| PUT | `/missions/{id}` | Partial update (may include `status`: pending/completed) |
| POST | `/missions/{id}/toggle` | Flip pending/completed |
| DELETE | `/missions/{id}` | `{message, goal_progress}` |

## Dashboard (private)
| Method | Path | Notes |
|---|---|---|
| GET | `/dashboard/stats` | Query `tz_offset` (minutes from UTC). Returns totals, `completion_percentage`, `weekly[7]`, `goal_progress`, `category_breakdown`, `upcoming_missions`, `recent_activity` |
| GET | `/dashboard/upcoming` | Query `days` (1-365, default 30). Returns `overdue_missions`, `upcoming_missions`, `goal_deadlines`, `reminder_days` |

## AI (private, rate limited to 30 calls / 10 min / user)
| Method | Path | Notes |
|---|---|---|
| GET | `/ai/status` | `{ai_available, mode, model, message}` |
| POST | `/ai/plan` | Body: `goal`*, `hours_per_week`* (0.5-100), `skill_level` (beginner/intermediate/advanced), `deadline`* (YYYY-MM-DD), `notes` |
| POST | `/ai/chat` | Body: `message`* (max 2000), `goal_id?` -> `{user_message, reply, ai_generated, notice}` |
| GET | `/ai/chat/history` | Query `limit` -> `{messages}` |
| DELETE | `/ai/chat/history` | Clears the user's conversation |

`POST /ai/plan` response:
```json
{
  "plan": {"goal_description": "...", "action_plan": ["..."],
           "missions": [{"title": "...", "description": "...", "estimated_minutes": 60,
                         "suggested_due_date": "2026-11-20", "priority": "high"}],
           "obstacles": [{"obstacle": "...", "solution": "..."}], "motivation": "..."},
  "source": "claude | fallback", "ai_generated": true, "model": "...", "notice": null,
  "request": {...}, "generated_at": "..."
}
```
When Claude is unavailable the endpoint still returns 200 with `source: "fallback"`, `ai_generated: false` and a `notice`
explaining why. The same applies to `/ai/chat` replies (`reply.source = "fallback"`).

## Utility
`GET /health` returns `{"status": "ok"}`.
