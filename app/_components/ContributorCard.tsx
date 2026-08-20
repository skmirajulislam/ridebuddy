"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { X, Award, MapPin, Tag, ShieldCheck, Loader2 } from "lucide-react";
import type { PublicUserProfile } from "@/lib/services/user.service";

interface ContributorCardProps {
  handleOrId: string | number | null;
  isOpen: boolean;
  onClose: () => void;
  initialData?: {
    name?: string | null;
    handle?: string | null;
    avatar_url?: string | null;
    bio?: string | null;
    hobbies?: string[];
  };
}

export default function ContributorCard({
  handleOrId,
  isOpen,
  onClose,
  initialData,
}: ContributorCardProps) {
  const [profile, setProfile] = useState<PublicUserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !handleOrId) return;

    const fetchContributor = async () => {
      setLoading(true);
      setError(null);
      try {
        const cleanHandle = String(handleOrId).replace(/^@/, "");
        const res = await fetch(`/api/user/${encodeURIComponent(cleanHandle)}`);
        if (res.ok) {
          const data = await res.json();
          setProfile(data);
        } else {
          // If public API fails, use initialData fallback if available
          if (initialData?.name || initialData?.handle) {
            setProfile({
              id: 0,
              name: initialData.name || "RideBuddy Contributor",
              handle: initialData.handle || cleanHandle,
              avatar_url: initialData.avatar_url || null,
              bio: initialData.bio || null,
              hobbies: initialData.hobbies || [],
              total_reports: 1,
              achievement: { current: 1, next: 25, reached: [], title: "Active Contributor" },
              created_at: new Date().toISOString(),
            });
          } else {
            setError("Contributor profile not found");
          }
        }
      } catch (err) {
        console.error("Contributor fetch error:", err);
        setError("Could not load contributor details");
      } finally {
        setLoading(false);
      }
    };

    fetchContributor();
  }, [isOpen, handleOrId, initialData]);

  if (!isOpen) return null;

  const displayData = profile || {
    id: 0,
    name: initialData?.name || "RideBuddy Contributor",
    handle: initialData?.handle || String(handleOrId || "rider"),
    avatar_url: initialData?.avatar_url || null,
    bio: initialData?.bio || null,
    hobbies: initialData?.hobbies || [],
    total_reports: 1,
    achievement: { current: 1, next: 25, reached: [], title: "Verified Reporter" },
    created_at: new Date().toISOString(),
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        backgroundColor: "rgba(3, 7, 18, 0.8)",
        backdropFilter: "blur(10px)",
      }}
      onClick={onClose}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: "460px",
          maxHeight: "85vh",
          overflowY: "auto",
          background: "linear-gradient(135deg, rgba(15, 23, 42, 0.96), rgba(30, 41, 59, 0.94))",
          border: "1px solid rgba(56, 189, 248, 0.3)",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.75), 0 0 30px rgba(56, 189, 248, 0.15)",
          borderRadius: "24px",
          padding: "26px",
          color: "#f8fafc",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: "18px",
            right: "18px",
            width: "34px",
            height: "34px",
            borderRadius: "50%",
            background: "rgba(255, 255, 255, 0.08)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            color: "#94a3b8",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {loading ? (
          <div style={{ padding: "50px 0", textAlign: "center" }}>
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#38bdf8", margin: "0 auto 12px" }} />
            <p style={{ color: "#94a3b8", fontSize: "14px" }}>Loading contributor profile...</p>
          </div>
        ) : error && !profile ? (
          <div style={{ padding: "30px 0", textAlign: "center" }}>
            <p style={{ color: "#ef4444", fontSize: "14px" }}>{error}</p>
          </div>
        ) : (
          <div>
            {/* Contributor Avatar & Name */}
            <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "20px" }}>
              <div
                style={{
                  width: "74px",
                  height: "74px",
                  borderRadius: "50%",
                  overflow: "hidden",
                  border: "2.5px solid #38bdf8",
                  boxShadow: "0 0 16px rgba(56, 189, 248, 0.3)",
                  background: "linear-gradient(135deg, #0284c7, #6366f1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {displayData.avatar_url ? (
                  <Image
                    src={displayData.avatar_url}
                    alt={displayData.name}
                    width={74}
                    height={74}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    unoptimized
                  />
                ) : (
                  <span style={{ fontSize: "28px", fontWeight: "bold", color: "#fff" }}>
                    {(displayData.name || "C")[0]?.toUpperCase()}
                  </span>
                )}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                  <h3 style={{ fontSize: "20px", fontWeight: "700", margin: 0, color: "#f8fafc" }}>
                    {displayData.name}
                  </h3>
                  <span title="Verified Road Contributor">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  </span>
                </div>

                <div
                  style={{
                    display: "inline-block",
                    marginTop: "4px",
                    background: "rgba(56, 189, 248, 0.12)",
                    border: "1px solid rgba(56, 189, 248, 0.28)",
                    padding: "2px 8px",
                    borderRadius: "999px",
                    fontSize: "12px",
                    fontWeight: "600",
                    color: "#38bdf8",
                    fontFamily: "monospace",
                  }}
                >
                  @{displayData.handle?.replace(/^@/, "")}
                </div>

                <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "4px" }}>
                  Road Sentinel & Safety Contributor
                </div>
              </div>
            </div>

            {/* Badges / Stats Bar */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "10px",
                marginBottom: "20px",
                padding: "12px 14px",
                background: "rgba(15, 23, 42, 0.6)",
                borderRadius: "14px",
                border: "1px solid rgba(255, 255, 255, 0.08)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div
                  style={{
                    width: "34px",
                    height: "34px",
                    borderRadius: "8px",
                    background: "rgba(56, 189, 248, 0.15)",
                    color: "#38bdf8",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <div style={{ fontSize: "15px", fontWeight: "700", color: "#f8fafc" }}>
                    {displayData.total_reports}
                  </div>
                  <div style={{ fontSize: "10px", color: "#94a3b8" }}>Hazards Shared</div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div
                  style={{
                    width: "34px",
                    height: "34px",
                    borderRadius: "8px",
                    background: "rgba(245, 158, 11, 0.15)",
                    color: "#f59e0b",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Award className="w-4 h-4" />
                </div>
                <div>
                  <div style={{ fontSize: "12px", fontWeight: "600", color: "#f59e0b" }}>
                    {displayData.achievement?.title || "Contributor"}
                  </div>
                  <div style={{ fontSize: "10px", color: "#94a3b8" }}>Community Badge</div>
                </div>
              </div>
            </div>

            {/* Description / Bio */}
            {displayData.bio && (
              <div style={{ marginBottom: "18px" }}>
                <label style={{ fontSize: "11px", fontWeight: "600", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  About Contributor
                </label>
                <div
                  style={{
                    marginTop: "6px",
                    padding: "12px 14px",
                    background: "rgba(15, 23, 42, 0.4)",
                    borderRadius: "12px",
                    border: "1px solid rgba(255, 255, 255, 0.06)",
                    fontSize: "13px",
                    lineHeight: "1.5",
                    color: "#e2e8f0",
                  }}
                >
                  {displayData.bio}
                </div>
              </div>
            )}

            {/* Hobbies / Interests */}
            {displayData.hobbies && displayData.hobbies.length > 0 && (
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
                  <Tag className="w-3.5 h-3.5 text-sky-400" />
                  <label style={{ fontSize: "11px", fontWeight: "600", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Hobbies & Riding Style
                  </label>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {displayData.hobbies.map((h, i) => (
                    <span
                      key={i}
                      style={{
                        padding: "5px 10px",
                        borderRadius: "999px",
                        background: "rgba(14, 165, 233, 0.15)",
                        border: "1px solid rgba(14, 165, 233, 0.3)",
                        color: "#38bdf8",
                        fontSize: "11px",
                        fontWeight: "500",
                      }}
                    >
                      {h}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
