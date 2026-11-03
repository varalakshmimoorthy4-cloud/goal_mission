import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CHART_COLORS } from "../utils/constants";

// Missions completed per day over the last 7 days.
export function WeeklyChart({ data }) {
  const total = data.reduce((sum, item) => sum + item.completed, 0);
  return (
    <div role="img" aria-label={`Bar chart: ${total} missions completed in the last 7 days`}>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_COLORS.grid} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: CHART_COLORS.text, fontSize: 12 }} />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: CHART_COLORS.text, fontSize: 12 }} />
          <Tooltip cursor={{ fill: "rgba(109,74,255,0.08)" }} formatter={(value) => [value, "Completed"]} />
          <Bar dataKey="completed" fill={CHART_COLORS.purple} radius={[6, 6, 0, 0]} maxBarSize={36} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// Donut showing overall completion percentage.
export function CompletionDonut({ percentage }) {
  const data = [
    { name: "Completed", value: percentage },
    { name: "Remaining", value: 100 - percentage },
  ];
  return (
    <div className="donut-wrap" role="img" aria-label={`Overall completion ${percentage} percent`}>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie data={data} dataKey="value" innerRadius={62} outerRadius={84} startAngle={90} endAngle={-270} stroke="none">
            <Cell fill={CHART_COLORS.blue} />
            <Cell fill={CHART_COLORS.lavender} />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="donut-label">
        <strong>{percentage}%</strong>
        <span>complete</span>
      </div>
    </div>
  );
}

// Horizontal bars: progress of each active goal.
export function GoalProgressChart({ data }) {
  const rows = data.map((goal) => ({
    ...goal,
    name: goal.title.length > 22 ? `${goal.title.slice(0, 21)}...` : goal.title,
  }));
  return (
    <div role="img" aria-label="Bar chart of progress for each active goal">
      <ResponsiveContainer width="100%" height={Math.max(160, rows.length * 44)}>
        <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={CHART_COLORS.grid} />
          <XAxis type="number" domain={[0, 100]} unit="%" tickLine={false} axisLine={false} tick={{ fill: CHART_COLORS.text, fontSize: 12 }} />
          <YAxis type="category" dataKey="name" width={130} tickLine={false} axisLine={false} tick={{ fill: CHART_COLORS.text, fontSize: 12 }} />
          <Tooltip cursor={{ fill: "rgba(37,99,235,0.06)" }} formatter={(value) => [`${value}%`, "Progress"]} labelFormatter={(_, p) => p?.[0]?.payload?.title} />
          <Bar dataKey="percentage" fill={CHART_COLORS.blue} radius={[0, 6, 6, 0]} barSize={18} background={{ fill: "#f0f1fb", radius: 6 }} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default WeeklyChart;
