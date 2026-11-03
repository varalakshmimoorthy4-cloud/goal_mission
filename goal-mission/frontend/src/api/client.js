// Thin wrapper around fetch for the Goal Mission REST API.
// Every URL here matches a route defined in backend/routes/*.py.
//
// In development requests go to "/api/..." and Vite proxies them to Flask.
// Set VITE_API_URL (e.g. http://127.0.0.1:5000) only if you serve the frontend elsewhere.
const BASE = import.meta.env.VITE_API_URL || "";
const TOKEN_KEY = "goal_mission_token";

let unauthorizedHandler = null;
export const setUnauthorizedHandler = (fn) => {
  unauthorizedHandler = fn;
};

export const getToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

export const setToken = (token) => {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage unavailable (private mode) - the session simply won't persist */
  }
};

export class ApiError extends Error {
  constructor(message, status, code, details) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details || {};
  }
}

async function request(method, path, { body, params, auth = true } = {}) {
  const url = new URL(`${BASE}/api${path}`, window.location.origin);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, value);
    });
  }

  const headers = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError("Cannot reach the server. Is the backend running on port 5000?", 0, "network_error");
  }

  let data = null;
  try {
    data = await response.json();
  } catch {
    /* empty or non-JSON body */
  }

  if (!response.ok) {
    if (response.status === 401 && auth && unauthorizedHandler) unauthorizedHandler();
    const err = data && data.error;
    throw new ApiError(
      (err && err.message) || `Request failed (${response.status})`,
      response.status,
      err && err.code,
      err && err.details
    );
  }
  return data;
}

const get = (path, params, opts) => request("GET", path, { params, ...opts });
const post = (path, body, opts) => request("POST", path, { body: body ?? {}, ...opts });
const put = (path, body) => request("PUT", path, { body });
const del = (path) => request("DELETE", path);

export const api = {
  auth: {
    register: (payload) => post("/auth/register", payload, { auth: false }),
    login: (payload) => post("/auth/login", payload, { auth: false }),
    demo: () => post("/auth/demo", {}, { auth: false }),
    logout: () => post("/auth/logout"),
    me: () => get("/auth/me"),
    updateProfile: (payload) => put("/auth/me", payload),
    changePassword: (payload) => put("/auth/password", payload),
  },
  goals: {
    list: (params) => get("/goals", params),
    get: (id) => get(`/goals/${id}`),
    create: (payload) => post("/goals", payload),
    update: (id, payload) => put(`/goals/${id}`, payload),
    remove: (id) => del(`/goals/${id}`),
    complete: (id, completed = true) => post(`/goals/${id}/complete`, { completed }),
    progress: (id) => get(`/goals/${id}/progress`),
  },
  missions: {
    listForGoal: (goalId, sort) => get(`/goals/${goalId}/missions`, { sort }),
    create: (goalId, payload) => post(`/goals/${goalId}/missions`, payload),
    bulkCreate: (goalId, missions, aiGenerated) =>
      post(`/goals/${goalId}/missions/bulk`, { missions, ai_generated: aiGenerated }),
    list: (params) => get("/missions", params),
    get: (id) => get(`/missions/${id}`),
    update: (id, payload) => put(`/missions/${id}`, payload),
    toggle: (id) => post(`/missions/${id}/toggle`),
    remove: (id) => del(`/missions/${id}`),
  },
  dashboard: {
    stats: (tzOffset = 0) => get("/dashboard/stats", { tz_offset: tzOffset }),
    upcoming: (days = 30) => get("/dashboard/upcoming", { days }),
  },
  ai: {
    status: () => get("/ai/status"),
    plan: (payload) => post("/ai/plan", payload),
    chat: (message, goalId) => post("/ai/chat", { message, goal_id: goalId || null }),
    history: (limit = 100) => get("/ai/chat/history", { limit }),
    clearHistory: () => del("/ai/chat/history"),
  },
};
