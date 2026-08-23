"use client";

import React, { useState, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { formatDistanceToNow, format } from "date-fns";
import { X, Play, CheckCircle2, RotateCcw, MapPin, ExternalLink, FileText, ZoomIn, Upload, Camera, ShieldCheck, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import type { Hazard } from "../_services/api";
import { useUpdateStatus } from "../_hooks/useHazards";
import { StatusBadge } from "./DataTable";
import MapPreview from "./MapPreview";
import WorkOrderModal from "./WorkOrderModal";
import ImageLightboxModal from "./ImageLightboxModal";

interface HazardPanelProps {
  hazard: Hazard | null;
  onClose: () => void;
}

const SEV_LABEL: Record<number, string> = { 1: "Low", 2: "Medium", 3: "High" };

export default function HazardPanel({ hazard, onClose }: HazardPanelProps) {
  const router = useRouter();
  const { mutate: updateStatus, isPending } = useUpdateStatus();
  const [workOrderOpen, setWorkOrderOpen] = useState(false);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [repairImageModalOpen, setRepairImageModalOpen] = useState(false);
  const [repairUploading, setRepairUploading] = useState(false);
  const repairFileRef = useRef<HTMLInputElement>(null);

  const act = (status: Hazard["status"], repairImageUrl?: string | null) => {
    if (!hazard) return;
    updateStatus({ id: hazard.id, status, repair_image_url: repairImageUrl });
  };

  const handleResolveWithProof = async () => {
    repairFileRef.current?.click();
  };

  const handleRepairFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !hazard) return;

    setRepairUploading(true);
    try {
      // Convert to base64 and upload via UploadThing
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64 = (reader.result as string).split(",")[1];
          const res = await fetch("/api/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              base64,
              mimeType: file.type || "image/jpeg",
              fileName: `repair_proof_hazard_${hazard.id}_${Date.now()}.jpg`,
            }),
          });

          if (res.ok) {
            const data = await res.json();
            const repairUrl = data.url || data.fileUrl;
            if (repairUrl) {
              act("resolved", repairUrl);
              toast.success("Repair proof uploaded! Hazard marked resolved.", { icon: "📸" });
            } else {
              // Upload succeeded but no URL — resolve without image
              act("resolved");
              toast.info("Hazard marked resolved (upload returned no URL).");
            }
          } else {
            // Upload failed — still resolve but without repair image
            act("resolved");
            toast.info("Hazard marked resolved (repair photo upload failed).");
          }
        } catch {
          act("resolved");
          toast.info("Hazard marked resolved (repair photo could not be processed).");
        } finally {
          setRepairUploading(false);
        }
      };
      reader.onerror = () => {
        act("resolved");
        toast.info("Hazard marked resolved.");
        setRepairUploading(false);
      };
      reader.readAsDataURL(file);
    } catch {
      act("resolved");
      setRepairUploading(false);
    }

    // Reset file input
    if (repairFileRef.current) repairFileRef.current.value = "";
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
            {/* Photo Evidence if available - Clickable to open full image popup */}
            {hazard.image_url && (
              <div
                onClick={() => setImageModalOpen(true)}
                style={{
                  position: "relative",
                  width: "100%",
                  height: "180px",
                  borderRadius: "8px",
                  overflow: "hidden",
                  border: "1px solid var(--gov-border)",
                  cursor: "pointer",
                }}
                className="group"
                title="Click to view full photo evidence"
              >
                <Image
                  src={hazard.image_url}
                  alt="Hazard photo"
                  fill
                  unoptimized
                  sizes="(max-width: 768px) 100vw, 400px"
                  style={{
                    objectFit: "cover",
                    display: "block",
                    transition: "transform 0.2s ease",
                  }}
                />

                {/* Hover overlay banner */}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "rgba(0, 0, 0, 0.4)",
                    opacity: 0,
                    transition: "opacity 0.2s ease",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    color: "#fff",
                    fontSize: "12px",
                    fontWeight: 600,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = "0")}
                >
                  <ZoomIn className="w-4 h-4 text-sky-400" />
                  <span>Click to view complete image</span>
                </div>
              </div>
            )}

            {/* Repair Proof Photo (if resolved with repair proof) */}
            {hazard.status === "resolved" && hazard.repair_image_url && (
              <div
                onClick={() => setRepairImageModalOpen(true)}
                style={{
                  position: "relative",
                  width: "100%",
                  height: "140px",
                  borderRadius: "8px",
                  overflow: "hidden",
                  border: "1.5px solid rgba(34, 197, 94, 0.5)",
                  cursor: "pointer",
                  marginTop: "8px",
                }}
                title="Click to view repair proof photo"
              >
                <Image
                  src={hazard.repair_image_url}
                  alt="Repair proof photo"
                  fill
                  unoptimized
                  sizes="(max-width: 768px) 100vw, 400px"
                  style={{ objectFit: "cover" }}
                />
                <div
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    background: "linear-gradient(transparent, rgba(0,0,0,0.75))",
                    padding: "6px 10px",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    fontSize: "11px",
                    fontWeight: 600,
                    color: "#22c55e",
                  }}
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Repair Proof Photo</span>
                </div>
              </div>
            )}

            {/* Repair Verification Status Badge */}
            {hazard.status === "resolved" && hazard.repair_image_url && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "8px 12px",
                  borderRadius: "8px",
                  marginTop: "8px",
                  background: hazard.repair_verified
                    ? "rgba(34, 197, 94, 0.12)"
                    : "rgba(234, 179, 8, 0.12)",
                  border: `1px solid ${hazard.repair_verified ? "rgba(34, 197, 94, 0.4)" : "rgba(234, 179, 8, 0.4)"}`,
                }}
              >
                {hazard.repair_verified ? (
                  <>
                    <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <div>
                      <div style={{ fontSize: "12px", fontWeight: 700, color: "#22c55e" }}>
                        ✅ SLA Quality Stamp — Citizen Verified
                      </div>
                      <div style={{ fontSize: "11px", color: "var(--gov-text-muted)", marginTop: "2px" }}>
                        {hazard.repair_verify_count || 2} riders confirmed repair • {hazard.repair_verified_at ? format(new Date(hazard.repair_verified_at), "dd MMM yyyy, HH:mm") : ""}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    <div>
                      <div style={{ fontSize: "12px", fontWeight: 700, color: "#eab308" }}>
                        ⏳ Awaiting Citizen Verification
                      </div>
                      <div style={{ fontSize: "11px", color: "var(--gov-text-muted)", marginTop: "2px" }}>
                        Repair proof uploaded — riders passing by will be prompted to verify
                      </div>
                    </div>
                  </>
                )}
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
                  disabled={isPending || repairUploading}
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>{isPending ? "Updating…" : "Mark In Progress"}</span>
                </button>
              )}
              {hazard.status !== "resolved" && (
                <>
                  {/* Resolve with repair proof photo (primary action) */}
                  <button
                    className="btn btn--primary flex items-center justify-center gap-1.5"
                    onClick={handleResolveWithProof}
                    disabled={isPending || repairUploading}
                    style={{ position: "relative" }}
                  >
                    {repairUploading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Upload className="w-3.5 h-3.5" />
                    )}
                    <span>{repairUploading ? "Uploading Repair Proof…" : "Resolve + Upload Repair Proof"}</span>
                  </button>
                  {/* Quick resolve without photo */}
                  <button
                    className="btn flex items-center justify-center gap-1.5"
                    onClick={() => act("resolved")}
                    disabled={isPending || repairUploading}
                    style={{
                      background: "var(--gov-surface2)",
                      border: "1px solid var(--gov-border)",
                      color: "var(--gov-text-muted)",
                      padding: "7px 14px",
                      borderRadius: "8px",
                      fontSize: "12px",
                      cursor: "pointer",
                    }}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Quick Resolve (No Photo)</span>
                  </button>
                </>
              )}
              {hazard.status !== "active" && (
                <button
                  className="btn btn--ghost flex items-center justify-center gap-1.5"
                  onClick={() => act("active")}
                  disabled={isPending || repairUploading}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Revert to Active</span>
                </button>
              )}

              {/* Generate PWD Work Order Button */}
              <button
                type="button"
                className="btn flex items-center justify-center gap-2"
                onClick={() => setWorkOrderOpen(true)}
                style={{
                  background: "var(--gov-surface2)",
                  border: "1px solid var(--gov-border-strong)",
                  color: "var(--gov-text)",
                  padding: "9px 16px",
                  borderRadius: "8px",
                  fontWeight: 600,
                  fontSize: "13px",
                  cursor: "pointer",
                  marginTop: "4px",
                }}
                title="Generate printable PWD repair work order & dispatch briefing"
              >
                <FileText className="w-4 h-4 text-amber-400" />
                <span>Generate PWD Work Order</span>
              </button>

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
                  marginTop: "4px",
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

      {/* Hidden file input for repair proof photo */}
      <input
        ref={repairFileRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: "none" }}
        onChange={handleRepairFileChange}
      />

      {/* Official PWD Work Order Modal */}
      <WorkOrderModal
        isOpen={workOrderOpen}
        onClose={() => setWorkOrderOpen(false)}
        hazard={hazard}
      />

      {/* Full Resolution Photo Lightbox Modal */}
      {hazard && hazard.image_url && (
        <ImageLightboxModal
          isOpen={imageModalOpen}
          onClose={() => setImageModalOpen(false)}
          imageUrl={hazard.image_url}
          title={`${hazard.type.charAt(0).toUpperCase() + hazard.type.slice(1)} Photo Evidence • Hazard #${hazard.id}`}
          subtitle={`Reported at [${hazard.lat.toFixed(6)}, ${hazard.lng.toFixed(6)}] • Severity Level ${hazard.severity}`}
        />
      )}

      {/* Repair Proof Photo Lightbox Modal */}
      {hazard && hazard.repair_image_url && (
        <ImageLightboxModal
          isOpen={repairImageModalOpen}
          onClose={() => setRepairImageModalOpen(false)}
          imageUrl={hazard.repair_image_url}
          title={`Repair Proof • Hazard #${hazard.id}`}
          subtitle={`Resolved ${hazard.resolved_at ? format(new Date(hazard.resolved_at), "dd MMM yyyy, HH:mm") : ""} • ${hazard.repair_verified ? "✅ Citizen Verified" : "⏳ Awaiting Verification"}`}
        />
      )}
    </div>
  );
}
