"use client";

import { useState, useEffect, useRef } from "react";

export interface UserPosition {
  lat: number;
  lng: number;
  accuracy: number;
  speed?: number | null;
  heading?: number | null;
  timestamp: number;
}

export function useUserLocation() {
  const [position, setPosition] = useState<UserPosition | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const watchIdRef = useRef<number | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastPosRef = useRef<{ lat: number; lng: number; time: number } | null>(null);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setTimeout(() => setError("Geolocation is not supported by this browser."), 0);
      return;
    }

    let isMounted = true;

    const handleSuccess = (pos: GeolocationPosition) => {
      if (!isMounted) return;

      const newLat = pos.coords.latitude;
      const newLng = pos.coords.longitude;
      const now = Date.now();

      // Ensure fresh state update
      lastPosRef.current = { lat: newLat, lng: newLng, time: now };

      setPosition({
        lat: newLat,
        lng: newLng,
        accuracy: pos.coords.accuracy,
        speed: pos.coords.speed,
        heading: pos.coords.heading,
        timestamp: pos.timestamp || now,
      });

      setError(null);
      setIsTracking(true);
    };

    const handleError = (err: GeolocationPositionError) => {
      if (!isMounted) return;
      if (err.code === 1) {
        setError("Location permission denied. Please allow location access in your browser.");
        setIsTracking(false);
      } else {
        console.warn("[GPS] Location notice:", err.message);
      }
    };

    const geoOptions: PositionOptions = {
      enableHighAccuracy: true,
      maximumAge: 1000, // 1s freshness - optimal for 60Hz mobile navigation without draining battery
      timeout: 8000,
    };

    // 1. Initial fast GPS query
    navigator.geolocation.getCurrentPosition(handleSuccess, handleError, geoOptions);

    // 2. Hardware GPS Stream Watcher
    try {
      watchIdRef.current = navigator.geolocation.watchPosition(
        handleSuccess,
        handleError,
        geoOptions
      );
    } catch (e) {
      console.warn("[GPS] watchPosition failed:", e);
    }

    // 3. Fallback Heartbeat (4s interval) — only queries if watchPosition stalls
    pollIntervalRef.current = setInterval(() => {
      if (!isMounted) return;
      const timeSinceLastPos = Date.now() - (lastPosRef.current?.time || 0);
      if (timeSinceLastPos > 3500) {
        navigator.geolocation.getCurrentPosition(handleSuccess, () => {}, geoOptions);
      }
    }, 4000);

    return () => {
      isMounted = false;
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (pollIntervalRef.current !== null) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, []);

  return { position, error, isTracking };
}
