"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { Map as MapLibreMap, GeoJSONSource } from "maplibre-gl";
import type { FeatureCollection, Point } from "geojson";
import type { CachedHazard } from "./useHazardCache";

interface UseRoadQualityLayerProps {
  map: MapLibreMap | null;
  hazards: CachedHazard[];
}

export function useRoadQualityLayer({ map, hazards }: UseRoadQualityLayerProps) {
  const [isRqiVisible, setIsRqiVisible] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("ridebuddy_rqi_visible") === "true";
    }
    return false;
  });

  const sourceAddedRef = useRef(false);

  const toggleRqiLayer = useCallback(() => {
    setIsRqiVisible((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        localStorage.setItem("ridebuddy_rqi_visible", String(next));
      }
      return next;
    });
  }, []);

  // Prepare GeoJSON data
  const getRqiGeoJson = useCallback((): FeatureCollection<Point> => {
    const activeHazards = hazards.filter((h) => h.status !== "resolved");

    return {
      type: "FeatureCollection",
      features: activeHazards.map((h) => {
        const weight = h.severity === 3 ? 1.0 : h.severity === 2 ? 0.65 : 0.35;
        return {
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [h.lng, h.lat],
          },
          properties: {
            id: h.id,
            type: h.type,
            severity: h.severity,
            weight,
          },
        };
      }),
    };
  }, [hazards]);

  // Setup / update layers on map
  useEffect(() => {
    if (!map || !map.isStyleLoaded()) return;

    const sourceId = "rqi-heatmap-source";
    const heatmapLayerId = "rqi-heat";
    const circleLayerId = "rqi-circles";

    const updateOrAddSource = () => {
      const data = getRqiGeoJson();
      const existingSource = map.getSource(sourceId) as GeoJSONSource | undefined;

      if (existingSource) {
        existingSource.setData(data);
      } else {
        map.addSource(sourceId, {
          type: "geojson",
          data,
        });
        sourceAddedRef.current = true;
      }

      // Add heatmap layer if missing
      if (!map.getLayer(heatmapLayerId)) {
        map.addLayer({
          id: heatmapLayerId,
          type: "heatmap",
          source: sourceId,
          maxzoom: 17,
          paint: {
            "heatmap-weight": [
              "interpolate",
              ["linear"],
              ["get", "weight"],
              0,
              0,
              1,
              1,
            ],
            "heatmap-intensity": [
              "interpolate",
              ["linear"],
              ["zoom"],
              0,
              1,
              15,
              3,
            ],
            "heatmap-color": [
              "interpolate",
              ["linear"],
              ["heatmap-density"],
              0,
              "rgba(34, 197, 94, 0)",
              0.2,
              "rgba(34, 197, 94, 0.4)",
              0.45,
              "rgba(234, 179, 8, 0.7)",
              0.7,
              "rgba(249, 115, 22, 0.85)",
              1.0,
              "rgba(239, 68, 68, 0.95)",
            ],
            "heatmap-radius": [
              "interpolate",
              ["linear"],
              ["zoom"],
              0,
              4,
              9,
              18,
              15,
              35,
            ],
            "heatmap-opacity": 0.85,
          },
          layout: {
            visibility: isRqiVisible ? "visible" : "none",
          },
        });
      }

      // Add circle overlay for high zoom
      if (!map.getLayer(circleLayerId)) {
        map.addLayer({
          id: circleLayerId,
          type: "circle",
          source: sourceId,
          minzoom: 14,
          paint: {
            "circle-radius": [
              "interpolate",
              ["linear"],
              ["zoom"],
              14,
              ["interpolate", ["linear"], ["get", "weight"], 0.35, 10, 1.0, 20],
              18,
              ["interpolate", ["linear"], ["get", "weight"], 0.35, 24, 1.0, 48],
            ],
            "circle-color": [
              "match",
              ["get", "severity"],
              3,
              "#ef4444",
              2,
              "#f97316",
              "#eab308",
            ],
            "circle-opacity": 0.35,
            "circle-stroke-width": 1.5,
            "circle-stroke-color": [
              "match",
              ["get", "severity"],
              3,
              "#f87171",
              2,
              "#fb923c",
              "#facc15",
            ],
            "circle-stroke-opacity": 0.75,
          },
          layout: {
            visibility: isRqiVisible ? "visible" : "none",
          },
        });
      }
    };

    updateOrAddSource();

    // Toggle layer visibility
    if (map.getLayer(heatmapLayerId)) {
      map.setLayoutProperty(heatmapLayerId, "visibility", isRqiVisible ? "visible" : "none");
    }
    if (map.getLayer(circleLayerId)) {
      map.setLayoutProperty(circleLayerId, "visibility", isRqiVisible ? "visible" : "none");
    }
  }, [map, hazards, isRqiVisible, getRqiGeoJson]);

  return {
    isRqiVisible,
    toggleRqiLayer,
  };
}
