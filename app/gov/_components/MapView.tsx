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

interface MapViewProps {
  hazards: Hazard[];
  selectedId: number | null;
  onSelect: (h: Hazard) => void;
  height?: string | number;
  onUserLocate?: (lng: number, lat: number) => void;
}

export default function MapView({
  hazards,
  selectedId,
  onSelect,
  height = "calc(100vh - 180px)",
  onUserLocate,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const isLoadedRef = useRef(false);

  // Init map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      center: [88.3639, 22.5726],
      zoom: 12,
    });

    const styleUrl = MAPTILER_KEY
      ? `https://api.maptiler.com/maps/streets-v2-light/style.json?key=${MAPTILER_KEY}`
      : "https://demotiles.maplibre.org/style.json";

    map.setStyle(styleUrl);

    map.addControl(new maplibregl.NavigationControl(), "top-right");

    const geolocate = new maplibregl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: true,
    });
    map.addControl(geolocate, "top-right");

    if (onUserLocate) {
      geolocate.on("geolocate", (e: GeolocationPosition) => {
        onUserLocate(e.coords.longitude, e.coords.latitude);
      });
    }

    map.on("load", () => {
      isLoadedRef.current = true;
    });

    mapRef.current = map;

    return () => {
      markersRef.current.forEach((m) => m.remove());
      map.remove();
      mapRef.current = null;
      isLoadedRef.current = false;
    };
  }, [onUserLocate]);

  // Sync markers whenever hazards change
  useEffect(() => {
    if (!mapRef.current) return;

    const addMarkers = () => {
      // Clear existing markers
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];

      hazards.forEach((h) => {
        const el = document.createElement("div");
        const isSelected = h.id === selectedId;
        el.style.cssText = `
          width: ${isSelected ? 18 : 12}px;
          height: ${isSelected ? 18 : 12}px;
          border-radius: 50%;
          background: ${STATUS_COLOR[h.status] ?? "#00ccff"};
          border: ${isSelected ? "3px" : "2px"} solid white;
          box-shadow: 0 1px 6px rgba(0,0,0,${isSelected ? ".4" : ".2"});
          cursor: pointer;
          transition: transform .15s;
        `;
        el.title = `#${h.id} — ${h.type} (${h.status})`;
        el.addEventListener("click", () => onSelect(h));

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([h.lng, h.lat])
          .addTo(mapRef.current!);

        markersRef.current.push(marker);
      });
    };

    if (isLoadedRef.current) {
      addMarkers();
    } else {
      mapRef.current.once("load", addMarkers);
    }
  }, [hazards, selectedId, onSelect]);

  return (
    <div
      className="map-container"
      ref={containerRef}
      style={{ height, width: "100%", borderRadius: "12px", overflow: "hidden" }}
    />
  );
}
