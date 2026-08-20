"use client";

// app/dashboard/page.tsx
// User dashboard — shows profile and total hazard reports.
// Protected by AuthGuard.

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../_hooks/useAuth";
import AuthGuard from "../_components/AuthGuard";

interface DashboardData {
  user_id: number;
  name: string;
  total_reports: number;
  achievement?: {
    current: number | null;
    next: number | null;
    reached: number[];
    title: string | null;
  };
}

function DashboardContent() {
  const { user, idToken, signOut } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!idToken) return;

    const fetchDashboard = async () => {
      try {
        const res = await fetch(`/api/user/dashboard`, {
          headers: { Authorization: `Bearer ${idToken}` },
        });
        if (!res.ok) throw new Error(`Failed to load dashboard (${res.status})`);
        const json = await res.json();
        setData(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [idToken]);

  const handleSignOut = () => {
    signOut();
    router.replace("/welcome");
  };

  return (
    <main className="dashboard-page">
      <div className="dashboard-orb dashboard-orb--1" aria-hidden="true" />
      <div className="dashboard-orb dashboard-orb--2" aria-hidden="true" />

      <div className="dashboard-container">
        {/* Header */}
        <header className="dashboard-header">
          <Link href="/" className="dashboard-back" aria-label="Back to map">
            ← Map
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {user?.role === "official" && (
              <Link
                href="/gov"
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
                🏛️ GovOps Portal
              </Link>
            )}
            <button
              id="signout-btn"
              className="dashboard-signout"
              onClick={handleSignOut}
            >
              Sign out
            </button>
          </div>
        </header>

        {/* Profile Banner */}
        <div className="dashboard-profile">
          <div className="dashboard-avatar">
            <span className="dashboard-avatar__fallback">
              {(user?.name || "U")[0].toUpperCase()}
            </span>
          </div>
          <div>
            <h1 className="dashboard-name">{user?.name || "Driver"}</h1>
            <p className="dashboard-email">{user?.email}</p>
          </div>
        </div>

        {/* Stats */}
        {loading && (
          <div className="dashboard-loading">
            <div className="auth-spinner" />
            <span>Loading stats...</span>
          </div>
        )}

        {error && (
          <div className="dashboard-error" role="alert">
            {error}
          </div>
        )}

        {data && (
          <>
            <div className="dashboard-stats">
              <div className="dashboard-stat-card dashboard-stat-card--accent">
                <div className="dashboard-stat-card__icon">📍</div>
                <div className="dashboard-stat-card__value">{data.total_reports}</div>
                <div className="dashboard-stat-card__label">Hazards Reported</div>
              </div>

              <div className="dashboard-stat-card">
                <div className="dashboard-stat-card__icon">🆔</div>
                <div className="dashboard-stat-card__value">#{data.user_id}</div>
                <div className="dashboard-stat-card__label">Member ID</div>
              </div>
            </div>

            <div className="dashboard-achievement">
              <div className="dashboard-achievement__icon">
                {data.achievement?.current ? "🏆" : "🎯"}
              </div>
              <div className="dashboard-achievement__content">
                <p className="dashboard-achievement__title">
                  {data.achievement?.title || "First milestone at 50 reports"}
                </p>
                <p className="dashboard-achievement__sub">
                  {data.achievement?.next
                    ? `${Math.max(data.achievement.next - data.total_reports, 0)} more reports to reach ${data.achievement.next}`
                    : "Top milestone reached — amazing contribution!"}
                </p>
              </div>
            </div>
          </>
        )}

        {/* CTA Banner */}
        <div className="dashboard-cta-banner">
          <span className="dashboard-cta-banner__icon">🛡️</span>
          <div>
            <p className="dashboard-cta-banner__title">Keep roads safe!</p>
            <p className="dashboard-cta-banner__sub">Every report protects other drivers.</p>
          </div>
          <Link href="/" className="dashboard-cta-banner__btn">
            Report hazard
          </Link>
        </div>
      </div>
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
