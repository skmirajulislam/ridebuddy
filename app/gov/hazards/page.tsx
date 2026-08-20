"use client";

import { useState, useMemo } from "react";
import Header from "../_components/Header";
import DataTable from "../_components/DataTable";
import HazardPanel from "../_components/HazardPanel";
import { useHazards } from "../_hooks/useHazards";
import type { Hazard } from "../_services/api";

type StatusFilter = "all" | Hazard["status"];

const FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "in_progress", label: "In Progress" },
  { value: "resolved", label: "Resolved" },
];

export default function GovHazardsPage() {
  const { data: hazards = [], isPending, isError } = useHazards();
  const [selected, setSelected] = useState<Hazard | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState("");

  const filtered = useMemo(() => {
    return hazards.filter((h) => {
      if (statusFilter !== "all" && h.status !== statusFilter) return false;
      if (typeFilter && !h.type.toLowerCase().includes(typeFilter.toLowerCase()))
        return false;
      return true;
    });
  }, [hazards, statusFilter, typeFilter]);

  const types = useMemo(
    () => [...new Set(hazards.map((h) => h.type))].sort(),
    [hazards]
  );

  return (
    <>
      <Header
        title="Hazard Records"
        subtitle="Browse, filter, and manage all reported road hazards"
      />

      <div className="gov-content">
        {/* Filters */}
        <div
          style={{
            display: "flex",
            gap: "10px",
            marginBottom: "16px",
            flexWrap: "wrap",
          }}
        >
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setStatusFilter(opt.value)}
              style={{
                padding: "6px 14px",
                borderRadius: "999px",
                border: "1px solid",
                borderColor:
                  statusFilter === opt.value
                    ? "var(--gov-primary)"
                    : "var(--gov-border)",
                background:
                  statusFilter === opt.value
                    ? "var(--gov-primary-fade)"
                    : "var(--gov-surface)",
                color:
                  statusFilter === opt.value
                    ? "#0088cc"
                    : "var(--gov-text-secondary)",
                fontWeight: 600,
                fontSize: "12px",
                cursor: "pointer",
              }}
            >
              {opt.label}
            </button>
          ))}

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            style={{
              padding: "6px 10px",
              borderRadius: "8px",
              border: "1px solid var(--gov-border)",
              fontSize: "12px",
              color: "var(--gov-text-secondary)",
              background: "var(--gov-surface)",
              cursor: "pointer",
            }}
          >
            <option value="">All Types</option>
            {types.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        {isPending && (
          <div
            style={{
              textAlign: "center",
              padding: "48px",
              color: "var(--gov-text-muted)",
            }}
          >
            <span className="spinner" /> Loading…
          </div>
        )}
        {isError && <div className="error-msg">Failed to load hazards.</div>}

        {!isPending && !isError && (
          <DataTable
            hazards={filtered}
            selectedId={selected?.id ?? null}
            onSelect={setSelected}
          />
        )}
      </div>

      <HazardPanel
        hazard={
          selected ? hazards.find((h) => h.id === selected.id) ?? selected : null
        }
        onClose={() => setSelected(null)}
      />
    </>
  );
}
