"use client";

// app/loading/page.tsx
// Transitional loading screen shown after sign-in while auth + backend sync completes.
// Auto-redirects to / once user is confirmed.

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../_hooks/useAuth";

export default function LoadingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (user) {
      // Small delay for UX — feels intentional rather than a flash
      const timer = setTimeout(() => router.replace("/"), 1200);
      return () => clearTimeout(timer);
    } else {
      router.replace("/welcome");
    }
  }, [user, loading, router]);

  return (
    <main className="loading-page">
      <div className="loading-orb" aria-hidden="true" />
      <div className="loading-content">
        <div className="loading-logo">🛡️</div>
        <div className="loading-spinner-ring" aria-label="Loading" role="status" />
        <p className="loading-headline">Setting up RideBuddy</p>
        <p className="loading-sub">Syncing your account...</p>
      </div>
    </main>
  );
}
