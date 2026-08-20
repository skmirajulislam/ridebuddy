"use client";

// app/_hooks/useAuth.ts
// Custom JWT auth with globally synchronized state across all app components.
// Provides: user, loading, idToken, signIn, signUp, resetPassword, signOut, updateUser.

import { useState, useEffect, useCallback } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
const TOKEN_KEY = "rb_token";
const USER_KEY = "rb_user";
const AUTH_EVENT = "rb_auth_state_changed";

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role?: string;
  handle?: string;
  avatar_url?: string | null;
  bio?: string | null;
  hobbies?: string[];
}

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  idToken: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  resetPassword: (email: string) => Promise<string>;
  signOut: () => void;
  updateUser: (updatedData: Partial<AuthUser>) => void;
}

async function apiFetch(path: string, body: object) {
  const base = API_URL.endsWith("/") ? API_URL.slice(0, -1) : API_URL;
  const res = await fetch(`${base}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
  return data;
}

function notifyAuthChange() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(AUTH_EVENT));
  }
}

export function getInitialAuthState(): { user: AuthUser | null; idToken: string | null } {
  if (typeof window === "undefined") {
    return { user: null, idToken: null };
  }
  try {
    const storedToken =
      localStorage.getItem(TOKEN_KEY) ||
      sessionStorage.getItem(TOKEN_KEY) ||
      localStorage.getItem("gov_token") ||
      sessionStorage.getItem("gov_token");

    const storedUser =
      localStorage.getItem(USER_KEY) ||
      sessionStorage.getItem(USER_KEY) ||
      localStorage.getItem("gov_user") ||
      sessionStorage.getItem("gov_user");

    if (storedToken && storedUser) {
      return { user: JSON.parse(storedUser), idToken: storedToken };
    }
  } catch {
    // Storage access error — fallback
  }
  return { user: null, idToken: null };
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<AuthUser | null>(() => getInitialAuthState().user);
  const [idToken, setIdToken] = useState<string | null>(() => getInitialAuthState().idToken);
  const [loading, setLoading] = useState(false);

  // Sync state whenever auth changes across any component or tab
  useEffect(() => {
    const syncState = () => {
      const current = getInitialAuthState();
      setUser(current.user);
      setIdToken(current.idToken);
    };

    // Run initial sync on mount (handles SSR hydration sync)
    syncState();

    window.addEventListener(AUTH_EVENT, syncState);
    window.addEventListener("storage", syncState);

    return () => {
      window.removeEventListener(AUTH_EVENT, syncState);
      window.removeEventListener("storage", syncState);
    };
  }, []);

  const persist = useCallback((token: string, userData: AuthUser) => {
    try {
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(userData));
      sessionStorage.setItem(TOKEN_KEY, token);
      sessionStorage.setItem(USER_KEY, JSON.stringify(userData));
      if (userData.role === "official") {
        localStorage.setItem("gov_token", token);
        localStorage.setItem("gov_user", JSON.stringify(userData));
        sessionStorage.setItem("gov_token", token);
        sessionStorage.setItem("gov_user", JSON.stringify(userData));
      }
    } catch {
      // ignore
    }
    setIdToken(token);
    setUser(userData);
    notifyAuthChange();
  }, []);

  const updateUser = useCallback((updatedData: Partial<AuthUser>) => {
    const current = getInitialAuthState().user || user;
    if (!current) return;
    const merged = { ...current, ...updatedData };
    try {
      localStorage.setItem(USER_KEY, JSON.stringify(merged));
      sessionStorage.setItem(USER_KEY, JSON.stringify(merged));
      if (merged.role === "official") {
        localStorage.setItem("gov_user", JSON.stringify(merged));
        sessionStorage.setItem("gov_user", JSON.stringify(merged));
      }
    } catch {
      // ignore
    }
    setUser(merged);
    notifyAuthChange();
  }, [user]);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      const data = await apiFetch("/api/auth/login", { email, password });
      persist(data.token, data.user);
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, displayName: string) => {
    setLoading(true);
    try {
      const data = await apiFetch("/api/auth/register", {
        email,
        password,
        name: displayName,
      });
      persist(data.token, data.user);
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (): Promise<string> => {
    throw new Error(
      "Password reset via email is not configured yet. Please contact support or create a new account."
    );
  };

  const signOut = useCallback(() => {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem("gov_token");
      localStorage.removeItem("gov_user");
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(USER_KEY);
      sessionStorage.removeItem("gov_token");
      sessionStorage.removeItem("gov_user");
    } catch {
      // ignore
    }
    setIdToken(null);
    setUser(null);
    notifyAuthChange();
  }, []);

  return { user, loading, idToken, signIn, signUp, resetPassword, signOut, updateUser };
}
