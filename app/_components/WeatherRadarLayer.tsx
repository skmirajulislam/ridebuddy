"use client";

import { useEffect, useCallback } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";
import { toast } from "sonner";

interface WeatherRadarLayerProps {
  map: MapLibreMap | null;
  enabled: boolean;
}

export default function WeatherRadarLayer({ map, enabled }: WeatherRadarLayerProps) {
  const updateRadar = useCallback(async () => {
    if (!map) return;

    if (enabled) {
      try {
        // 100% Dynamic: Fetches latest real-time Doppler radar frames from RainViewer API
        const res = await fetch("https://api.rainviewer.com/public/weather-maps.json", {
          cache: "no-store",
        });
        const data = await res.json();
        const radarFrames = data?.radar?.past || [];
        if (radarFrames.length === 0) return;

        // Get the latest real-time frame path
        const latestFrame = radarFrames[radarFrames.length - 1];
        const timePath = latestFrame.path;
        const host = data.host || "https://tilecache.rainviewer.com";
        // 512px tiles provide crisp high-DPI Doppler clouds
        const tileUrl = `${host}${timePath}/512/{z}/{x}/{y}/2/1_1.png`;

        if (map.getLayer("rainviewer-radar-layer")) {
          map.removeLayer("rainviewer-radar-layer");
        }
        if (map.getSource("rainviewer-radar")) {
          map.removeSource("rainviewer-radar");
        }

        // maxzoom: 6 with 512px tiles (or maxzoom: 7 for 256px) is the Doppler radar native limit.
        // MapLibre GL automatically overzooms and bilinearly interpolates tiles for zooms 7-19,
        // preventing RainViewer from serving the "Zoom Level Not Supported" placeholder image.
        map.addSource("rainviewer-radar", {
          type: "raster",
          tiles: [tileUrl],
          tileSize: 512,
          maxzoom: 6,
          attribution: "Live Rain Radar &copy; RainViewer / IMD",
        });

        const beforeLayer = map.getLayer("hazard-glow") ? "hazard-glow" : undefined;

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
        console.warn("[WeatherRadar] Failed to load radar tiles:", e);
      }
    } else {
      if (map.getLayer("rainviewer-radar-layer")) {
        map.removeLayer("rainviewer-radar-layer");
      }
      if (map.getSource("rainviewer-radar")) {
        map.removeSource("rainviewer-radar");
      }
    }
  }, [map, enabled]);

  useEffect(() => {
    if (!map) return;

    if (map.isStyleLoaded()) {
      updateRadar();
    }

    const onStyleData = () => {
      if (map.isStyleLoaded()) {
        updateRadar();
      }
    };

    map.on("styledata", onStyleData);

    // Auto-refresh dynamic radar frames every 5 minutes
    let interval: NodeJS.Timeout | null = null;
    if (enabled) {
      interval = setInterval(() => {
        if (map.isStyleLoaded()) {
          updateRadar();
        }
      }, 5 * 60 * 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
      map.off("styledata", onStyleData);
      if (map.getLayer("rainviewer-radar-layer")) {
        map.removeLayer("rainviewer-radar-layer");
      }
      if (map.getSource("rainviewer-radar")) {
        map.removeSource("rainviewer-radar");
      }
    };
  }, [map, enabled, updateRadar]);

  return null;
}
