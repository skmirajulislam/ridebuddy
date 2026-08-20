"use client";

// app/_hooks/useAuth.ts
// Custom JWT auth — no Firebase. Tokens stored in sessionStorage.
// Provides: user, loading, idToken, signIn, signUp, resetPassword, signOut, updateUser.

import { useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
const TOKEN_KEY = "rb_token";
const USER_KEY = "rb_user";

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

function getInitialAuthState(): { user: AuthUser | null; idToken: string | null } {
  if (typeof window === "undefined") {
    return { user: null, idToken: null };
  }
  try {
    const storedToken = sessionStorage.getItem(TOKEN_KEY) || sessionStorage.getItem("gov_token");
    const storedUser = sessionStorage.getItem(USER_KEY) || sessionStorage.getItem("gov_user");
    if (storedToken && storedUser) {
      return { user: JSON.parse(storedUser), idToken: storedToken };
    }
  } catch {
    // sessionStorage not available (SSR) — skip
  }
  return { user: null, idToken: null };
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<AuthUser | null>(() => getInitialAuthState().user);
  const [idToken, setIdToken] = useState<string | null>(() => getInitialAuthState().idToken);
  const [loading, setLoading] = useState(false);

  const persist = (token: string, userData: AuthUser) => {
    sessionStorage.setItem(TOKEN_KEY, token);
    sessionStorage.setItem(USER_KEY, JSON.stringify(userData));
    if (userData.role === "official") {
      sessionStorage.setItem("gov_token", token);
      sessionStorage.setItem("gov_user", JSON.stringify(userData));
    }
    setIdToken(token);
    setUser(userData);
  };

  const updateUser = (updatedData: Partial<AuthUser>) => {
    if (!user) return;
    const merged = { ...user, ...updatedData };
    sessionStorage.setItem(USER_KEY, JSON.stringify(merged));
    if (merged.role === "official") {
      sessionStorage.setItem("gov_user", JSON.stringify(merged));
    }
    setUser(merged);
  };

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

  const signOut = () => {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    sessionStorage.removeItem("gov_token");
    sessionStorage.removeItem("gov_user");
    setIdToken(null);
    setUser(null);
  };

  return { user, loading, idToken, signIn, signUp, resetPassword, signOut, updateUser };
}
