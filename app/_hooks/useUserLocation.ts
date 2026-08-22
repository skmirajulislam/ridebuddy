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
      maximumAge: 0, // Never use cached GPS positions — force real-time hardware satellite querying
      timeout: 6000, // Short timeout for rapid continuous updates
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
      setIsTracking(true);
    } catch (e) {
      console.warn("[GPS] watchPosition failed:", e);
    }

    // 3. Active Real-Time Polling Loop (1.5s interval)
    // Ensures continuous real-time updates even when walking slowly or stationary near a hazard
    pollIntervalRef.current = setInterval(() => {
      if (!isMounted) return;
      navigator.geolocation.getCurrentPosition(
        handleSuccess,
        () => {
          // If high-accuracy query times out, retry without breaking state
        },
        geoOptions
      );
    }, 1500);

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
      setIsTracking(false);
    };
  }, []);

  return { position, error, isTracking };
}
