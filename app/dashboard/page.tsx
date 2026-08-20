"use client";

// app/dashboard/page.tsx
// User dashboard — shows profile, unique handle, bio, hobbies, stats, and achievements with sleek Lucide icons.

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  MapPin,
  Trophy,
  Target,
  ShieldCheck,
  Landmark,
  LogOut,
  ArrowLeft,
  Hash,
  Edit3,
  Tag,
  Copy,
  CheckCheck,
} from "lucide-react";
import { useAuth } from "../_hooks/useAuth";
import AuthGuard from "../_components/AuthGuard";
import ProfileModal from "../_components/ProfileModal";
import type { UserProfile } from "@/lib/services/user.service";

function DashboardContent() {
  const { user, idToken, signOut } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<"profile" | "contributions">("profile");
  const [copied, setCopied] = useState(false);

  const fetchProfile = async () => {
    if (!idToken) return;
    try {
      const res = await fetch(`/api/user/profile`, {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (!res.ok) throw new Error(`Failed to load profile (${res.status})`);
      const json = await res.json();
      setProfile(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idToken]);

  const handleSignOut = () => {
    signOut();
    router.replace("/welcome");
  };

  const handleCopyHandle = () => {
    const handleToCopy = profile?.handle || user?.handle;
    if (!handleToCopy) return;
    navigator.clipboard.writeText(`@${handleToCopy.replace(/^@/, "")}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const displayName = profile?.name || user?.name || "Driver";
  const displayHandle = profile?.handle || user?.handle || `rider_${user?.id || "00"}`;
  const displayAvatar = profile?.avatar_url || user?.avatar_url;
  const displayBio = profile?.bio || user?.bio;
  const displayHobbies = profile?.hobbies || user?.hobbies || [];
  const totalReports = profile?.total_reports || 0;
  const achievement = profile?.achievement;

  return (
    <main className="dashboard-page">
      <div className="dashboard-orb dashboard-orb--1" aria-hidden="true" />
      <div className="dashboard-orb dashboard-orb--2" aria-hidden="true" />

      <div className="dashboard-container">
        {/* Header */}
        <header className="dashboard-header flex items-center justify-between">
          <Link href="/" className="dashboard-back flex items-center gap-1.5" aria-label="Back to map">
            <ArrowLeft className="w-4 h-4" />
            <span>Map</span>
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {user?.role === "official" && (
              <Link
                href="/gov"
                className="flex items-center gap-1.5"
                style={{
                  fontSize: "12px",
                  padding: "6px 12px",
                  borderRadius: "8px",
                  background: "rgba(0, 204, 255, 0.15)",
                  color: "#00ccff",
                  fontWeight: 600,
                  border: "1px solid rgba(0, 204, 255, 0.3)",
                }}
              >
                <Landmark className="w-3.5 h-3.5" />
                <span>GovOps Portal</span>
              </Link>
            )}
            <button
              id="signout-btn"
              className="dashboard-signout flex items-center gap-1.5"
              onClick={handleSignOut}
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign out</span>
            </button>
          </div>
        </header>

        {/* Profile Card Banner */}
        <div
          className="dashboard-profile"
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <div
                style={{
                  width: "68px",
                  height: "68px",
                  borderRadius: "50%",
                  overflow: "hidden",
                  border: "2.5px solid #38bdf8",
                  boxShadow: "0 0 16px rgba(56, 189, 248, 0.35)",
                  background: "linear-gradient(135deg, #0284c7, #6366f1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {displayAvatar ? (
                  <Image
                    src={displayAvatar}
                    alt={displayName}
                    width={68}
                    height={68}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    unoptimized
                  />
                ) : (
                  <span style={{ fontSize: "26px", fontWeight: "bold", color: "#fff" }}>
                    {displayName[0]?.toUpperCase()}
                  </span>
                )}
              </div>

              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <h1 className="dashboard-name" style={{ margin: 0, fontSize: "22px" }}>
                    {displayName}
                  </h1>
                </div>

                {/* Unique ID / Handle */}
                <div
                  onClick={handleCopyHandle}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    marginTop: "4px",
                    background: "rgba(56, 189, 248, 0.12)",
                    border: "1px solid rgba(56, 189, 248, 0.3)",
                    padding: "2px 10px",
                    borderRadius: "999px",
                    cursor: "pointer",
                  }}
                  title="Click to copy unique handle"
                >
                  <span style={{ fontSize: "12px", fontWeight: "600", color: "#38bdf8", fontFamily: "monospace" }}>
                    @{displayHandle.replace(/^@/, "")}
                  </span>
                  {copied ? (
                    <CheckCheck className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <Copy className="w-3 h-3 text-sky-400 opacity-75" />
                  )}
                </div>

                <p className="dashboard-email" style={{ marginTop: "3px", fontSize: "13px" }}>
                  {user?.email}
                </p>
              </div>
            </div>

            {/* Edit Profile Button */}
            <button
              onClick={() => setProfileModalOpen(true)}
              style={{
                padding: "8px 16px",
                borderRadius: "10px",
                background: "rgba(56, 189, 248, 0.15)",
                border: "1px solid rgba(56, 189, 248, 0.35)",
                color: "#38bdf8",
                fontWeight: "600",
                fontSize: "13px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                transition: "all 0.2s",
              }}
            >
              <Edit3 className="w-4 h-4" />
              <span>Edit Profile</span>
            </button>
          </div>

          {/* Bio Snippet */}
          {displayBio && (
            <div
              style={{
                padding: "10px 14px",
                background: "rgba(15, 23, 42, 0.5)",
                borderRadius: "12px",
                border: "1px solid rgba(255, 255, 255, 0.06)",
                fontSize: "13px",
                color: "#cbd5e1",
                lineHeight: "1.5",
              }}
            >
              {displayBio}
            </div>
          )}

          {/* Hobbies Pills */}
          {displayHobbies && displayHobbies.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <Tag className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" />
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {displayHobbies.map((hobby, i) => (
                  <span
                    key={i}
                    style={{
                      padding: "3px 10px",
                      borderRadius: "999px",
                      background: "rgba(14, 165, 233, 0.15)",
                      border: "1px solid rgba(14, 165, 233, 0.3)",
                      color: "#38bdf8",
                      fontSize: "11px",
                      fontWeight: "500",
                    }}
                  >
                    {hobby}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Stats */}
        {loading && (
          <div className="dashboard-loading">
            <div className="auth-spinner" />
            <span>Loading profile & stats...</span>
          </div>
        )}

        {error && (
          <div className="dashboard-error" role="alert">
            {error}
          </div>
        )}

        {profile && (
          <>
            <div className="dashboard-stats">
              <div
                className="dashboard-stat-card dashboard-stat-card--accent"
                onClick={() => {
                  setModalTab("contributions");
                  setProfileModalOpen(true);
                }}
                style={{ cursor: "pointer" }}
                title="Click to view all your reported hazards"
              >
                <div className="dashboard-stat-card__icon flex items-center justify-center text-sky-400">
                  <MapPin className="w-5 h-5" />
                </div>
                <div className="dashboard-stat-card__value">{totalReports}</div>
                <div className="dashboard-stat-card__label flex items-center gap-1">
                  <span>Hazards Reported</span>
                  <span style={{ fontSize: "10px", color: "#38bdf8" }}>(View)</span>
                </div>
              </div>

              <div className="dashboard-stat-card">
                <div className="dashboard-stat-card__icon flex items-center justify-center text-indigo-400">
                  <Hash className="w-5 h-5" />
                </div>
                <div className="dashboard-stat-card__value">#{profile.id}</div>
                <div className="dashboard-stat-card__label">Member ID</div>
              </div>
            </div>

            <div className="dashboard-achievement flex items-center gap-3">
              <div className="dashboard-achievement__icon flex items-center justify-center w-10 h-10 rounded-xl bg-amber-500/15 text-amber-400 flex-shrink-0">
                {achievement?.current ? (
                  <Trophy className="w-5 h-5" />
                ) : (
                  <Target className="w-5 h-5" />
                )}
              </div>
              <div className="dashboard-achievement__content flex-1">
                <p className="dashboard-achievement__title">
                  {achievement?.title || "First milestone at 10 reports"}
                </p>
                <p className="dashboard-achievement__sub">
                  {achievement?.next
                    ? `${Math.max(achievement.next - totalReports, 0)} more reports to reach ${achievement.next}`
                    : "Top milestone reached — amazing contribution!"}
                </p>
              </div>
            </div>
          </>
        )}

        {/* CTA Banner */}
        <div className="dashboard-cta-banner flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex-shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <p className="dashboard-cta-banner__title">Keep roads safe!</p>
            <p className="dashboard-cta-banner__sub">Every report protects other drivers with live contributor credit.</p>
          </div>
          <Link href="/" className="dashboard-cta-banner__btn">
            Open Map
          </Link>
        </div>
      </div>

      {/* Profile Modal */}
      <ProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        onProfileUpdated={fetchProfile}
        initialTab={modalTab}
      />
    </main>
  );
}

export default function DashboardPage() {
  return (
    <AuthGuard>
      <DashboardContent />
    </AuthGuard>
  );
}
