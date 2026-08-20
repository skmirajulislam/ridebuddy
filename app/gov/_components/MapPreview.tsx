"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import type { Hazard } from "../_services/api";

const MAPTILER_KEY = process.env.NEXT_PUBLIC_MAPTILER_KEY || "";

const STATUS_COLOR: Record<string, string> = {
  active: "#00ccff",
  in_progress: "#f6ad55",
  resolved: "#a0aec0",
};

interface MapPreviewProps {
  lat: number;
  lng: number;
  status: Hazard["status"];
  height?: number;
}

export default function MapPreview({
  lat,
  lng,
  status,
  height = 160,
}: MapPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    if (mapRef.current) {
      mapRef.current.remove();
    }

    const map = new maplibregl.Map({
      container: containerRef.current,
      center: [lng, lat],
      zoom: 14,
      interactive: false,
      attributionControl: false,
    });

    const styleUrl = MAPTILER_KEY
      ? `https://api.maptiler.com/maps/streets-v2-light/style.json?key=${MAPTILER_KEY}`
      : "https://demotiles.maplibre.org/style.json";

    map.setStyle(styleUrl);

    map.on("load", () => {
      const el = document.createElement("div");
      el.style.cssText = `
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: ${STATUS_COLOR[status] ?? "#00ccff"};
        border: 2px solid white;
        box-shadow: 0 1px 4px rgba(0,0,0,.4);
      `;
      new maplibregl.Marker({ element: el }).setLngLat([lng, lat]).addTo(map);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [lat, lng, status]);

  return (
    <div
      ref={containerRef}
      style={{
        height,
        width: "100%",
        borderRadius: "8px",
        overflow: "hidden",
        border: "1px solid var(--gov-border)",
      }}
    />
  );
}
