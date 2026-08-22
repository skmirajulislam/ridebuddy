"use client";

import React, { useMemo, useState } from "react";
import Image from "next/image";
import { Users, Award, ShieldAlert, CheckCircle2, Filter, X, Sparkles, ChevronRight } from "lucide-react";
import type { Hazard } from "../_services/api";

interface ContributorLeaderboardProps {
  hazards: Hazard[];
  selectedUserId: number | null;
  onSelectUser: (userId: number | null) => void;
}

interface UserContribution {
  userId: number;
  name: string;
  handle: string;
  avatar: string | null;
  totalReports: number;
  activeReports: number;
  resolvedReports: number;
  dominantType: string;
  lastReportedAt: string;
}

export default function ContributorLeaderboard({
  hazards,
  selectedUserId,
  onSelectUser,
}: ContributorLeaderboardProps) {
  // Aggregate contributions per citizen user
  const contributions = useMemo(() => {
    const map = new Map<number, UserContribution>();

    hazards.forEach((h) => {
      const uid = h.user_id || 0; // 0 for anonymous/guest
      const name = h.reporter_name || (uid === 0 ? "Anonymous Citizen" : `Citizen #${uid}`);
      const handle = h.reporter_handle || (uid === 0 ? "@anonymous" : `@citizen_${uid}`);
      const avatar = h.reporter_avatar || null;

      const existing = map.get(uid);
      if (existing) {
        existing.totalReports += 1;
        if (h.status === "active" || h.status === "in_progress") existing.activeReports += 1;
        if (h.status === "resolved") existing.resolvedReports += 1;
        if (new Date(h.created_at).getTime() > new Date(existing.lastReportedAt).getTime()) {
          existing.lastReportedAt = h.created_at;
        }
      } else {
        map.set(uid, {
          userId: uid,
          name,
          handle,
          avatar,
          totalReports: 1,
          activeReports: h.status === "active" || h.status === "in_progress" ? 1 : 0,
          resolvedReports: h.status === "resolved" ? 1 : 0,
          dominantType: h.type,
          lastReportedAt: h.created_at,
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => b.totalReports - a.totalReports);
  }, [hazards]);

  const selectedContributor = contributions.find((c) => c.userId === selectedUserId);

  return (
    <div className="data-table-card" style={{ marginBottom: "24px" }}>
      {/* Card Header */}
      <div
        className="data-table-card__header"
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "8px",
              background: "rgba(0, 204, 255, 0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#00ccff",
            }}
          >
            <Users className="w-4 h-4" />
          </div>
          <div>
            <div className="data-table-card__title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span>Citizen Safety Contributors</span>
              <span
                style={{
                  fontSize: "11px",
                  padding: "2px 8px",
                  borderRadius: "999px",
                  background: "rgba(0, 204, 255, 0.12)",
                  color: "#38bdf8",
                  fontWeight: 700,
                  border: "1px solid rgba(0, 204, 255, 0.25)",
                }}
              >
                {contributions.length} Active {contributions.length === 1 ? "Reporter" : "Reporters"}
              </span>
            </div>
            <div className="data-table-card__count">
              Track community members reporting road hazards and verified ground conditions
            </div>
          </div>
        </div>

        {/* Selected User Filter Active Banner */}
        {selectedUserId !== null && selectedContributor && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "4px 12px",
              borderRadius: "8px",
              background: "rgba(0, 204, 255, 0.15)",
              border: "1px solid rgba(0, 204, 255, 0.4)",
              color: "var(--gov-text, #fff)",
              fontSize: "12px",
            }}
          >
            <span>
              Filtering by: <strong>{selectedContributor.name}</strong> (UID #{selectedContributor.userId})
            </span>
            <button
              onClick={() => onSelectUser(null)}
              style={{
                background: "none",
                border: "none",
                color: "#38bdf8",
                cursor: "pointer",
                padding: "2px",
                display: "flex",
                alignItems: "center",
              }}
              title="Clear user filter"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Contributor Cards Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: "14px",
          padding: "16px",
        }}
      >
        {contributions.map((user, idx) => {
          const isSelected = selectedUserId === user.userId;
          const initials = user.name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2) || "CR";

          return (
            <div
              key={user.userId}
              onClick={() => onSelectUser(isSelected ? null : user.userId)}
              style={{
                position: "relative",
                padding: "14px",
                borderRadius: "12px",
                background: isSelected
                  ? "linear-gradient(135deg, rgba(0, 204, 255, 0.15), rgba(15, 23, 42, 0.8))"
                  : "var(--gov-surface2, rgba(255, 255, 255, 0.03))",
                border: isSelected
                  ? "1.5px solid #00ccff"
                  : "1px solid var(--gov-border, rgba(255, 255, 255, 0.08))",
                cursor: "pointer",
                transition: "all 0.15s ease",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                boxShadow: isSelected ? "0 4px 20px rgba(0, 204, 255, 0.18)" : "none",
              }}
            >
              {/* User Identity Header */}
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                {/* Rank Badge */}
                <div
                  style={{
                    fontSize: "11px",
                    fontWeight: 800,
                    color: idx === 0 ? "#fbbf24" : idx === 1 ? "#cbd5e1" : idx === 2 ? "#d97706" : "var(--gov-text-muted)",
                    width: "20px",
                    textAlign: "center",
                  }}
                >
                  #{idx + 1}
                </div>

                {/* Avatar */}
                {user.avatar ? (
                  <div
                    style={{
                      position: "relative",
                      width: "36px",
                      height: "36px",
                      borderRadius: "50%",
                      overflow: "hidden",
                      border: "1.5px solid var(--gov-border-strong)",
                      flexShrink: 0,
                    }}
                  >
                    <Image
                      src={user.avatar}
                      alt={user.name}
                      fill
                      unoptimized
                      style={{ objectFit: "cover" }}
                    />
                  </div>
                ) : (
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "50%",
                      background: "linear-gradient(135deg, #00ccff, #3b82f6)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#fff",
                      fontSize: "13px",
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {initials}
                  </div>
                )}

                <div style={{ minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      fontSize: "13px",
                      fontWeight: 700,
                      color: "var(--gov-text, #fff)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {user.name}
                  </div>
                  <div
                    style={{
                      fontSize: "11px",
                      color: "var(--gov-text-muted, #94a3b8)",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <span>{user.handle}</span>
                    <span>•</span>
                    <span style={{ fontFamily: "monospace", color: "#38bdf8", fontWeight: 600 }}>
                      UID #{user.userId}
                    </span>
                  </div>
                </div>
              </div>

              {/* Contribution Metric Badges */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "8px",
                  padding: "8px 10px",
                  borderRadius: "8px",
                  background: "rgba(0, 0, 0, 0.2)",
                  border: "1px solid var(--gov-border, rgba(255, 255, 255, 0.05))",
                }}
              >
                <div>
                  <div style={{ fontSize: "10px", color: "var(--gov-text-muted)", textTransform: "uppercase" }}>
                    Total Contributed
                  </div>
                  <div style={{ fontSize: "14px", fontWeight: 700, color: "#00ccff" }}>
                    {user.totalReports} {user.totalReports === 1 ? "report" : "reports"}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: "10px", color: "var(--gov-text-muted)", textTransform: "uppercase" }}>
                    Active / Open
                  </div>
                  <div style={{ fontSize: "14px", fontWeight: 700, color: user.activeReports > 0 ? "#f59e0b" : "#22c55e" }}>
                    {user.activeReports} Active
                  </div>
                </div>
              </div>

              {/* Click to filter hint */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  fontSize: "11px",
                  color: isSelected ? "#38bdf8" : "var(--gov-text-muted)",
                  fontWeight: 600,
                }}
              >
                <span>{isSelected ? "✓ Filter Active" : "Click to view reports"}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </div>
          );
        })}

        {contributions.length === 0 && (
          <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "24px", color: "var(--gov-text-muted)" }}>
            No citizen contributions recorded yet.
          </div>
        )}
      </div>
    </div>
  );
}
