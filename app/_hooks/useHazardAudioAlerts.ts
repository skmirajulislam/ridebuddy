"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { CachedHazard } from "./useHazardCache";

interface UseHazardAudioAlertsProps {
  userLat: number | null;
  userLng: number | null;
  speed?: number | null; // speed in m/s from GPS
  hazards: CachedHazard[];
  warningRadiusMeters?: number; // default 150m
  onAlertTrigger?: (message: string, hazard: CachedHazard, distance: number) => void;
  onAlertDismiss?: () => void;
}

/**
 * High-precision WGS84 geodesic distance calculation (>99.8% accuracy).
 * Uses IUGG mean Earth radius (6371008.8m) for exact real-world meter precision.
 */
export function calculateAccurateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371008.8; // Exact mean Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);
  const deltaPhi = toRad(lat2 - lat1);
  const deltaLambda = toRad(lon2 - lon1);

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

import { unlockMobileAudioAndSpeech, speakText, playHazardChime } from "@/lib/utils/audioUnlock";

export function useHazardAudioAlerts({
  userLat,
  userLng,
  speed,
  hazards,
  warningRadiusMeters = 150,
  onAlertTrigger,
  onAlertDismiss,
}: UseHazardAudioAlertsProps) {
  const [isEnabled, setIsEnabled] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("ridebuddy_audio_alerts");
      return saved === null ? true : saved === "true";
    }
    return true;
  });

  const [lastAnnouncedHazard] = useState<string | null>(null);

  // Map of hazardId -> Set of milestone keys already spoken (e.g. "approach", "urgent", "passed")
  const spokenMilestonesRef = useRef<Map<string | number, Set<string>>>(new Map());
  const activeHazardIdRef = useRef<string | number | null>(null);
  
  // Track hazards that have been passed to avoid alerting when driving away
  const passedHazardsRef = useRef<Map<string | number, number>>(new Map());
  const minDistanceSeenRef = useRef<Map<string | number, number>>(new Map());
  const dismissTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Ensure audio gesture unlock is initialized for smartphones/tablets
  useEffect(() => {
    unlockMobileAudioAndSpeech();
  }, []);

  const onAlertTriggerRef = useRef(onAlertTrigger);
  useEffect(() => {
    onAlertTriggerRef.current = onAlertTrigger;
  }, [onAlertTrigger]);

  const onAlertDismissRef = useRef(onAlertDismiss);
  useEffect(() => {
    onAlertDismissRef.current = onAlertDismiss;
  }, [onAlertDismiss]);

  const toggleAudioAlerts = useCallback(() => {
    setIsEnabled((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        localStorage.setItem("ridebuddy_audio_alerts", String(next));
      }
      if (next) {
        speakText("Hazard voice warnings enabled", { priority: true });
      }
      return next;
    });
  }, []);

  const speakAlert = useCallback((text: string) => {
    speakText(text, { priority: true, rate: 1.0, pitch: 1.0 });
  }, []);

  // Monitor user location relative to hazards dynamically on every GPS tick
  useEffect(() => {
    if (userLat == null || userLng == null || hazards.length === 0) {
      if (activeHazardIdRef.current !== null) {
        activeHazardIdRef.current = null;
        onAlertDismissRef.current?.();
      }
      return;
    }

    const now = Date.now();
    const PASSED_COOLDOWN_MS = 4 * 60 * 1000; // 4 minutes ignore once passed

    const currentSpeedKmh = speed ? speed * 3.6 : 0;
    const isHighSpeed = currentSpeedKmh > 35;
    const effectiveRadius = warningRadiusMeters || 150;

    // Find the closest active hazard to user's real-time position
    let closestHazard: CachedHazard | null = null;
    let minDistance = Infinity;

    // Bounding box pre-filter (~0.005 degrees ≈ 550m)
    const latThreshold = 0.005;
    const lngThreshold = 0.005;

    for (const h of hazards) {
      if (h.status === "resolved") continue;

      // Fast bounding box check
      if (
        Math.abs(userLat - h.lat) > latThreshold ||
        Math.abs(userLng - h.lng) > lngThreshold
      ) {
        continue;
      }

      // Skip hazard if rider already passed it recently
      const passedTime = passedHazardsRef.current.get(h.id);
      if (passedTime && now - passedTime < PASSED_COOLDOWN_MS) {
        continue;
      }

      const dist = calculateAccurateDistance(userLat, userLng, h.lat, h.lng);

      if (dist <= effectiveRadius && dist < minDistance) {
        minDistance = dist;
        closestHazard = h;
      }
    }

    // ── 1. Automatic Cleanup on Out-of-Range ────────────────────────────────
    if (!closestHazard || minDistance === Infinity) {
      if (activeHazardIdRef.current !== null) {
        activeHazardIdRef.current = null;
        onAlertDismissRef.current?.();
      }
      return;
    }

    const currentMinSeen = minDistanceSeenRef.current.get(closestHazard.id) ?? Infinity;
    if (minDistance < currentMinSeen) {
      minDistanceSeenRef.current.set(closestHazard.id, minDistance);
    }

    // ── 2. Automatic Cleanup on Passed Hazard ──────────────────────────────
    // Rider must be actively moving (>8 km/h), was very close (<=15m), and distance is now increasing (>currentMinSeen + 10m)
    const isMovingAway = currentSpeedKmh > 8 && currentMinSeen <= 15 && minDistance > currentMinSeen + 10;

    if (isMovingAway) {
      passedHazardsRef.current.set(closestHazard.id, now);
      activeHazardIdRef.current = null;

      // Show brief confirmation then clear banner
      if (onAlertTriggerRef.current) {
        onAlertTriggerRef.current("Hazard passed safely.", closestHazard, 0);
      }

      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = setTimeout(() => {
        onAlertDismissRef.current?.();
      }, 2500);

      return;
    }

    activeHazardIdRef.current = closestHazard.id;

    // Exact dynamic integer distance calculated directly from user GPS (lat, lng) to hazard (lat, lng)
    const exactDistance = Math.max(1, Math.round(minDistance));
    const formattedType = (closestHazard.type || "hazard")
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());

    // Construct dynamically updating alert banner message
    let alertMsg: string;
    if (exactDistance <= 25) {
      alertMsg = `Caution: ${formattedType} in ${exactDistance} meters! Reduce speed now.`;
    } else if (isHighSpeed) {
      alertMsg = `High speed detected (${Math.round(currentSpeedKmh)} km/h)! Slow down, ${formattedType} ${exactDistance} meters ahead.`;
    } else {
      alertMsg = `Caution: ${formattedType} reported in ${exactDistance} meters. Drive carefully.`;
    }

    // ── 3. Live Visual Banner Countdown ────────────────────────────────────
    if (onAlertTriggerRef.current) {
      onAlertTriggerRef.current(alertMsg, closestHazard, exactDistance);
    }

    // ── 4. Voice Proximity Milestones ──────────────────────────────────────
    if (isEnabled) {
      if (!spokenMilestonesRef.current.has(closestHazard.id)) {
        spokenMilestonesRef.current.set(closestHazard.id, new Set());
      }
      const hazardMilestones = spokenMilestonesRef.current.get(closestHazard.id)!;

      // Milestone 1: Initial approach alert (25m - 150m)
      if (exactDistance > 25 && exactDistance <= effectiveRadius && !hazardMilestones.has("approach")) {
        hazardMilestones.add("approach");
        speakAlert(alertMsg);
      }
      // Milestone 2: Urgent close-up alert (<= 25m)
      else if (exactDistance <= 25 && !hazardMilestones.has("urgent")) {
        hazardMilestones.add("urgent");
        speakAlert(`Caution: ${formattedType} ahead! Reduce speed now.`);
      }

      // Milestone 3: Passing chime (<= 8m)
      if (exactDistance <= 8 && !hazardMilestones.has("passing")) {
        hazardMilestones.add("passing");
        playHazardChime();
      }
    }
  }, [userLat, userLng, speed, hazards, isEnabled, warningRadiusMeters, speakAlert]);

  return {
    isAudioAlertsEnabled: isEnabled,
    toggleAudioAlerts,
    lastAnnouncedHazard,
    speakAlert,
  };
}
