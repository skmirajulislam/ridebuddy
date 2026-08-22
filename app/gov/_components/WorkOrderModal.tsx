"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import {
  FileText,
  Printer,
  Copy,
  Check,
  X,
  MapPin,
  Calendar,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Send,
  Building2,
} from "lucide-react";
import { toast } from "sonner";
import type { Hazard } from "../_services/api";

interface WorkOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  hazard: Hazard | null;
}

export default function WorkOrderModal({ isOpen, onClose, hazard }: WorkOrderModalProps) {
  const [mounted, setMounted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [department, setDepartment] = useState("PWD Highway Engineering Division IV");
  const [contractor, setContractor] = useState("Urban Roadways & Infrastructure Corp.");

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !hazard || !mounted) return null;

  const workOrderId = `PWD-WO-${new Date().getFullYear()}-${String(hazard.id).padStart(5, "0")}`;
  const dateIssued = new Date().toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  // SLA calculation
  const slaHours = hazard.severity === 3 ? 24 : hazard.severity === 2 ? 72 : 168;
  const slaDate = new Date(Date.now() + slaHours * 3600 * 1000).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const severityTitle = hazard.severity === 3 ? "CRITICAL (Immediate Action)" : hazard.severity === 2 ? "MODERATE (Standard SLA)" : "LOW (Routine Maintenance)";

  const handlePrint = () => {
    window.print();
  };

  const handleCopyDispatch = async () => {
    const dispatchText = `🚨 *PWD OFFICIAL REPAIR WORK ORDER*
*Work Order ID:* ${workOrderId}
*Department:* ${department}
*Contractor:* ${contractor}
----------------------------------------
*Hazard Type:* ${hazard.type.toUpperCase()}
*Severity:* ${severityTitle}
*GPS Coordinates:* ${hazard.lat.toFixed(5)}, ${hazard.lng.toFixed(5)}
*Maps Link:* https://www.google.com/maps/search/?api=1&query=${hazard.lat},${hazard.lng}
*SLA Target:* Complete before ${slaDate} (${slaHours}h SLA)
----------------------------------------
*GovOps Direct Link:* https://ridebuddy.app/gov/map?id=${hazard.id}&lat=${hazard.lat}&lng=${hazard.lng}
*Issued By:* Municipal Road Safety Operations Unit`;

    try {
      await navigator.clipboard.writeText(dispatchText);
      setCopied(true);
      toast.success("Work Order dispatch briefing copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  };

  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(6px)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        overflowY: "auto",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "760px",
          backgroundColor: "var(--gov-surface, #ffffff)",
          color: "var(--gov-text, #0f172a)",
          borderRadius: "16px",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.35)",
          border: "1px solid var(--gov-border, #e2e8f0)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          maxHeight: "90vh",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Actions (Hidden in Print) */}
        <div
          className="no-print"
          style={{
            padding: "14px 20px",
            borderBottom: "1px solid var(--gov-border, #e2e8f0)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "var(--gov-surface2, #f8fafc)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <FileText className="w-5 h-5 text-sky-500" />
            <span style={{ fontWeight: 700, fontSize: "15px" }}>Official Municipal Work Order Generator</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              onClick={handleCopyDispatch}
              className="btn btn--ghost"
              style={{ padding: "6px 12px", fontSize: "12px" }}
              title="Copy WhatsApp/SMS dispatch text"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? "Copied!" : "Copy Dispatch"}</span>
            </button>

            <button
              onClick={handlePrint}
              className="btn btn--primary"
              style={{ padding: "6px 12px", fontSize: "12px", gap: "6px" }}
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save PDF</span>
            </button>

            <button
              onClick={onClose}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: "4px",
                color: "var(--gov-text-muted, #64748b)",
              }}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Work Order Body */}
        <div
          id="printable-work-order"
          style={{
            padding: "32px",
            overflowY: "auto",
            fontFamily: "system-ui, -apple-system, sans-serif",
            fontSize: "13px",
            lineHeight: 1.5,
          }}
        >
          {/* Official Letterhead */}
          <div
            style={{
              textAlign: "center",
              borderBottom: "2px solid #0284c7",
              paddingBottom: "16px",
              marginBottom: "20px",
            }}
          >
            <div style={{ fontSize: "11px", letterSpacing: "1.5px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
              Public Works Department • Municipal Road Safety Directorate
            </div>
            <h2 style={{ fontSize: "20px", fontWeight: 800, margin: "6px 0 2px 0", color: "#0284c7" }}>
              ROAD HAZARD REPAIR WORK ORDER
            </h2>
            <div style={{ fontSize: "12px", color: "var(--gov-text-muted, #64748b)" }}>
              Under the Municipal Road Maintenance & Citizen Safety Act
            </div>
          </div>

          {/* Reference & SLA Badges */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "12px",
              marginBottom: "20px",
              padding: "12px",
              background: "var(--gov-surface2, #f8fafc)",
              borderRadius: "10px",
              border: "1px solid var(--gov-border, #e2e8f0)",
            }}
          >
            <div>
              <div style={{ fontSize: "10px", color: "var(--gov-text-muted, #64748b)", textTransform: "uppercase", fontWeight: 600 }}>Work Order No.</div>
              <div style={{ fontWeight: 800, fontSize: "13px", color: "#0284c7" }}>{workOrderId}</div>
            </div>
            <div>
              <div style={{ fontSize: "10px", color: "var(--gov-text-muted, #64748b)", textTransform: "uppercase", fontWeight: 600 }}>Date Issued</div>
              <div style={{ fontWeight: 600 }}>{dateIssued}</div>
            </div>
            <div>
              <div style={{ fontSize: "10px", color: "var(--gov-text-muted, #64748b)", textTransform: "uppercase", fontWeight: 600 }}>SLA Resolution Target</div>
              <div style={{ fontWeight: 700, color: hazard.severity === 3 ? "#ef4444" : "#f59e0b" }}>
                {slaDate} ({slaHours}h)
              </div>
            </div>
          </div>

          {/* Department & Contractor Fields (Editable in Screen Mode) */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 700, marginBottom: "4px", textTransform: "uppercase", color: "var(--gov-text-muted)" }}>
                Executing Division
              </label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  borderRadius: "6px",
                  border: "1px solid var(--gov-border, #cbd5e1)",
                  background: "var(--gov-surface, #fff)",
                  color: "var(--gov-text)",
                  fontSize: "12px",
                  fontWeight: 500,
                }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 700, marginBottom: "4px", textTransform: "uppercase", color: "var(--gov-text-muted)" }}>
                Assigned Contractor / Crew Unit
              </label>
              <input
                type="text"
                value={contractor}
                onChange={(e) => setContractor(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  borderRadius: "6px",
                  border: "1px solid var(--gov-border, #cbd5e1)",
                  background: "var(--gov-surface, #fff)",
                  color: "var(--gov-text)",
                  fontSize: "12px",
                  fontWeight: 500,
                }}
              />
            </div>
          </div>

          {/* Hazard Specs Grid */}
          <div
            style={{
              border: "1px solid var(--gov-border, #e2e8f0)",
              borderRadius: "10px",
              overflow: "hidden",
              marginBottom: "20px",
            }}
          >
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
              <tbody>
                <tr style={{ borderBottom: "1px solid var(--gov-border, #e2e8f0)", background: "var(--gov-surface2, #f8fafc)" }}>
                  <td style={{ padding: "8px 14px", fontWeight: 700, width: "30%" }}>Hazard Type</td>
                  <td style={{ padding: "8px 14px", textTransform: "capitalize", fontWeight: 600 }}>{hazard.type}</td>
                </tr>
                <tr style={{ borderBottom: "1px solid var(--gov-border, #e2e8f0)" }}>
                  <td style={{ padding: "8px 14px", fontWeight: 700 }}>Priority Severity Level</td>
                  <td style={{ padding: "8px 14px", fontWeight: 700, color: hazard.severity === 3 ? "#ef4444" : hazard.severity === 2 ? "#f59e0b" : "#22c55e" }}>
                    Level {hazard.severity} • {severityTitle}
                  </td>
                </tr>
                <tr style={{ borderBottom: "1px solid var(--gov-border, #e2e8f0)", background: "var(--gov-surface2, #f8fafc)" }}>
                  <td style={{ padding: "8px 14px", fontWeight: 700 }}>GPS Geographical Location</td>
                  <td style={{ padding: "8px 14px", fontFamily: "monospace" }}>
                    Latitude: {hazard.lat.toFixed(6)}° N, Longitude: {hazard.lng.toFixed(6)}° E
                  </td>
                </tr>
                <tr style={{ borderBottom: "1px solid var(--gov-border, #e2e8f0)" }}>
                  <td style={{ padding: "8px 14px", fontWeight: 700 }}>AI Gemini Verification</td>
                  <td style={{ padding: "8px 14px", color: "#0284c7", fontWeight: 600 }}>
                    Verified via Multimodal Gemini Vision AI Model
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: "8px 14px", fontWeight: 700, background: "var(--gov-surface2, #f8fafc)" }}>Recommended Repair Scope</td>
                  <td style={{ padding: "8px 14px" }}>
                    Cold-mix bituminous patch, road leveling, compaction & reflective safety perimeter marking.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Photo Evidence Section */}
          {hazard.image_url && (
            <div style={{ marginBottom: "24px" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", marginBottom: "6px", color: "var(--gov-text-muted)" }}>
                Verified Site Evidence (Before Repair)
              </div>
              <div
                style={{
                  borderRadius: "8px",
                  overflow: "hidden",
                  border: "1px solid var(--gov-border, #e2e8f0)",
                  maxHeight: "220px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "#000",
                }}
              >
                <Image
                  src={hazard.image_url}
                  alt="Hazard Evidence"
                  width={600}
                  height={300}
                  unoptimized
                  style={{ maxHeight: "220px", width: "auto", objectFit: "contain" }}
                />
              </div>
            </div>
          )}

          {/* Signatures & Execution Stamp */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "32px",
              marginTop: "40px",
              paddingTop: "20px",
              borderTop: "1px dashed var(--gov-border, #cbd5e1)",
            }}
          >
            <div style={{ textAlign: "center" }}>
              <div style={{ height: "40px" }} />
              <div style={{ borderTop: "1px solid #0f172a", paddingTop: "6px", fontWeight: 700, fontSize: "12px" }}>
                Authorized Municipal Inspector
              </div>
              <div style={{ fontSize: "11px", color: "#64748b" }}>GovOps Road Safety Unit</div>
            </div>

            <div style={{ textAlign: "center" }}>
              <div style={{ height: "40px" }} />
              <div style={{ borderTop: "1px solid #0f172a", paddingTop: "6px", fontWeight: 700, fontSize: "12px" }}>
                Contractor Engineer In-Charge
              </div>
              <div style={{ fontSize: "11px", color: "#64748b" }}>Field Execution & Verification</div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
