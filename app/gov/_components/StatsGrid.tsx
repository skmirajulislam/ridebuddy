"use client";

import React from "react";
import { ClipboardList, AlertTriangle, Construction, CheckCircle2 } from "lucide-react";
import { useGovStats } from "../_hooks/useHazards";

interface StatConfig {
  key: "total" | "active" | "in_progress" | "resolved";
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bg: string;
}

const STATS: StatConfig[] = [
  { key: "total", label: "Total Hazards", icon: ClipboardList, color: "#00aaee", bg: "rgba(0, 170, 238, 0.12)" },
  { key: "active", label: "Active Hazards", icon: AlertTriangle, color: "#0284c7", bg: "rgba(2, 132, 199, 0.12)" },
  { key: "in_progress", label: "In Progress", icon: Construction, color: "#d97706", bg: "rgba(217, 119, 6, 0.12)" },
  { key: "resolved", label: "Resolved", icon: CheckCircle2, color: "#16a34a", bg: "rgba(22, 163, 74, 0.12)" },
];

export default function StatsGrid() {
  const { data: stats, isPending } = useGovStats();

  return (
    <div className="stats-grid">
      {STATS.map(({ key, label, icon: Icon, color, bg }) => (
        <div key={key} className="stat-card">
          <div className="stat-card__icon flex items-center justify-center" style={{ background: bg, color }}>
            <Icon className="w-5 h-5" />
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
