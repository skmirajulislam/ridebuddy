"use client";

import { formatDistanceToNow, format } from "date-fns";
import type { Hazard } from "../_services/api";
import { useUpdateStatus } from "../_hooks/useHazards";
import { StatusBadge } from "./DataTable";
import MapPreview from "./MapPreview";

interface HazardPanelProps {
  hazard: Hazard | null;
  onClose: () => void;
}

const SEV_LABEL: Record<number, string> = { 1: "Low", 2: "Medium", 3: "High" };

export default function HazardPanel({ hazard, onClose }: HazardPanelProps) {
  const { mutate: updateStatus, isPending } = useUpdateStatus();

  const act = (status: Hazard["status"]) => {
    if (!hazard) return;
    updateStatus({ id: hazard.id, status });
  };

  return (
    <div className={`hazard-panel${hazard ? " hazard-panel--open" : ""}`}>
      {hazard && (
        <>
          <div className="hazard-panel__header">
            <div>
              <div className="hazard-panel__title">{hazard.type}</div>
              <StatusBadge status={hazard.status} />
            </div>
            <button className="hazard-panel__close" onClick={onClose}>
              ✕
            </button>
          </div>

          <div className="hazard-panel__body">
            {/* Photo Evidence if available */}
            {hazard.image_url && (
              <div style={{ borderRadius: "8px", overflow: "hidden", border: "1px solid var(--gov-border)" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={hazard.image_url}
                  alt="Hazard photo"
                  style={{ width: "100%", maxHeight: "200px", objectFit: "cover", display: "block" }}
                />
              </div>
            )}

            {/* Mini map */}
            <MapPreview
              lat={hazard.lat}
              lng={hazard.lng}
              status={hazard.status}
              height={160}
            />

            {/* Info rows */}
            <div className="info-row">
              <span className="info-row__label">Hazard ID</span>
              <span className="info-row__value" style={{ fontFamily: "monospace" }}>
                #{hazard.id}
              </span>
            </div>

            <div className="info-row">
              <span className="info-row__label">Severity</span>
              <span className="info-row__value">
                {SEV_LABEL[hazard.severity] ?? "Unknown"}
              </span>
            </div>

            <div className="info-row">
              <span className="info-row__label">Coordinates</span>
              <span
                className="info-row__value"
                style={{ fontFamily: "monospace", fontSize: "13px" }}
              >
                {hazard.lat.toFixed(6)}, {hazard.lng.toFixed(6)}
              </span>
            </div>

            {hazard.confidence != null && (
              <div className="info-row">
                <span className="info-row__label">AI Confidence</span>
                <span className="info-row__value">
                  {Math.round(hazard.confidence * 100)}%
                </span>
              </div>
            )}

            <div className="info-row">
              <span className="info-row__label">Reported</span>
              <span className="info-row__value">
                {format(new Date(hazard.created_at), "dd MMM yyyy, HH:mm")}{" "}
                <span style={{ color: "var(--gov-text-muted)", fontSize: "12px" }}>
                  ({formatDistanceToNow(new Date(hazard.created_at), { addSuffix: true })})
                </span>
              </span>
            </div>

            {hazard.resolved_at && (
              <div className="info-row">
                <span className="info-row__label">Resolved At</span>
                <span className="info-row__value">
                  {format(new Date(hazard.resolved_at), "dd MMM yyyy, HH:mm")}
                </span>
              </div>
            )}

            {/* Action buttons */}
            <div className="panel-actions">
              {hazard.status !== "in_progress" && hazard.status !== "resolved" && (
                <button
                  className="btn btn--warning"
                  onClick={() => act("in_progress")}
                  disabled={isPending}
                >
                  {isPending ? "Updating…" : "▶ Mark In Progress"}
                </button>
              )}
              {hazard.status !== "resolved" && (
                <button
                  className="btn btn--primary"
                  onClick={() => act("resolved")}
                  disabled={isPending}
                >
                  {isPending ? "Updating…" : "✓ Mark Resolved"}
                </button>
              )}
              {hazard.status !== "active" && (
                <button
                  className="btn btn--ghost"
                  onClick={() => act("active")}
                  disabled={isPending}
                >
                  ↩ Revert to Active
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {!hazard && (
        <div
          style={{
            padding: "32px 20px",
            color: "var(--gov-text-muted)",
            textAlign: "center",
          }}
        >
          Select a hazard row or map marker to see details
        </div>
      )}
    </div>
  );
}
