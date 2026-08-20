import { authService } from "./auth";

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = authService.getToken();
  const res = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers || {}),
    },
  });

  if (res.status === 401) {
    authService.logout();
    if (typeof window !== "undefined" && !window.location.pathname.includes("/gov/login")) {
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = "/gov/login";
    }
    throw new Error("Session expired");
  }

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
  return data as T;
}

export interface Hazard {
  id: number;
  type: string;
  lat: number;
  lng: number;
  severity: number;
  status: "active" | "in_progress" | "resolved";
  confidence: number | null;
  created_at: string;
  resolved_at: string | null;
  resolved_by_user_id: number | null;
  user_id: number | null;
  image_url?: string | null;
}

export interface GovStats {
  total: string;
  active: string;
  in_progress: string;
  resolved: string;
}

export const api = {
  /** GET all hazards */
  getHazards: () => request<Hazard[]>("/api/hazards"),

  /** GET gov stats */
  getStats: () => request<GovStats>("/api/gov/stats"),

  /** PATCH hazard status */
  updateStatus: (id: number, status: "active" | "in_progress" | "resolved") =>
    request<Hazard>(`/api/hazards/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
};
