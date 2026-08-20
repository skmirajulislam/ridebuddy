"use client";

// app/_components/AuthGuard.tsx
// Client-side route guard. Redirects unauthenticated users to /welcome.
// Wrap any page that requires auth with this component.

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../_hooks/useAuth";

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/welcome");
    }
  }, [user, loading, router]);

  // Show nothing while resolving auth state — avoids flash of content
  if (loading) {
    return (
      <div className="auth-loading-screen">
        <div className="auth-spinner" />
        <p className="auth-loading-text">Loading RideBuddy...</p>
      </div>
    );
  }

  // Don't render children until user is confirmed
  if (!user) return null;

  return <>{children}</>;
}
