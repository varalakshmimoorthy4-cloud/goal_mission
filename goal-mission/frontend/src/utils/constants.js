// Must match CATEGORIES / PRIORITIES / SKILL_LEVELS in backend/utils/validators.py
export const CATEGORIES = ["Academic", "Career", "Learning", "Fitness", "Personal", "Finance", "Other"];

export const PRIORITIES = [
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

export const SKILL_LEVELS = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

export const CHART_COLORS = {
  purple: "#6d4aff",
  blue: "#2563eb",
  lavender: "#e4defe",
  grid: "#e4e6f5",
  text: "#6b7194",
};
