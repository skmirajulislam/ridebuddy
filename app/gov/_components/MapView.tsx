"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import type { Hazard } from "../_services/api";
import { Layers, MapPin, ZoomIn, ZoomOut, Compass } from "lucide-react";

const MAPTILER_KEY = process.env.NEXT_PUBLIC_MAPTILER_KEY || "";

const STATUS_COLOR: Record<string, string> = {
  active: "#00ccff",
  in_progress: "#f59e0b",
  resolved: "#10b981",
};

export type GovMapTheme = "streets" | "dark" | "satellite";

export function createRasterStyle(tiles: string[]): maplibregl.StyleSpecification {
  return {
    version: 8,
    sources: {
      "gov-tiles": {
        type: "raster",
        tiles,
        tileSize: 256,
        maxzoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="https://carto.com/">CARTO</a>',
      },
    },
    layers: [
      {
        id: "gov-tiles-layer",
        type: "raster",
        source: "gov-tiles",
        minzoom: 0,
        maxzoom: 19,
      },
    ],
  };
}

export function getGovMapStyle(theme: GovMapTheme, key?: string): maplibregl.StyleSpecification | string {
  if (key) {
    if (theme === "satellite") return `https://api.maptiler.com/maps/hybrid/style.json?key=${key}`;
    if (theme === "dark") return `https://api.maptiler.com/maps/streets-v2-dark/style.json?key=${key}`;
    return `https://api.maptiler.com/maps/streets-v2-light/style.json?key=${key}`;
  }

  if (theme === "satellite") {
    return createRasterStyle([
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    ]);
  }

  if (theme === "dark") {
    return createRasterStyle([
      "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
      "https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
      "https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
    ]);
  }

  // Default: Crisp CARTO Voyager with full global roads, highways, street labels & landmarks
  return createRasterStyle([
    "https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
    "https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
    "https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
  ]);
}

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
  const [theme, setTheme] = useState<GovMapTheme>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("gov_theme") === "dark" ? "dark" : "streets";
    }
    return "streets";
  });

  const onUserLocateRef = useRef(onUserLocate);
  useEffect(() => {
    onUserLocateRef.current = onUserLocate;
  }, [onUserLocate]);

  const selectedIdRef = useRef(selectedId);
  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  // Sync map layer when GovOps global theme toggles
  useEffect(() => {
    const onGlobalThemeChange = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      if (customEvent.detail === "dark") {
        handleThemeChange("dark");
      } else if (customEvent.detail === "light") {
        handleThemeChange("streets");
      }
    };

    window.addEventListener("gov_theme_changed", onGlobalThemeChange);
    return () => window.removeEventListener("gov_theme_changed", onGlobalThemeChange);
  }, []);

  // Initialize map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      center: [88.3639, 22.5726],
      zoom: 13,
      maxZoom: 19,
    });

    const styleSpec = getGovMapStyle(theme, MAPTILER_KEY);
    map.setStyle(styleSpec, {
      diff: false,
      transformStyle: (_prev, next) => ({
        ...next,
        projection: next.projection ?? { type: "mercator" },
      }),
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: true, showZoom: true }), "top-right");
    map.addControl(new maplibregl.FullscreenControl(), "top-right");

    const geolocate = new maplibregl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: true,
      showUserLocation: true,
    });
    map.addControl(geolocate, "top-right");

    geolocate.on("geolocate", (e: GeolocationPosition) => {
      onUserLocateRef.current?.(e.coords.longitude, e.coords.latitude);
      if (!selectedIdRef.current) {
        map.flyTo({
          center: [e.coords.longitude, e.coords.latitude],
          zoom: 15,
          duration: 800,
        });
      }
    });

    map.on("load", () => {
      isLoadedRef.current = true;

      // Center on official's live device GPS location on initial load if no specific hazard is selected
      if (!selectedIdRef.current && typeof navigator !== "undefined" && navigator.geolocation) {
        const handleLocateSuccess = (pos: GeolocationPosition) => {
          const { longitude, latitude } = pos.coords;
          onUserLocateRef.current?.(longitude, latitude);
          if (mapRef.current && !selectedIdRef.current) {
            mapRef.current.flyTo({
              center: [longitude, latitude],
              zoom: 15,
              duration: 900,
            });
          }
        };

        navigator.geolocation.getCurrentPosition(
          handleLocateSuccess,
          () => {
            // High-accuracy GPS timed out/indoor fallback: try standard network/IP geolocation
            navigator.geolocation.getCurrentPosition(
              handleLocateSuccess,
              () => {
                // Device location completely unavailable or permission not yet given
              },
              { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
            );
          },
          { enableHighAccuracy: true, timeout: 6000, maximumAge: 0 }
        );
      }
    });

    // Suppress missing sprite image warnings
    map.on("styleimagemissing", (e: { id: string }) => {
      if (!e.id || e.id.trim() === "") return;
      const emptyImage = new ImageData(new Uint8ClampedArray(4), 1, 1);
      map.addImage(e.id, emptyImage);
    });

    mapRef.current = map;

    return () => {
      markersRef.current.forEach((m) => m.remove());
      map.remove();
      mapRef.current = null;
      isLoadedRef.current = false;
    };
  }, []);

  // Switch Theme
  const handleThemeChange = (newTheme: GovMapTheme) => {
    setTheme(newTheme);
    if (!mapRef.current) return;

    const styleSpec = getGovMapStyle(newTheme, MAPTILER_KEY);
    mapRef.current.setStyle(styleSpec, {
      diff: false,
      transformStyle: (_prev, next) => ({
        ...next,
        projection: next.projection ?? { type: "mercator" },
      }),
    });
  };

  // Sync markers & fit bounds
  useEffect(() => {
    if (!mapRef.current) return;

    const renderMarkers = () => {
      const map = mapRef.current;
      if (!map) return;

      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];

      if (hazards.length === 0) return;

      const bounds = new maplibregl.LngLatBounds();

      hazards.forEach((h) => {
        if (!h.lng || !h.lat || isNaN(h.lng) || isNaN(h.lat)) return;

        bounds.extend([h.lng, h.lat]);

        const isSelected = h.id === selectedId;
        const color = STATUS_COLOR[h.status] ?? "#00ccff";

        const el = document.createElement("div");
        el.className = "gov-map-marker-container";
        el.style.cursor = "pointer";

        const inner = document.createElement("div");
        inner.className = "gov-map-marker";
        inner.style.cssText = `
          width: ${isSelected ? "22px" : "16px"};
          height: ${isSelected ? "22px" : "16px"};
          border-radius: 50%;
          background: ${color};
          border: ${isSelected ? "3.5px solid #ffffff" : "2px solid #ffffff"};
          box-shadow: 0 0 10px ${color}88, 0 2px 6px rgba(0,0,0,0.4);
          transition: transform 0.15s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        `;

        inner.title = `#${h.id} — ${h.type.toUpperCase()} (${h.status})`;

        // Scale only the inner element, never modifying MapLibre's outer positioning transform
        inner.addEventListener("mouseenter", () => {
          inner.style.transform = "scale(1.35)";
        });
        inner.addEventListener("mouseleave", () => {
          inner.style.transform = "scale(1)";
        });

        el.appendChild(inner);

        el.addEventListener("click", (e) => {
          e.stopPropagation();
          onSelect(h);
        });

        const marker = new maplibregl.Marker({ element: el, anchor: "center" })
          .setLngLat([h.lng, h.lat])
          .addTo(map);

        markersRef.current.push(marker);
      });

      // Fly to selected hazard if active
      if (selectedId) {
        const target = hazards.find((h) => h.id === selectedId);
        if (target && !isNaN(target.lng) && !isNaN(target.lat)) {
          map.flyTo({ center: [target.lng, target.lat], zoom: 16.5, duration: 900 });
        }
      }
    };

    if (isLoadedRef.current) {
      renderMarkers();
    } else {
      mapRef.current.once("load", renderMarkers);
      mapRef.current.once("style.load", renderMarkers);
    }
  }, [hazards, selectedId, onSelect]);

  return (
    <div
      style={{
        position: "relative",
        height,
        width: "100%",
        borderRadius: "14px",
        overflow: "hidden",
        border: "1px solid var(--gov-border)",
        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
      }}
    >
      <div
        className="map-container"
        ref={containerRef}
        style={{ height: "100%", width: "100%" }}
      />

      {/* Layer Theme Switcher Floating Control */}
      <div
        style={{
          position: "absolute",
          top: "14px",
          left: "14px",
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          gap: "4px",
          background: "rgba(15, 23, 42, 0.85)",
          backdropFilter: "blur(10px)",
          border: "1px solid rgba(255, 255, 255, 0.15)",
          borderRadius: "10px",
          padding: "4px",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.25)",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: "4px", padding: "0 8px", fontSize: "11px", fontWeight: 700, color: "#94a3b8" }}>
          <Layers className="w-3.5 h-3.5 text-sky-400" />
          <span>LAYER</span>
        </span>
        {(
          [
            { id: "streets", label: "Streets" },
            { id: "dark", label: "Dark HUD" },
            { id: "satellite", label: "Satellite" },
          ] as const
        ).map(({ id, label }) => {
          const isActive = theme === id;
          return (
            <button
              key={id}
              onClick={() => handleThemeChange(id)}
              style={{
                background: isActive ? "rgba(56, 189, 248, 0.25)" : "transparent",
                border: isActive ? "1px solid rgba(56, 189, 248, 0.6)" : "1px solid transparent",
                color: isActive ? "#38bdf8" : "#cbd5e1",
                padding: "4px 10px",
                borderRadius: "7px",
                fontSize: "11px",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
