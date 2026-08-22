"use client";

import React from "react";
import Image from "next/image";
import { formatDistanceToNow, format } from "date-fns";
import { AlertTriangle, Clock, CheckCircle2, MapPin, Eye } from "lucide-react";
import type { Hazard } from "../_services/api";

interface DataTableProps {
  hazards: Hazard[];
  selectedId: number | null;
  onSelect: (h: Hazard) => void;
  title?: string;
}

const SEV_LABEL: Record<number, string> = { 1: "Low (L1)", 2: "Medium (L2)", 3: "High (L3)" };

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
      <span className="badge badge--medium inline-flex items-center gap-1">
        <Clock className="w-3 h-3" />
        <span>In Progress</span>
      </span>
    );
  }
  return (
    <span className="badge badge--high inline-flex items-center gap-1">
      <AlertTriangle className="w-3 h-3" />
      <span>Active</span>
    </span>
  );
}

export default function DataTable({ hazards, selectedId, onSelect, title = "Hazard Reports" }: DataTableProps) {
  return (
    <div className="data-table-card">
      <div className="data-table-card__header">
        <span className="data-table-card__title">{title}</span>
        <span className="data-table-card__count">{hazards.length} records</span>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Reported By (Person Details)</th>
              <th>Type</th>
              <th>Severity</th>
              <th>GPS Location</th>
              <th>Status</th>
              <th>Reported Date</th>
            </tr>
          </thead>
          <tbody>
            {hazards.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  style={{
                    textAlign: "center",
                    color: "var(--gov-text-muted)",
                    padding: "36px",
                  }}
                >
                  No hazard records found
                </td>
              </tr>
            )}
            {hazards.map((h) => {
              const reporterName = h.reporter_name || "Citizen Reporter";
              const reporterHandle = h.reporter_handle || "@citizen";
              const uidDisplay = h.user_id ? `#${h.user_id}` : "Guest";
              const initials = reporterName
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2) || "CR";

              const isSelected = selectedId === h.id;
              const sevBadgeClass = h.severity === 3 ? "badge--high" : h.severity === 2 ? "badge--medium" : "badge--low";

              return (
                <tr
                  key={h.id}
                  className={isSelected ? "row--selected" : ""}
                  onClick={() => onSelect(h)}
                  style={{ cursor: "pointer" }}
                >
                  <td style={{ color: "#00ccff", fontFamily: "monospace", fontWeight: 700 }}>
                    #{h.id}
                  </td>

                  {/* Reporter Person Details */}
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      {h.reporter_avatar ? (
                        <div
                          style={{
                            position: "relative",
                            width: "30px",
                            height: "30px",
                            borderRadius: "50%",
                            overflow: "hidden",
                            border: "1.5px solid var(--gov-border-strong)",
                            flexShrink: 0,
                          }}
                        >
                          <Image
                            src={h.reporter_avatar}
                            alt={reporterName}
                            fill
                            unoptimized
                            style={{ objectFit: "cover" }}
                          />
                        </div>
                      ) : (
                        <div
                          style={{
                            width: "30px",
                            height: "30px",
                            borderRadius: "50%",
                            background: "linear-gradient(135deg, #00ccff, #3b82f6)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#fff",
                            fontSize: "11px",
                            fontWeight: 700,
                            flexShrink: 0,
                          }}
                        >
                          {initials}
                        </div>
                      )}

                      <div>
                        <div style={{ fontWeight: 600, color: "var(--gov-text)", fontSize: "13px" }}>
                          {reporterName}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "var(--gov-text-muted)" }}>
                          <span>{reporterHandle}</span>
                          <span>•</span>
                          <span style={{ fontFamily: "monospace", color: "#38bdf8", fontWeight: 600 }}>
                            UID #{uidDisplay}
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>

                  <td style={{ textTransform: "capitalize", fontWeight: 600 }}>{h.type}</td>
                  <td>
                    <span className={`badge ${sevBadgeClass}`}>
                      {SEV_LABEL[h.severity] ?? "—"}
                    </span>
                  </td>
                  <td
                    style={{
                      color: "var(--gov-text)",
                      fontSize: "12px",
                      fontFamily: "monospace",
                    }}
                  >
                    {h.lat.toFixed(4)}, {h.lng.toFixed(4)}
                  </td>
                  <td>
                    <StatusBadge status={h.status} />
                  </td>
                  <td>
                    <div style={{ fontSize: "12px", color: "var(--gov-text)" }}>
                      {format(new Date(h.created_at), "dd MMM, HH:mm")}
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--gov-text-muted)" }}>
                      {formatDistanceToNow(new Date(h.created_at), { addSuffix: true })}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
