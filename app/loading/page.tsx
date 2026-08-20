"use client";

// app/loading/page.tsx
// Transitional loading screen shown after sign-in with sleek animated Lucide icon.

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";
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
      <div className="loading-content flex flex-col items-center justify-center">
        <div className="loading-logo flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-sky-500 to-blue-600 text-white shadow-xl shadow-sky-500/30 mb-4 animate-pulse">
          <ShieldCheck className="w-9 h-9" />
        </div>
        <div className="loading-spinner-ring" aria-label="Loading" role="status" />
        <p className="loading-headline font-semibold text-lg text-slate-100 mt-4">Setting up RideBuddy</p>
        <p className="loading-sub text-sm text-slate-400">Syncing your account...</p>
      </div>
    </main>
  );
}
