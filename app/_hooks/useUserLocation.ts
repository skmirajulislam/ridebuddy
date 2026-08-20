"use client";

import { useState, useEffect, useRef } from "react";

export interface UserPosition {
  lat: number;
  lng: number;
  accuracy: number;
  speed?: number | null;
  heading?: number | null;
}

export function useUserLocation() {
  const [position, setPosition] = useState<UserPosition | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const watchIdRef = useRef<number | null>(null);
  const retryTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setTimeout(() => setError("Geolocation is not supported by this browser."), 0);
      return;
    }

    let isMounted = true;
    let highAccuracy = true;

    const handleSuccess = (pos: GeolocationPosition) => {
      if (!isMounted) return;
      setPosition({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        speed: pos.coords.speed,
        heading: pos.coords.heading,
      });
      setError(null);
      setIsTracking(true);
    };

    const startWatching = (useHighAccuracy: boolean) => {
      if (typeof navigator === "undefined" || !navigator.geolocation || !isMounted) return;

      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }

      setIsTracking(true);

      try {
        watchIdRef.current = navigator.geolocation.watchPosition(
          handleSuccess,
          (err) => {
            if (!isMounted) return;

            // If high accuracy GPS timed out or satellite fix is unavailable (common on laptops / indoors)
            if (useHighAccuracy && (err.code === 3 || err.code === 2)) {
              console.warn("High-accuracy GPS timed out; falling back to standard/network location.");
              highAccuracy = false;
              startWatching(false);
              return;
            }

            if (err.code === 1) {
              // Permission denied
              setError("Location permission denied. Please allow location access in your browser.");
              setIsTracking(false);
            } else {
              // Non-fatal timeout or temporary loss - schedule silent retry
              console.warn("GPS tracking notice:", err.message);
              if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
              retryTimerRef.current = setTimeout(() => {
                if (isMounted) {
                  startWatching(highAccuracy);
                }
              }, 4000);
            }
          },
          {
            enableHighAccuracy: useHighAccuracy,
            timeout: useHighAccuracy ? 15000 : 30000,
            maximumAge: useHighAccuracy ? 5000 : 30000,
          }
        );
      } catch (e) {
        console.warn("Geolocation watch error:", e);
      }
    };

    // Fast initial check with fallback
    navigator.geolocation.getCurrentPosition(
      handleSuccess,
      () => {
        navigator.geolocation.getCurrentPosition(
          handleSuccess,
          () => {},
          { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 }
        );
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
    );

    // Continuous watch
    startWatching(true);

    return () => {
      isMounted = false;
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
      setIsTracking(false);
    };
  }, []);

  return { position, error, isTracking };
}
