"use client";

import { useCallback, useState } from "react";

const CACHE_KEY = "ridebuddy_hazards_v1";
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export interface CachedHazard {
  id: number;
  type: string;
  lat: number;
  lng: number;
  severity: number;
  status?: string;
  image_url?: string | null;
  reporter_name?: string | null;
  reporter_handle?: string | null;
  reporter_avatar?: string | null;
  reporter_bio?: string | null;
  reporter_hobbies?: string[];
  created_at?: string;
}

const isClient = typeof window !== "undefined";

export function useHazardCache() {
  const [isStale, setIsStale] = useState(false);

  const getCache = useCallback((): CachedHazard[] | null => {
    if (!isClient) return null;
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const { data, timestamp } = JSON.parse(raw) as {
        data: CachedHazard[];
        timestamp: number;
      };
      if (Date.now() - timestamp > CACHE_TTL_MS) {
        setIsStale(true);
        return data; // return stale data as offline fallback
      }
      setIsStale(false);
      return data;
    } catch {
      return null;
    }
  }, []);

  const setCache = useCallback((hazards: CachedHazard[]) => {
    if (!isClient) return;
    try {
      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({ data: hazards, timestamp: Date.now() })
      );
      setIsStale(false);
    } catch {
      // Storage quota exceeded — silently skip
    }
  }, []);

  const clearCache = useCallback(() => {
    if (!isClient) return;
    localStorage.removeItem(CACHE_KEY);
  }, []);

  return { getCache, setCache, clearCache, isStale };
}
