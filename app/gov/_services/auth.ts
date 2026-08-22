export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: string;
  token: string;
  avatar_url?: string | null;
  city?: string;
  hobbies?: string[];
  bio?: string | null;
  emergency_contact?: string | null;
}

const TOKEN_KEY = "gov_token";
const USER_KEY = "gov_user";

export const authService = {
  login: async (email: string, password: string): Promise<AuthUser> => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Login failed");

    // Role gate — only officials may access this dashboard
    if (data.user?.role !== "official") {
      throw new Error("Access denied. This portal is restricted to government officials.");
    }

    const authUser: AuthUser = { ...data.user, token: data.token };
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(TOKEN_KEY, data.token);
        localStorage.setItem(USER_KEY, JSON.stringify(authUser));
        localStorage.setItem("rb_token", data.token);
        localStorage.setItem("rb_user", JSON.stringify(authUser));
      } catch (e) {
        console.warn("[Auth] Failed to write to localStorage:", e);
      }
      try {
        sessionStorage.setItem(TOKEN_KEY, data.token);
        sessionStorage.setItem(USER_KEY, JSON.stringify(authUser));
        sessionStorage.setItem("rb_token", data.token);
        sessionStorage.setItem("rb_user", JSON.stringify(authUser));
      } catch (e) {
        console.warn("[Auth] Failed to write to sessionStorage:", e);
      }
      try {
        window.dispatchEvent(new Event("rb_auth_change"));
      } catch {}
    }
    return authUser;
  },

  logout: () => {
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        localStorage.removeItem("rb_token");
        localStorage.removeItem("rb_user");
      } catch {}
      try {
        sessionStorage.removeItem(TOKEN_KEY);
        sessionStorage.removeItem(USER_KEY);
        sessionStorage.removeItem("rb_token");
        sessionStorage.removeItem("rb_user");
      } catch {}
      try {
        window.dispatchEvent(new Event("rb_auth_change"));
      } catch {}
    }
  },

  getToken: (): string | null => {
    if (typeof window === "undefined") return null;
    try {
      return (
        localStorage.getItem(TOKEN_KEY) ||
        sessionStorage.getItem(TOKEN_KEY) ||
        localStorage.getItem("rb_token") ||
        sessionStorage.getItem("rb_token")
      );
    } catch {
      return null;
    }
  },

  getUser: (): AuthUser | null => {
    if (typeof window === "undefined") return null;
    try {
      const raw =
        localStorage.getItem(USER_KEY) ||
        sessionStorage.getItem(USER_KEY) ||
        localStorage.getItem("rb_user") ||
        sessionStorage.getItem("rb_user");
      if (!raw) return null;
      return JSON.parse(raw) as AuthUser;
    } catch {
      return null;
    }
  },

  isAuthenticated: (): boolean => {
    const user = authService.getUser();
    return !!user && user.role === "official";
  },
};
