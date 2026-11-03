# Goal Mission - AI-Powered Goal Setting and Mission Tracking

Goal Mission helps people set goals, split them into small **missions**, track progress, get an
AI-generated action plan from **Claude**, and stay motivated with an AI assistant.

> **Status of verification:** this project was generated in an environment without access to PyPI/npm,
> so the automated tests and the frontend build could **not** be executed there. The code was checked
> statically (Python compile, JSX syntax check, route-vs-client matching, import resolution) and the
> dependency-free logic (validators, AI-output validation, rate limiter, fallback plan) was run.
> Please run the test commands in section 9 on your machine and fix anything they report.

---

## 1. Problem statement
People often set big goals ("learn Python", "prepare for exams") but never turn them into concrete,
time-boxed steps, lose track of deadlines, and lose motivation. Existing tools are either simple to-do
lists with no planning help or heavy project-management suites.

## 2. Objectives
- Let users create goals and divide them into missions with deadlines and priorities.
- Calculate progress automatically from completed missions.
- Use Claude to draft a realistic, editable plan from the user's time, skill level and deadline.
- Offer a chat assistant for procrastination, planning and motivation.
- Keep every user's data private and the API key on the server.
- Work without an API key by clearly labelled non-AI fallbacks.

## 3. Features
| Area | What you get |
|---|---|
| Authentication | Register, login, logout, salted password hashing, signed expiring tokens, login throttling |
| Dashboard | Goal counts, completion %, weekly chart, goal progress, upcoming deadlines, recent activity, in-app reminders |
| Goals | CRUD, category, priority, target date, search, filters, sorting, complete/re-open, delete with confirmation |
| Missions | CRUD, due dates, estimated minutes, overdue highlighting, sort by due date/priority, toggle complete |
| AI Goal Planner | Claude plan: description, action steps, missions with time + dates + priority, obstacles + solutions, motivation. Editable, then saved as missions |
| AI Motivation Chat | Chat with history, goal context, loading indicator, error handling, clear history |
| Calendar | Month grid, overdue list, reminder window, 30-day outlook, goal deadlines |
| Profile | Update name/email, productivity preferences, change password |
| Demo mode | One click temporary account with sample data labelled `[Sample data]` (no default admin account) |

Reminders are **in-app only**. The app does not send email, SMS or push notifications.

## 4. Technology stack
- **Frontend:** React 18, Vite, React Router, Recharts, Lucide React, plain CSS (responsive)
- **Backend:** Python 3.10+, Flask, Flask-CORS, Flask-SQLAlchemy / SQLAlchemy
- **Database:** SQLite (file `backend/goal_mission.db`)
- **AI:** Anthropic Claude through the official `anthropic` Python SDK
- **Tests:** pytest

## 5. Architecture overview
```
Browser (React SPA, port 5173)
   |  fetch /api/...  (Vite dev server proxies to Flask)
   v
Flask REST API (port 5000)
   |-- routes/       HTTP layer: auth, goals, missions, dashboard, ai
   |-- utils/        validators, token auth, error helpers, rate limiter
   |-- models/       SQLAlchemy models (User, Goal, Mission, ChatMessage)
   |-- services/     claude_service.py (all Anthropic calls) + demo_data.py
   v
SQLite database            Anthropic API (key stays on the server)
```
Key design points:
- Every goal/mission/chat query is filtered by the logged-in user's id; other users' records return `404`.
- AI output is untrusted: parsed as JSON, validated field by field, dates clamped, never executed and never used in SQL.
- If Claude fails (no key, rate limit, timeout, bad output) the API still answers with a template response marked `ai_generated: false`, and the UI says so.
- Identical plan requests are cached for 10 minutes to avoid duplicate API calls; AI endpoints are rate limited per user.

## 6. Folder structure
```
goal-mission/
|-- README.md  .gitignore  .env.example  requirements.txt
|-- docs/  PROJECT_REPORT.md  API_DOCUMENTATION.md  DATABASE_SCHEMA.md
|-- backend/
|   |-- app.py  config.py  extensions.py  pytest.ini
|   |-- models/    user.py goal.py mission.py chat.py mixins.py
|   |-- routes/    auth.py goals.py missions.py dashboard.py ai.py
|   |-- services/  claude_service.py demo_data.py
|   |-- utils/     validators.py auth.py http.py ratelimit.py
|   |-- scripts/   seed_demo_data.py
|   `-- tests/     conftest.py test_auth.py test_goals.py test_missions.py test_ai.py test_dashboard.py
`-- frontend/
    |-- package.json  vite.config.js  index.html
    `-- src/  main.jsx App.jsx
        |-- api/client.js
        |-- context/  AuthContext.jsx ToastContext.jsx
        |-- components/  Sidebar Navbar Layout GoalCard MissionItem ProgressChart LoadingSpinner ...
        |-- pages/  Login Register Dashboard Goals GoalDetails MissionDetails AIPlanner AIChat Calendar Profile
        |-- hooks/  useDocumentTitle.js
        |-- utils/  constants.js format.js
        `-- styles/global.css
```

