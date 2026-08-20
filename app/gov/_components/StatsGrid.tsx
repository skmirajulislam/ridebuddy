"use client";

import { useGovStats } from "../_hooks/useHazards";

interface StatConfig {
  key: "total" | "active" | "in_progress" | "resolved";
  label: string;
  icon: string;
  color: string;
  bg: string;
}

const STATS: StatConfig[] = [
  { key: "total", label: "Total Hazards", icon: "📋", color: "#00aaee", bg: "#e6f9ff" },
  { key: "active", label: "Active Hazards", icon: "⚠️", color: "#0284c7", bg: "#e0f2fe" },
  { key: "in_progress", label: "In Progress", icon: "🚧", color: "#d97706", bg: "#fef3c7" },
  { key: "resolved", label: "Resolved", icon: "✅", color: "#16a34a", bg: "#dcfce7" },
];

export default function StatsGrid() {
  const { data: stats, isPending } = useGovStats();

  return (
    <div className="stats-grid">
      {STATS.map(({ key, label, icon, color, bg }) => (
        <div key={key} className="stat-card">
          <div className="stat-card__icon" style={{ background: bg, color }}>
            {icon}
          </div>
          <div>
            <div className="stat-card__value">
              {isPending ? "…" : stats?.[key] ?? "0"}
            </div>
            <div className="stat-card__label">{label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
