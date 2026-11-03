import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Sparkles, Target } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { useToast } from "../context/ToastContext";
import useDocumentTitle from "../hooks/useDocumentTitle";
import GoalCard from "../components/GoalCard";
import GoalForm from "../components/GoalForm";
import Modal from "../components/Modal";
import EmptyState from "../components/EmptyState";
import LoadingSpinner from "../components/LoadingSpinner";
import { CATEGORIES, PRIORITIES } from "../utils/constants";

export default function Goals() {
  useDocumentTitle("My Goals");
  const toast = useToast();
  const navigate = useNavigate();
  const [goals, setGoals] = useState(null);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filters, setFilters] = useState({ status: "all", category: "", priority: "", sort: "created" });

  // Wait 300ms after typing stops before calling the API.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const load = useCallback(async () => {
    try {
      const data = await api.goals.list({ ...filters, search: debouncedSearch });
      setGoals(data.goals);
      setError("");
    } catch (err) {
      setError(err.message);
    }
  }, [filters, debouncedSearch]);

  useEffect(() => {
    load();
  }, [load]);

  const setFilter = (key) => (event) => setFilters((f) => ({ ...f, [key]: event.target.value }));
  const hasFilters = Boolean(debouncedSearch || filters.category || filters.priority || filters.status !== "all");

  const handleCreate = async (values) => {
    const { goal } = await api.goals.create(values);
    toast.success("Goal created. Now add some missions!");
    setShowForm(false);
    navigate(`/goals/${goal.id}`);
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1>My Goals</h1>
          <p className="page-sub">Create goals, break them into missions and track your progress.</p>
        </div>
        <div className="button-row">
          <Link to="/planner" className="btn btn-secondary"><Sparkles size={16} aria-hidden="true" /> Plan with AI</Link>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            <Plus size={17} aria-hidden="true" /> New goal
          </button>
        </div>
      </div>

      <div className="card toolbar" role="search">
        <div className="search-box">
          <Search size={17} aria-hidden="true" />
          <input
            type="search"
            className="input"
            placeholder="Search goals..."
            aria-label="Search goals"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="select" aria-label="Filter by status" value={filters.status} onChange={setFilter("status")}>
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
        </select>
        <select className="select" aria-label="Filter by category" value={filters.category} onChange={setFilter("category")}>
          <option value="">All categories</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="select" aria-label="Filter by priority" value={filters.priority} onChange={setFilter("priority")}>
          <option value="">All priorities</option>
          {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
        <select className="select" aria-label="Sort goals" value={filters.sort} onChange={setFilter("sort")}>
          <option value="created">Newest first</option>
          <option value="target_date">Target date</option>
          <option value="priority">Priority</option>
          <option value="progress">Progress</option>
        </select>
      </div>

      {error && <div className="banner banner-danger" role="alert">{error}</div>}
      {!goals && !error && <LoadingSpinner block label="Loading goals..." />}

      {goals && goals.length === 0 && (
        <div className="card">
          {hasFilters ? (
            <EmptyState icon={Search} title="No goals match your filters">
              Try a different search or clear the filters.
            </EmptyState>
          ) : (
            <EmptyState
              icon={Target}
              title="Your first goal starts here"
              action={<button className="btn btn-primary" onClick={() => setShowForm(true)}>Create a goal</button>}
            >
              Set a goal, then split it into small missions you can finish one at a time.
            </EmptyState>
          )}
        </div>
      )}

      {goals && goals.length > 0 && (
        <div className="goal-grid">
          {goals.map((goal) => <GoalCard key={goal.id} goal={goal} />)}
        </div>
      )}

      {showForm && (
        <Modal title="Create a new goal" onClose={() => setShowForm(false)}>
          <GoalForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} submitLabel="Create goal" />
        </Modal>
      )}
    </>
  );
}
