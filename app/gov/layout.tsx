"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthContext, useAuthContext } from "./_store/auth.store";
import { authService, type AuthUser } from "./_services/auth";
import Sidebar from "./_components/Sidebar";
import "./gov.css";

function GovLayoutContent({ children }: { children: React.ReactNode }) {
  const { user, setUser } = useAuthContext();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const syncUser = () => {
      const stored = authService.getUser();
      if (stored && stored.role === "official") {
        setUser(stored);
        setCheckingAuth(false);
      } else {
        setUser(null);
        setCheckingAuth(false);
        if (pathname !== "/gov/login") {
          router.replace("/gov/login");
        }
      }
    };

    syncUser();

    window.addEventListener("rb_auth_state_changed", syncUser);
    window.addEventListener("rb_auth_change", syncUser);
    window.addEventListener("storage", syncUser);

    return () => {
      window.removeEventListener("rb_auth_state_changed", syncUser);
      window.removeEventListener("rb_auth_change", syncUser);
      window.removeEventListener("storage", syncUser);
    };
  }, [pathname, router, setUser]);

  if (pathname === "/gov/login") {
    return <div className="gov-body-wrapper">{children}</div>;
  }

  if (checkingAuth || !user || user.role !== "official") {
    return (
      <div
        className="gov-body-wrapper"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
        }}
      >
        <span className="spinner" />
      </div>
    );
  }

  return (
    <div className="gov-body-wrapper gov-layout">
      <Sidebar />
      <div className="gov-main">{children}</div>
    </div>
  );
}

export default function GovLayout({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
      })
  );

  const [user, setUser] = useState<AuthUser | null>(() => authService.getUser());

  return (
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={{ user, setUser }}>
        <GovLayoutContent>{children}</GovLayoutContent>
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}
