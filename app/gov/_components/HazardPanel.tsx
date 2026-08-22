"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow, format } from "date-fns";
import { X, Play, CheckCircle2, RotateCcw, MapPin, ExternalLink, Navigation } from "lucide-react";
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
  const router = useRouter();
  const { mutate: updateStatus, isPending } = useUpdateStatus();

  const act = (status: Hazard["status"]) => {
    if (!hazard) return;
    updateStatus({ id: hazard.id, status });
  };

  const handleOpenMap = () => {
    if (!hazard) return;
    router.push(`/gov/map?id=${hazard.id}&lat=${hazard.lat}&lng=${hazard.lng}`);
  };

  return (
    <div className={`hazard-panel${hazard ? " hazard-panel--open" : ""}`}>
      {hazard && (
        <>
          <div className="hazard-panel__header flex items-center justify-between">
            <div>
              <div className="hazard-panel__title capitalize">{hazard.type}</div>
              <StatusBadge status={hazard.status} />
            </div>
            <button className="hazard-panel__close flex items-center justify-center" onClick={onClose}>
              <X className="w-4 h-4" />
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

            {/* Mini map preview - Clickable to open full map */}
            <div
              onClick={handleOpenMap}
              style={{
                position: "relative",
                cursor: "pointer",
                borderRadius: "8px",
                overflow: "hidden",
                border: "1px solid var(--gov-border)",
                transition: "border-color 0.15s ease",
              }}
              title="Click to view exact location on Map View"
            >
              <MapPreview
                lat={hazard.lat}
                lng={hazard.lng}
                status={hazard.status}
                height={160}
              />
              <div
                style={{
                  position: "absolute",
                  bottom: "8px",
                  right: "8px",
                  background: "rgba(15, 23, 42, 0.85)",
                  backdropFilter: "blur(6px)",
                  border: "1px solid rgba(0, 204, 255, 0.4)",
                  borderRadius: "6px",
                  padding: "4px 8px",
                  fontSize: "11px",
                  fontWeight: 600,
                  color: "#00ccff",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
                }}
              >
                <MapPin className="w-3.5 h-3.5 text-sky-400" />
                <span>Open in Map View</span>
              </div>
            </div>

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
                  className="btn btn--warning flex items-center justify-center gap-1.5"
                  onClick={() => act("in_progress")}
                  disabled={isPending}
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>{isPending ? "Updating…" : "Mark In Progress"}</span>
                </button>
              )}
              {hazard.status !== "resolved" && (
                <button
                  className="btn btn--primary flex items-center justify-center gap-1.5"
                  onClick={() => act("resolved")}
                  disabled={isPending}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{isPending ? "Updating…" : "Mark Resolved"}</span>
                </button>
              )}
              {hazard.status !== "active" && (
                <button
                  className="btn btn--ghost flex items-center justify-center gap-1.5"
                  onClick={() => act("active")}
                  disabled={isPending}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Revert to Active</span>
                </button>
              )}

              {/* Direct Location Map Navigation Button */}
              <button
                type="button"
                className="btn btn--locate flex items-center justify-center gap-2"
                onClick={handleOpenMap}
                style={{
                  background: "linear-gradient(135deg, rgba(0, 204, 255, 0.15), rgba(2, 132, 199, 0.25))",
                  border: "1.5px solid rgba(0, 204, 255, 0.5)",
                  color: "#00ccff",
                  padding: "10px 16px",
                  borderRadius: "8px",
                  fontWeight: 700,
                  fontSize: "13px",
                  boxShadow: "0 2px 10px rgba(0, 204, 255, 0.15)",
                  cursor: "pointer",
                  marginTop: "6px",
                  transition: "all 0.15s ease",
                }}
                title="Go directly to this hazard's exact location on Map View"
              >
                <MapPin className="w-4 h-4 text-sky-400" />
                <span>View Location on Map</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-75" />
              </button>
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