## 7. Database schema
Four tables: `users`, `goals`, `missions`, `chat_messages`. A user has many goals, a goal has many
missions (deleting a goal deletes its missions), and a user has many chat messages. Check constraints
enforce priorities and statuses. Full details are in [docs/DATABASE_SCHEMA.md](docs/DATABASE_SCHEMA.md).

## 8. Prerequisites
- **Python 3.10 or newer** (`python --version`)
- **Node.js 18 or newer** and npm (`node --version`)
- Optional: an Anthropic API key for real AI features

## 9. Installation and running (Windows PowerShell)

Open the project folder, then use **two terminals**.

### Terminal 1 - backend
```powershell
cd goal-mission

# 1. Create and activate a virtual environment
python -m venv .venv
.\.venv\Scripts\Activate.ps1
# If activation is blocked:  Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass

# 2. Install backend dependencies
pip install -r requirements.txt

# 3. Configure environment variables
Copy-Item .env.example .env
notepad .env            # optional: add your ANTHROPIC_API_KEY (see section 10)

# 4. Initialise the database (tables are also created automatically on every start)
cd backend
python -c "from app import create_app; create_app(); print('Database ready')"

# 5. (Optional) create a sample-data account for demos
python scripts/seed_demo_data.py

# 6. Start the Flask API on http://127.0.0.1:5000
python app.py
```

### Terminal 2 - frontend
```powershell
cd goal-mission\frontend
npm install                 # 7. install frontend dependencies
npm run dev                 # 8. start Vite on http://localhost:5173
```
Open **http://localhost:5173** in your browser. Register an account, or click **Try demo mode** on the login page.

### Running the tests
```powershell
cd goal-mission\backend
python -m pytest            # 9. runs all backend tests (uses an in-memory database, never calls Claude)
```
Production build check for the frontend: `npm run build` inside `frontend`.

## 10. Configure the Claude API
1. Create an API key in the [Anthropic Console](https://console.anthropic.com/).
2. Put it in `goal-mission/.env` (never in frontend code, never in Git):
   ```
   ANTHROPIC_API_KEY=sk-ant-...your-key...
   CLAUDE_MODEL=claude-sonnet-5-5
   ```
3. Restart the backend. The AI Planner page shows **"AI on (model)"** when the key is detected.

`CLAUDE_MODEL` is configurable; if the API reports an unknown model, set a model name that is listed in
the Anthropic documentation. Other optional settings: `CLAUDE_MAX_TOKENS`, `CLAUDE_TIMEOUT_SECONDS`.

## 11. Run without an AI API key
Leave `ANTHROPIC_API_KEY` as the placeholder (or empty). Everything works except real AI output:
- The planner returns a simple rule-based template, shown with a warning that it is **not AI-generated**.
- The chat returns pre-written tips labelled **"Not AI - pre-written tips"**.

## 12. Common errors and solutions
| Problem | Fix |
|---|---|
| `Activate.ps1 cannot be loaded` | `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` then activate again |
| `ModuleNotFoundError: flask...` | The virtual environment is not active, or run `pip install -r requirements.txt` again |
| Frontend shows "Cannot reach the server" | Start the backend (`python app.py`) and check it listens on port 5000 |
| Port 5000 already in use | Set `PORT=5001` in `.env` **and** change the proxy `target` in `frontend/vite.config.js` |
| Login works but pages show "session expired" | Delete the saved token (browser storage) or log in again; tokens last 7 days |
| Planner says "AI unavailable (...)" | Check the key, billing and `CLAUDE_MODEL`; the message names the reason (rate limit, timeout, auth) |
| `Too many failed attempts` | Wait about 5 minutes; login throttling is per email + IP |
| CORS error in the browser console | Use `http://localhost:5173` or add your origin to `FRONTEND_ORIGINS` in `.env` |
| `npm install` fails | Use Node 18+, delete `node_modules` and `package-lock.json`, retry |
| Reset all data | Stop the backend and delete `backend/goal_mission.db` |

## 13. Security notes
Passwords are hashed with Werkzeug (salted); tokens are signed, expire after 7 days and are invalidated when
the password changes; the API key is read only on the server; all inputs are validated; ownership is checked on
every private route; error messages avoid revealing whether an email exists. This is a college-project
setup: before any real deployment use HTTPS, a production WSGI server, a persistent rate-limit store and a
managed database.

## 14. Future enhancements
Email/push reminders, recurring missions, drag-and-drop mission ordering, team goals, streaks and badges,
streamed AI replies, export to PDF/CSV, refresh-token sessions, PostgreSQL deployment, and end-to-end tests.
