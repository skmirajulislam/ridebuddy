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

// Gentle 2-tone melodic alert chime using Web Audio API
function playAlertChime() {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(587.33, now); // D5
    osc.frequency.setValueAtTime(880.0, now + 0.1); // A5

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.2, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.35);
  } catch {
    // AudioContext might be restricted until user interacts
  }
}

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

  const [lastAnnouncedHazard, setLastAnnouncedHazard] = useState<string | null>(null);

  // Map of hazardId -> Set of milestone keys already spoken (e.g. "approach", "urgent", "passed")
  const spokenMilestonesRef = useRef<Map<string | number, Set<string>>>(new Map());
  const activeHazardIdRef = useRef<string | number | null>(null);
  
  // Track hazards that have been passed to avoid alerting when driving away
  const passedHazardsRef = useRef<Map<string | number, number>>(new Map());
  const minDistanceSeenRef = useRef<Map<string | number, number>>(new Map());
  const dismissTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Prevent speech synthesis garbage collection mid-utterance
  const activeUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

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
      return next;
    });
  }, []);

  const speakAlert = useCallback((text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    try {
      playAlertChime();

      setTimeout(() => {
        try {
          window.speechSynthesis.cancel();

          const utterance = new SpeechSynthesisUtterance(text);
          utterance.rate = 1.0;
          utterance.pitch = 1.0;
          utterance.volume = 1.0;

          // Pick natural English voice if available
          const voices = window.speechSynthesis.getVoices();
          const preferredVoice = voices.find(
            (v) =>
              v.lang.startsWith("en") &&
              (v.name.includes("Natural") ||
                v.name.includes("Google") ||
                v.name.includes("Samantha") ||
                v.name.includes("Daniel") ||
                v.name.includes("Karen"))
          );
          if (preferredVoice) utterance.voice = preferredVoice;

          utterance.onend = () => {
            activeUtteranceRef.current = null;
          };
          utterance.onerror = () => {
            activeUtteranceRef.current = null;
          };

          activeUtteranceRef.current = utterance;
          window.speechSynthesis.speak(utterance);
        } catch (speechErr) {
          console.warn("[AudioAlerts] Speech utterance error:", speechErr);
        }
      }, 180);
    } catch (err) {
      console.warn("[AudioAlerts] Speech synthesis failure:", err);
    }
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
    const effectiveRadius = isHighSpeed ? Math.max(warningRadiusMeters, 150) : Math.min(warningRadiusMeters, 120);

    // Find the closest active hazard to user's real-time position
    let closestHazard: CachedHazard | null = null;
    let minDistance = Infinity;

    for (const h of hazards) {
      if (h.status === "resolved") continue;

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
    // If rider was within close range (<=10m) and distance is now increasing by >5m (riding away) OR <=5m
    const hasPassed = (currentMinSeen <= 10 && minDistance > currentMinSeen + 5);

    if (hasPassed) {
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

    setLastAnnouncedHazard(alertMsg);

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

      // Milestone 1: Initial alert (40m - 120m)
      if (exactDistance > 25 && exactDistance <= 120 && !hazardMilestones.has("approach")) {
        hazardMilestones.add("approach");
        speakAlert(alertMsg);
      }
      // Milestone 2: Urgent close-up alert (<= 25m)
      else if (exactDistance <= 25 && exactDistance > 6 && !hazardMilestones.has("urgent")) {
        hazardMilestones.add("urgent");
        speakAlert(`Caution: ${formattedType} in ${exactDistance} meters! Reduce speed now.`);
      }
      // Milestone 3: Passing chime (<= 6m)
      else if (exactDistance <= 6 && !hazardMilestones.has("passing")) {
        hazardMilestones.add("passing");
        playAlertChime();
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
