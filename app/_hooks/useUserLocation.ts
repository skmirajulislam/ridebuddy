"use client";

import { useState, useEffect } from "react";

export interface UserPosition {
  lat: number;
  lng: number;
  accuracy: number;
}

export function useUserLocation() {
  const [position, setPosition] = useState<UserPosition | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isTracking, setIsTracking] = useState(false);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setError("Geolocation is not supported by this browser.");
      return;
    }

    setIsTracking(true);

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setPosition({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        setError(null);
      },
      (err) => {
        setError(err.message);
        setIsTracking(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000,
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
      setIsTracking(false);
    };
  }, []);

  return { position, error, isTracking };
}
