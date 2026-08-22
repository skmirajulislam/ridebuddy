"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import type { Hazard } from "../_services/api";
import { getGovMapStyle } from "./MapView";

const MAPTILER_KEY = process.env.NEXT_PUBLIC_MAPTILER_KEY || "";

const STATUS_COLOR: Record<string, string> = {
  active: "#00ccff",
  in_progress: "#f59e0b",
  resolved: "#10b981",
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
      zoom: 15,
      maxZoom: 19,
      interactive: false,
      attributionControl: false,
    });

    const styleSpec = getGovMapStyle("streets", MAPTILER_KEY);
    map.setStyle(styleSpec, {
      transformStyle: (_prev, next) => ({
        ...next,
        projection: next.projection ?? { type: "mercator" },
      }),
    });

    map.on("load", () => {
      const color = STATUS_COLOR[status] ?? "#00ccff";
      const el = document.createElement("div");
      el.style.cssText = `
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: ${color};
        border: 2.5px solid white;
        box-shadow: 0 0 8px ${color}88, 0 2px 6px rgba(0,0,0,.4);
      `;
      new maplibregl.Marker({ element: el, anchor: "center" }).setLngLat([lng, lat]).addTo(map);
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
