# Database Schema

Database: SQLite (via SQLAlchemy). Tables are created automatically by `db.create_all()` when the backend starts.
All timestamps are stored as naive UTC datetimes and returned by the API as ISO strings ending in `Z`.

## Entity relationship
```
users 1 ----< goals 1 ----< missions
  |                             ^
  |----------------------------/   (missions also store user_id for direct ownership filtering)
  `----< chat_messages
```
- Deleting a user deletes their goals, missions and chat messages (ORM cascade).
- Deleting a goal deletes its missions.

## users
| Column | Type | Constraints |
|---|---|---|
| id | INTEGER | PK |
| name | VARCHAR(80) | NOT NULL |
| email | VARCHAR(254) | NOT NULL, UNIQUE, indexed (stored lower-case) |
| password_hash | VARCHAR(256) | NOT NULL (salted Werkzeug hash) |
| is_demo | BOOLEAN | NOT NULL, default false |
| daily_focus_minutes | INTEGER | NOT NULL, default 60, CHECK 15-960 |
| reminder_days | INTEGER | NOT NULL, default 3, CHECK 0-30 |
| weekly_mission_target | INTEGER | NOT NULL, default 5, CHECK 1-100 |
| created_at, updated_at | DATETIME | NOT NULL |

## goals
| Column | Type | Constraints |
|---|---|---|
| id | INTEGER | PK |
| user_id | INTEGER | FK -> users.id, NOT NULL, indexed |
| title | VARCHAR(200) | NOT NULL |
| description | TEXT | NOT NULL, default '' |
| category | VARCHAR(40) | NOT NULL (Academic, Career, Learning, Fitness, Personal, Finance, Other) |
| priority | VARCHAR(10) | NOT NULL, CHECK in ('low','medium','high') |
| status | VARCHAR(10) | NOT NULL, CHECK in ('active','completed') |
| target_date | DATE | nullable (goal deadline) |
| completed_at | DATETIME | nullable |
| created_at, updated_at | DATETIME | NOT NULL |

## missions
| Column | Type | Constraints |
|---|---|---|
| id | INTEGER | PK |
| goal_id | INTEGER | FK -> goals.id, NOT NULL, indexed |
| user_id | INTEGER | FK -> users.id, NOT NULL, indexed |
| title | VARCHAR(200) | NOT NULL |
| description | TEXT | NOT NULL, default '' |
| priority | VARCHAR(10) | NOT NULL, CHECK in ('low','medium','high') |
| status | VARCHAR(10) | NOT NULL, CHECK in ('pending','completed') |
| due_date | DATE | nullable |
| estimated_minutes | INTEGER | nullable, CHECK > 0 |
| completed_at | DATETIME | nullable (set when completed, cleared when re-opened) |
| ai_generated | BOOLEAN | NOT NULL, default false (created from an AI plan) |
| created_at, updated_at | DATETIME | NOT NULL |

## chat_messages
| Column | Type | Constraints |
|---|---|---|
| id | INTEGER | PK |
| user_id | INTEGER | FK -> users.id, NOT NULL, indexed |
| role | VARCHAR(10) | NOT NULL, CHECK in ('user','assistant') |
| content | TEXT | NOT NULL |
| source | VARCHAR(10) | NOT NULL, CHECK in ('user','claude','fallback') |
| created_at | DATETIME | NOT NULL |

`source` records whether an assistant reply came from Claude or from the pre-written fallback, so the UI can label it
honestly and fallback text is never sent back to Claude as conversation history.

## Derived values (not stored)
- **Mission overdue:** `status = 'pending'` and `due_date < today`.
- **Goal progress %:** `round(completed missions / total missions * 100)`. A goal with no missions is 0% (100% if the user marked it completed).
- **Dashboard completion %:** completed missions / all missions (falls back to completed goals / goals when there are no missions).

## Initialisation and sample data
- Tables are created automatically on startup. To create them manually:
  `python -c "from app import create_app; create_app()"` (run inside `backend`).
- `python scripts/seed_demo_data.py` creates one sample account (random password printed once) with goals labelled `[Sample data]`.
- To reset, stop the server and delete `backend/goal_mission.db`.
- Schema changes after the first run require deleting the database file (no migration tool is included).
