"use client";

import React from "react";
import { formatDistanceToNow } from "date-fns";
import { AlertTriangle, Clock, CheckCircle2 } from "lucide-react";
import type { Hazard } from "../_services/api";

interface DataTableProps {
  hazards: Hazard[];
  selectedId: number | null;
  onSelect: (h: Hazard) => void;
}

const SEV_LABEL: Record<number, string> = { 1: "Low", 2: "Medium", 3: "High" };

export function StatusBadge({ status }: { status: Hazard["status"] }) {
  if (status === "resolved") {
    return (
      <span className="badge badge--resolved inline-flex items-center gap-1">
        <CheckCircle2 className="w-3 h-3" />
        <span>Resolved</span>
      </span>
    );
  }
  if (status === "in_progress") {
    return (
      <span className="badge badge--in_progress inline-flex items-center gap-1">
        <Clock className="w-3 h-3" />
        <span>In Progress</span>
      </span>
    );
  }
  return (
    <span className="badge badge--active inline-flex items-center gap-1">
      <AlertTriangle className="w-3 h-3" />
      <span>Active</span>
    </span>
  );
}

export default function DataTable({ hazards, selectedId, onSelect }: DataTableProps) {
  return (
    <div className="data-table-card">
      <div className="data-table-card__header">
        <span className="data-table-card__title">Hazard Reports</span>
        <span className="data-table-card__count">{hazards.length} records</span>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Type</th>
              <th>Severity</th>
              <th>Location</th>
              <th>Status</th>
              <th>Reported</th>
            </tr>
          </thead>
          <tbody>
            {hazards.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  style={{
                    textAlign: "center",
                    color: "var(--gov-text-muted)",
                    padding: "32px",
                  }}
                >
                  No hazards found
                </td>
              </tr>
            )}
            {hazards.map((h) => (
              <tr
                key={h.id}
                className={selectedId === h.id ? "row--selected" : ""}
                onClick={() => onSelect(h)}
              >
                <td style={{ color: "var(--gov-text-muted)", fontFamily: "monospace" }}>
                  #{h.id}
                </td>
                <td style={{ textTransform: "capitalize", fontWeight: 500 }}>{h.type}</td>
                <td>
                  <span className={`badge badge--${SEV_LABEL[h.severity]?.toLowerCase()}`}>
                    {SEV_LABEL[h.severity] ?? "—"}
                  </span>
                </td>
                <td
                  style={{
                    color: "var(--gov-text-muted)",
                    fontSize: "12px",
                    fontFamily: "monospace",
                  }}
                >
                  {h.lat.toFixed(4)}, {h.lng.toFixed(4)}
                </td>
                <td>
                  <StatusBadge status={h.status} />
                </td>
                <td style={{ color: "var(--gov-text-muted)", fontSize: "12px" }}>
                  {formatDistanceToNow(new Date(h.created_at), { addSuffix: true })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
