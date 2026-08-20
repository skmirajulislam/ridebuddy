"use client";

import { useEffect, useRef, useCallback } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";
import { toast } from "sonner";

interface WeatherRadarLayerProps {
  map: MapLibreMap | null;
  enabled: boolean;
}

export default function WeatherRadarLayer({ map, enabled }: WeatherRadarLayerProps) {
  const isMountedRef = useRef(true);

  const isMapReady = useCallback((m: MapLibreMap | null): boolean => {
    if (!m || !isMountedRef.current) return false;
    try {
      // MapLibre internal check to ensure style is initialized and not destroyed
      return Boolean((m as unknown as { style?: unknown }).style && m.isStyleLoaded());
    } catch {
      return false;
    }
  }, []);

  const safeRemoveLayerAndSource = useCallback((m: MapLibreMap | null) => {
    if (!m) return;
    try {
      if ((m as unknown as { style?: unknown }).style) {
        if (m.getLayer("rainviewer-radar-layer")) {
          m.removeLayer("rainviewer-radar-layer");
        }
        if (m.getSource("rainviewer-radar")) {
          m.removeSource("rainviewer-radar");
        }
      }
    } catch {
      // Ignore map already destroyed/unloaded
    }
  }, []);

  const updateRadar = useCallback(async () => {
    if (!map || !isMountedRef.current) return;

    if (enabled) {
      try {
        // 100% Dynamic: Fetches latest real-time Doppler radar frames from RainViewer API
        const res = await fetch("https://api.rainviewer.com/public/weather-maps.json", {
          cache: "no-store",
        });
        if (!isMountedRef.current || !isMapReady(map)) return;

        const data = await res.json();
        const radarFrames = data?.radar?.past || [];
        if (radarFrames.length === 0 || !isMountedRef.current || !isMapReady(map)) return;

        // Get the latest real-time frame path
        const latestFrame = radarFrames[radarFrames.length - 1];
        const timePath = latestFrame.path;
        const host = data.host || "https://tilecache.rainviewer.com";
        // 512px tiles provide crisp high-DPI Doppler clouds
        const tileUrl = `${host}${timePath}/512/{z}/{x}/{y}/2/1_1.png`;

        if (!isMapReady(map)) return;

        safeRemoveLayerAndSource(map);

        if (!isMapReady(map)) return;

        // maxzoom: 6 with 512px tiles is the Doppler radar native limit.
        // MapLibre GL automatically overzooms and bilinearly interpolates tiles for zooms 7-19.
        map.addSource("rainviewer-radar", {
          type: "raster",
          tiles: [tileUrl],
          tileSize: 512,
          maxzoom: 6,
          attribution: "Live Rain Radar &copy; RainViewer / IMD",
        });

        let beforeLayer: string | undefined = undefined;
        try {
          if (map.getLayer("hazard-glow")) beforeLayer = "hazard-glow";
        } catch {
          // ignore
        }

        map.addLayer(
          {
            id: "rainviewer-radar-layer",
            type: "raster",
            source: "rainviewer-radar",
            minzoom: 0,
            paint: {
              "raster-opacity": 0.75,
              "raster-resampling": "linear",
              "raster-fade-duration": 250,
            },
          },
          beforeLayer
        );

        toast.success("Live Monsoon Precipitation Radar active", { icon: "🌧️" });
      } catch (e) {
        if (isMountedRef.current) {
          console.warn("[WeatherRadar] Failed to load radar tiles:", e);
        }
      }
    } else {
      safeRemoveLayerAndSource(map);
    }
  }, [map, enabled, isMapReady, safeRemoveLayerAndSource]);

  useEffect(() => {
    isMountedRef.current = true;
    if (!map) return;

    if (isMapReady(map)) {
      updateRadar();
    }

    const onStyleData = () => {
      if (isMountedRef.current && isMapReady(map)) {
        updateRadar();
      }
    };

    try {
      map.on("styledata", onStyleData);
    } catch {
      // ignore
    }

    // Auto-refresh dynamic radar frames every 5 minutes
    let interval: NodeJS.Timeout | null = null;
    if (enabled) {
      interval = setInterval(() => {
        if (isMountedRef.current && isMapReady(map)) {
          updateRadar();
        }
      }, 5 * 60 * 1000);
    }

    return () => {
      isMountedRef.current = false;
      if (interval) clearInterval(interval);
      try {
        map.off("styledata", onStyleData);
      } catch {
        // ignore
      }
      safeRemoveLayerAndSource(map);
    };
  }, [map, enabled, updateRadar, isMapReady, safeRemoveLayerAndSource]);

  return null;
}

