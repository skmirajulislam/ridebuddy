"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import { getOfflineHazards, removeOfflineHazard, getPendingOfflineCount } from "@/lib/offline/offlineQueue";

interface UseOfflineSyncOptions {
  idToken: string | null;
  onSyncComplete?: () => void;
}

export function useOfflineSync({ idToken, onSyncComplete }: UseOfflineSyncOptions) {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const isSyncingRef = useRef(false);

  const refreshPendingCount = useCallback(async () => {
    try {
      const count = await getPendingOfflineCount();
      setPendingCount(count);
    } catch {
      // ignore in environments without indexedDB
    }
  }, []);

  const syncPendingHazards = useCallback(async () => {
    if (!navigator.onLine || isSyncingRef.current) return;

    try {
      const items = await getOfflineHazards();
      if (items.length === 0) return;

      isSyncingRef.current = true;
      setIsSyncing(true);

      toast.info(`Syncing ${items.length} offline hazard report${items.length > 1 ? "s" : ""}...`);

      let successCount = 0;

      for (const item of items) {
        try {
          const formData = new FormData();
          formData.append("type", item.type);
          formData.append("severity", String(item.severity));
          formData.append("lat", String(item.lat));
          formData.append("lng", String(item.lng));
          formData.append("image", item.imageBlob, item.imageName || "hazard.jpg");

          const headers: Record<string, string> = {};
          if (idToken) {
            headers["Authorization"] = `Bearer ${idToken}`;
          }

          const res = await fetch("/api/hazards", {
            method: "POST",
            headers,
            body: formData,
          });

          if (res.ok) {
            await removeOfflineHazard(item.id);
            successCount++;
          } else {
            console.warn(`[OfflineSync] Hazard ${item.id} upload failed with status ${res.status}`);
          }
        } catch (uploadErr) {
          console.warn(`[OfflineSync] Network error syncing hazard ${item.id}:`, uploadErr);
        }
      }

      if (successCount > 0) {
        toast.success(`Successfully uploaded ${successCount} queued hazard report${successCount > 1 ? "s" : ""}!`);
        if (onSyncComplete) {
          onSyncComplete();
        }
      }

      await refreshPendingCount();
    } catch (err) {
      console.warn("[OfflineSync] Error during background sync:", err);
    } finally {
      isSyncingRef.current = false;
      setIsSyncing(false);
    }
  }, [idToken, onSyncComplete, refreshPendingCount]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    setIsOnline(navigator.onLine);
    refreshPendingCount();

    const handleOnline = () => {
      setIsOnline(true);
      toast.success("Network connection restored!");
      syncPendingHazards();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.warning("You are currently offline. Reports will be saved locally and auto-synced.");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Initial check if we are online and have items pending
    if (navigator.onLine) {
      syncPendingHazards();
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [syncPendingHazards, refreshPendingCount]);

  return {
    isOnline,
    pendingCount,
    isSyncing,
    syncPendingHazards,
    refreshPendingCount,
  };
}
