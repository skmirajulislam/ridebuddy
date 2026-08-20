"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import maplibregl, { Map as MapLibreMap, GeoJSONSource } from "maplibre-gl";
import type { Feature, LineString, FeatureCollection, Point } from "geojson";
import Link from "next/link";
import * as turf from "@turf/turf";
import { toast } from "sonner";

import { useUserLocation } from "../_hooks/useUserLocation";
import { useNotifications } from "../_hooks/useNotifications";
import { useHazardCache, type CachedHazard } from "../_hooks/useHazardCache";
import { useAuth } from "../_hooks/useAuth";

import ReportButton from "./ReportButton";
import BottomSheet from "./BottomSheet";
import RoutePanel from "./RoutePanel";
import RouteSelector from "./RouteSelector";
import NavigationPanel from "./NavigationPanel";
import WarningBanner from "./WarningBanner";
import AuthModal from "./AuthModal";
import ProfileModal from "./ProfileModal";
import ContributorCard from "./ContributorCard";

import {
  Shield,
  Crosshair,
  Locate,
  Navigation,
  X,
  ChevronUp,
  ChevronDown,
  ArrowLeft,
  RotateCcw,
} from "lucide-react";

import {
  formatTurnInstruction,
  getNextAnnouncementDistance,
} from "../_utils/navigationInstructions";

// ── Types ─────────────────────────────────────────────────────────────────
type Place = {
  place_name: string;
  center: [number, number];
};

interface RouteInfo {
  distance: number;
  duration: number;
  originalDuration: number;
  hazardCount: number;
}

interface RouteData {
  distance: number;
  duration: number;
  geometry: LineString;
  legs?: Routeleg[];
}

interface Routeleg {
  steps: RouteStep[];
  distance: number;
  duration: number;
}

interface RouteStep {
  maneuver: {
    type: string;
    modifier?: string;
    location: [number, number];
  };
  name: string;
  distance: number;
  duration: number;
  geometry: LineString;
}

interface RouteAnalysis {
  score: number;
  hazardCount: number;
  penalty: number;
  estimatedDelaySeconds?: number;
  adjustedDuration?: number;
  typeBreakdown: Record<string, number>;
}

interface RoutesResponse {
  bestRoute: RouteData;
  allRoutes: RouteData[];
  analysis: RouteAnalysis;
  routeAnalyses?: RouteAnalysis[];
  routeHazards?: CachedHazard[][];
  hazardsOnRoute: CachedHazard[];
}

interface NavigationState {
  isActive: boolean;
  currentStepIndex: number;
  distanceToNextTurn: number;
  bearing: number;
  routeCoordinates: [number, number][];
  steps: RouteStep[];
  hazardsOnRoute: CachedHazard[];
  announcedDistances: Set<number>;
  announcedHazards: Set<string>;
}

// ── Constants ─────────────────────────────────────────────────────────────
const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

// ── Helpers ───────────────────────────────────────────────────────────────
function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371e3;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const φ1 = toRad(lat1),
    φ2 = toRad(lat2);
  const Δφ = toRad(lat2 - lat1);
  const Δλ = toRad(lng2 - lng1);
  const a =
    Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function severityColor(severity: number): string {
  if (severity >= 3) return "#ef4444"; // high → red
  if (severity >= 2) return "#f97316"; // medium → orange
  return "#eab308"; // low → yellow
}

// ── Component ─────────────────────────────────────────────────────────────
export default function Map() {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const map = useRef<MapLibreMap | null>(null);
  const userMarker = useRef<maplibregl.Marker | null>(null);
  const startMarker = useRef<maplibregl.Marker | null>(null);
  const endMarker = useRef<maplibregl.Marker | null>(null);
  const activePopup = useRef<maplibregl.Popup | null>(null);
  const notifiedHazardIds = useRef<Set<number>>(new Set());

  // Search state
  const [fromQuery, setFromQuery] = useState("");
  const [toQuery, setToQuery] = useState("");
  const [fromResults, setFromResults] = useState<Place[]>([]);
  const [toResults, setToResults] = useState<Place[]>([]);

  // Route state
  const [start, setStart] = useState<[number, number] | null>(null);
  const [end, setEnd] = useState<[number, number] | null>(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [allRoutesData, setAllRoutesData] = useState<RoutesResponse | null>(null);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState<number>(0);

  // UI state
  const [warning, setWarning] = useState<string | null>(null);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [hazards, setHazards] = useState<CachedHazard[]>([]);
  const [mapPickTarget, setMapPickTarget] = useState<"from" | "to" | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(true);

  // Contributor modal state
  const [contributorModal, setContributorModal] = useState<{
    isOpen: boolean;
    handleOrId: string | null;
    initialData?: {
      name?: string | null;
      handle?: string | null;
      avatar_url?: string | null;
      bio?: string | null;
      hobbies?: string[];
    };
  }>({
    isOpen: false,
    handleOrId: null,
  });

  // Attach global helper for map popup clicks
  useEffect(() => {
    (window as unknown as {
      __openContributorModal?: (
        handle: string,
        data?: {
          name?: string | null;
          handle?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          hobbies?: string[];
        }
      ) => void;
    }).__openContributorModal = (handle, data) => {
      setContributorModal({
        isOpen: true,
        handleOrId: handle,
        initialData: data,
      });
    };

    return () => {
      delete (window as unknown as { __openContributorModal?: unknown }).__openContributorModal;
    };
  }, []);

  // Navigation state
  const [navigation, setNavigation] = useState<NavigationState>({
    isActive: false,
    currentStepIndex: 0,
    distanceToNextTurn: 0,
    bearing: 0,
    routeCoordinates: [],
    steps: [],
    hazardsOnRoute: [],
    announcedDistances: new Set(),
    announcedHazards: new Set(),
  });
  const lastPositionRef = useRef<{ lat: number; lng: number } | null>(null);
  const gpsWatchIdRef = useRef<number | null>(null);
  const gpsRetryTimerRef = useRef<NodeJS.Timeout | null>(null);
  const offRouteTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isReroutingRef = useRef<boolean>(false);
  const mapPickTargetRef = useRef<"from" | "to" | null>(null);

  // Update ref when state changes
  useEffect(() => {
    mapPickTargetRef.current = mapPickTarget;
  }, [mapPickTarget]);

  const apiKey = process.env.NEXT_PUBLIC_MAPTILER_KEY;
  const { position } = useUserLocation();
  const { permission, requestPermission, sendNotification } = useNotifications();
  const { getCache, setCache } = useHazardCache();
  const { user, idToken } = useAuth();

  // ── Map Init ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    // MapLibre v5 calls migrateProjection() on every style load.
    map.current = new maplibregl.Map({
      container: mapContainer.current,
      center: [88.3639, 22.5726],
      zoom: 13,
      maxZoom: 19,
    });

    const defaultStyle: maplibregl.StyleSpecification | string = apiKey
      ? `https://api.maptiler.com/maps/streets-v2-dark/style.json?key=${apiKey}`
      : {
          version: 8 as const,
          sources: {
            "osm-tiles": {
              type: "raster",
              tiles: [
                "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png",
                "https://b.tile.openstreetmap.org/{z}/{x}/{y}.png",
                "https://c.tile.openstreetmap.org/{z}/{x}/{y}.png",
              ],
              tileSize: 256,
              maxzoom: 19,
              attribution: "&copy; OpenStreetMap Contributors",
            },
          },
          layers: [
            {
              id: "osm-tiles-layer",
              type: "raster",
              source: "osm-tiles",
              minzoom: 0,
              maxzoom: 19,
            },
          ],
        };

    map.current.setStyle(defaultStyle, {
      transformStyle: (_prev, next) => ({
        ...next,
        projection: next.projection ?? { type: "mercator" },
      }),
    });

    map.current.addControl(new maplibregl.NavigationControl(), "top-right");
    map.current.addControl(new maplibregl.FullscreenControl(), "top-right");

    // Disable default double-click zoom so double-clicking places/moves destination pointer
    map.current.doubleClickZoom.disable();

    map.current.on("load", () => {
      initHazardLayer();
      setIsMapLoaded(true);
    });

    // Double-click handler to set or change location pointer anywhere on map
    map.current.on("dblclick", (e) => {
      const target = mapPickTargetRef.current || "to";
      const { lng, lat } = e.lngLat;
      handleMapClick(lng, lat, target);
    });

    // Single-click handler when explicit picker mode is active
    map.current.on("click", (e) => {
      const target = mapPickTargetRef.current;
      if (!target) return;
      
      const { lng, lat } = e.lngLat;
      handleMapClick(lng, lat, target);
    });

    // Suppress "Image ' ' could not be loaded" noise from MapTiler sprite mismatches
    map.current.on("styleimagemissing", (e: { id: string }) => {
      if (!e.id || e.id.trim() === "") return; // blank id — skip silently
      // Add a 1×1 transparent ImageData so MapLibre stops retrying the missing image
      const emptyImage: ImageData = new ImageData(new Uint8ClampedArray(4), 1, 1);
      map.current?.addImage(e.id, emptyImage);
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey]);

  // ── Hazard Layer Init ─────────────────────────────────────────────────────
  const initHazardLayer = () => {
    const m = map.current;
    if (!m) return;

    // GeoJSON source (starts empty)
    m.addSource("hazards", {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    });

    // Glow ring
    m.addLayer({
      id: "hazard-glow",
      type: "circle",
      source: "hazards",
      paint: {
        "circle-radius": 20,
        "circle-color": [
          "match",
          ["get", "severity"],
          1, "#eab308",
          2, "#f97316",
          3, "#ef4444",
          "#eab308",
        ],
        "circle-opacity": 0.12,
        "circle-blur": 1,
      },
    });

    // Main dot
    m.addLayer({
      id: "hazard-circles",
      type: "circle",
      source: "hazards",
      paint: {
        "circle-radius": 10,
        "circle-color": [
          "match",
          ["get", "severity"],
          1, "#eab308",
          2, "#f97316",
          3, "#ef4444",
          "#eab308",
        ],
        "circle-stroke-width": 2,
        "circle-stroke-color": "#ffffff",
        "circle-opacity": 0.92,
      },
    });

    // Click popup
    m.on("click", "hazard-circles", (e) => {
      if (!e.features?.[0]) return;
      const props = e.features[0].properties as {
        id: number;
        type: string;
        severity: number;
        image_url?: string;
        reporter_name?: string;
        reporter_handle?: string;
        reporter_avatar?: string;
        reporter_bio?: string;
        reporter_hobbies?: string;
        created_at?: string;
      };
      const geom = e.features[0].geometry as Point;
      const coords = geom.coordinates as [number, number];

      if (activePopup.current) activePopup.current.remove();

      const color = severityColor(props.severity || 1);
      const severityLabel = ["", "Low", "Medium", "High"][props.severity] ?? "Low";
      const reporterName = props.reporter_name || "Community Rider";
      const reporterHandle = props.reporter_handle || `rider_${props.id}`;
      const reporterAvatar = props.reporter_avatar || "";
      const reporterBio = props.reporter_bio || "";
      let hobbiesList: string[] = [];
      try {
        if (props.reporter_hobbies) {
          hobbiesList = typeof props.reporter_hobbies === "string" ? JSON.parse(props.reporter_hobbies) : props.reporter_hobbies;
        }
      } catch {
        // fallback
      }

      const hobbiesSnippet = Array.isArray(hobbiesList) && hobbiesList.length > 0
        ? `<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:6px">
            ${hobbiesList.slice(0, 3).map(h => `<span style="background:rgba(56,189,248,0.15);border:1px solid rgba(56,189,248,0.3);color:#38bdf8;padding:1px 6px;border-radius:999px;font-size:10px;font-weight:500">${h}</span>`).join("")}
           </div>`
        : "";

      const avatarHtml = reporterAvatar
        ? `<img src="${reporterAvatar}" alt="${reporterName}" style="width:28px;height:28px;border-radius:50%;object-fit:cover;border:1.5px solid #38bdf8" />`
        : `<div style="width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#0284c7,#6366f1);color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;border:1.5px solid #38bdf8">${reporterName[0]?.toUpperCase()}</div>`;

      activePopup.current = new maplibregl.Popup({ offset: 16, maxWidth: "260px", className: "hazard-radar-popup" })
        .setLngLat(coords)
        .setHTML(
          `<div style="padding:14px 16px;font-family:system-ui,sans-serif;background:rgba(15,23,42,0.96);border-radius:14px;color:#f8fafc">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px">
              <div style="display:flex;align-items:center;gap:6px">
                <span style="width:10px;height:10px;border-radius:50%;background:${color};display:inline-block;flex-shrink:0"></span>
                <strong style="color:#fff;font-size:14px;text-transform:capitalize">${props.type}</strong>
              </div>
              <span style="background:${color}22;color:${color};border:1px solid ${color}55;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:700">
                ${severityLabel}
              </span>
            </div>

            <!-- Contributor Profile Badge -->
            <div 
              id="contributor-btn-${props.id}"
              onclick="window.__openContributorModal && window.__openContributorModal('${reporterHandle}', { name: '${reporterName.replace(/'/g, "\\'")}', handle: '${reporterHandle}', avatar_url: '${reporterAvatar}', bio: '${reporterBio.replace(/'/g, "\\'")}', hobbies: ${JSON.stringify(hobbiesList)} })"
              style="margin-top:10px;padding:8px 10px;background:rgba(30,41,59,0.8);border:1px solid rgba(56,189,248,0.25);border-radius:10px;cursor:pointer;transition:all 0.2s"
              title="Click to view full contributor profile"
            >
              <div style="display:flex;align-items:center;gap:8px">
                ${avatarHtml}
                <div style="min-width:0;flex:1">
                  <div style="font-size:12px;font-weight:700;color:#f8fafc;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
                    ${reporterName}
                  </div>
                  <div style="font-size:11px;color:#38bdf8;font-family:monospace;font-weight:600">
                    @${reporterHandle.replace(/^@/, '')}
                  </div>
                </div>
              </div>
              ${hobbiesSnippet}
            </div>
          </div>`
        )
        .addTo(m);
    });

    m.on("mouseenter", "hazard-circles", () => {
      m.getCanvas().style.cursor = "pointer";
    });
    m.on("mouseleave", "hazard-circles", () => {
      m.getCanvas().style.cursor = "";
    });
  };

  // ── Update Hazard Source Data ─────────────────────────────────────────────
  const updateHazardLayer = useCallback((hazardList: CachedHazard[]) => {
    const m = map.current;
    if (!m || !m.getSource("hazards")) return;

    const fc: FeatureCollection<Point> = {
      type: "FeatureCollection",
      features: hazardList.map((h) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [h.lng, h.lat] },
        properties: {
          id: h.id,
          type: h.type,
          severity: h.severity || 1,
          image_url: h.image_url || "",
          reporter_name: h.reporter_name || "",
          reporter_handle: h.reporter_handle || "",
          reporter_avatar: h.reporter_avatar || "",
          reporter_bio: h.reporter_bio || "",
          reporter_hobbies: Array.isArray(h.reporter_hobbies) ? JSON.stringify(h.reporter_hobbies) : "[]",
          created_at: h.created_at || "",
        },
      })),
    };

    (m.getSource("hazards") as GeoJSONSource).setData(fc);
  }, []);

  // ── Load Hazards (cache + network) ────────────────────────────────────────
  const loadHazards = useCallback(async () => {
    // Serve from cache immediately for snappy UX
    const cached = getCache();
    if (cached && cached.length > 0) {
      setHazards(cached);
      updateHazardLayer(cached);
    }

    try {
      const res = await fetch(`${API_URL}/api/hazards`);
      if (!res.ok) throw new Error("Failed to fetch hazards");
      const data: CachedHazard[] = await res.json();
      setHazards(data);
      setCache(data);
      updateHazardLayer(data);
    } catch {
      // Offline or server down — cached data already shown
    }
  }, [getCache, setCache, updateHazardLayer]);

  useEffect(() => {
    if (isMapLoaded) loadHazards();
  }, [isMapLoaded, loadHazards]);

  // ── User Location Marker ──────────────────────────────────────────────────
  useEffect(() => {
    if (!position || !map.current || !isMapLoaded) return;

    const { lat, lng } = position;
    const lnglat: [number, number] = [lng, lat];

    if (!userMarker.current) {
      const el = document.createElement("div");
      el.className = navigation.isActive ? "user-location-navigation" : "user-location-dot";
      
      if (navigation.isActive) {
        // Navigation mode: directional arrow
        el.innerHTML = `
          <div class="user-location-arrow">
            <svg width="40" height="40" viewBox="0 0 40 40">
              <defs>
                <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur in="SourceAlpha" stdDeviation="2"/>
                  <feOffset dx="0" dy="1" result="offsetblur"/>
                  <feComponentTransfer>
                    <feFuncA type="linear" slope="0.3"/>
                  </feComponentTransfer>
                  <feMerge>
                    <feMergeNode/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>
              <!-- Outer glow circle -->
              <circle cx="20" cy="20" r="18" fill="rgba(124, 58, 237, 0.2)" />
              <!-- Arrow shape pointing up -->
              <path d="M20 5 L28 25 L20 21 L12 25 Z" fill="#7c3aed" stroke="#fff" stroke-width="2" filter="url(#shadow)"/>
              <!-- Center dot -->
              <circle cx="20" cy="20" r="4" fill="#fff" stroke="#7c3aed" stroke-width="2"/>
            </svg>
          </div>
        `;
      } else {
        // Normal mode: pulsing dot
        el.innerHTML = `
          <div class="user-location-pulse"></div>
          <div class="user-location-center"></div>
        `;
      }
      
      userMarker.current = new maplibregl.Marker({ element: el, anchor: "center", rotationAlignment: "map" })
        .setLngLat(lnglat)
        .addTo(map.current);

      // Fly to user location on first GPS fix & populate default start
      if (!navigation.isActive) {
        map.current.flyTo({ center: lnglat, zoom: 15, duration: 1500 });
        setStart([lng, lat]);
        setFromQuery("Current Location");
      }
    } else {
      userMarker.current.setLngLat(lnglat);
      
      // Update marker style if navigation state changed
      const el = userMarker.current.getElement();
      const currentClass = el.className;
      const shouldBeNav = navigation.isActive ? "user-location-navigation" : "user-location-dot";
      
      if (currentClass !== shouldBeNav) {
        el.className = shouldBeNav;
        if (navigation.isActive) {
          el.innerHTML = `
            <div class="user-location-arrow">
              <svg width="40" height="40" viewBox="0 0 40 40">
                <defs>
                  <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur in="SourceAlpha" stdDeviation="2"/>
                    <feOffset dx="0" dy="1" result="offsetblur"/>
                    <feComponentTransfer>
                      <feFuncA type="linear" slope="0.3"/>
                    </feComponentTransfer>
                    <feMerge>
                      <feMergeNode/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                </defs>
                <circle cx="20" cy="20" r="18" fill="rgba(124, 58, 237, 0.2)" />
                <path d="M20 5 L28 25 L20 21 L12 25 Z" fill="#7c3aed" stroke="#fff" stroke-width="2" filter="url(#shadow)"/>
                <circle cx="20" cy="20" r="4" fill="#fff" stroke="#7c3aed" stroke-width="2"/>
              </svg>
            </div>
          `;
        } else {
          el.innerHTML = `
            <div class="user-location-pulse"></div>
            <div class="user-location-center"></div>
          `;
        }
      }
    }

    // ── Speed-Adaptive Proximity check (Free Drive & Radar Mode) ───────────
    const currentSpeedKmh = position.speed ? position.speed * 3.6 : 0;
    const isHighSpeed = currentSpeedKmh > 35;
    const alertRadius = isHighSpeed ? 150 : 80;

    const nearbyHazard = hazards.find(
      (h) =>
        !notifiedHazardIds.current.has(h.id) &&
        haversineDistance(lat, lng, h.lat, h.lng) < alertRadius
    );

    if (nearbyHazard) {
      notifiedHazardIds.current.add(nearbyHazard.id);
      const hazardDistance = Math.round(haversineDistance(lat, lng, nearbyHazard.lat, nearbyHazard.lng));
      const formattedType = nearbyHazard.type.charAt(0).toUpperCase() + nearbyHazard.type.slice(1);

      let alertMsg: string;
      if (hazardDistance <= 25) {
        alertMsg = `Caution: ${formattedType} in ${hazardDistance} meters! Reduce speed now.`;
      } else if (isHighSpeed) {
        alertMsg = `High speed detected (${Math.round(currentSpeedKmh)} km/h)! Slow down, ${formattedType} ${hazardDistance}m ahead.`;
      } else {
        alertMsg = `${formattedType} reported ${hazardDistance}m ahead. Drive carefully.`;
      }

      setWarning(alertMsg);
      sendNotification("Hazard Alert", alertMsg);
    }
  }, [position, isMapLoaded, hazards, sendNotification, navigation.isActive]);

  // Sync initial GPS location into Start location
  useEffect(() => {
    if (position && !start && !fromQuery) {
      setStart([position.lng, position.lat]);
      setFromQuery("Current Location");
    }
  }, [position, start, fromQuery]);

  // ── Use My Location (From field) ──────────────────────────────────────────
  const useMyLocation = () => {
    if (!position) {
      toast.info("Waiting for GPS location...");
      return;
    }
    const coords: [number, number] = [position.lng, position.lat];
    setStart(coords);
    setFromQuery("Current Location");
    setFromResults([]);

    if (startMarker.current) startMarker.current.remove();
    if (map.current) {
      startMarker.current = new maplibregl.Marker({ color: "#7c3aed" })
        .setLngLat(coords)
        .addTo(map.current);
      map.current.flyTo({ center: coords, zoom: 14 });
    }
  };

  // ── Geocoding Search ──────────────────────────────────────────────────────
  const geocode = async (query: string): Promise<Place[]> => {
    if (apiKey) {
      try {
        const res = await fetch(
          `https://api.maptiler.com/geocoding/${encodeURIComponent(query)}.json?key=${apiKey}&limit=5`
        );
        const data = await res.json();
        if (data.features && data.features.length > 0) {
          return data.features;
        }
      } catch (err) {
        console.warn("MapTiler geocode failed:", err);
      }
    }

    // OpenStreetMap Nominatim Free Fallback
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`
      );
      const items = await res.json();
      return items.map((item: { display_name: string; lon: string; lat: string }) => ({
        place_name: item.display_name,
        center: [parseFloat(item.lon), parseFloat(item.lat)] as [number, number],
      }));
    } catch {
      return [];
    }
  };

  // ── Reverse Geocoding ─────────────────────────────────────────────────────
  const reverseGeocode = async (lng: number, lat: number): Promise<string> => {
    if (!apiKey) return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    try {
      const res = await fetch(
        `https://api.maptiler.com/geocoding/${lng},${lat}.json?key=${apiKey}`
      );
      const data = await res.json();
      if (data.features && data.features.length > 0) {
        return data.features[0].place_name;
      }
    } catch (err) {
      console.warn("Reverse geocoding failed:", err);
    }
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  };

  const handleFromSearch = async (value: string) => {
    setFromQuery(value);
    if (value.length < 3) { setFromResults([]); return; }
    try { setFromResults(await geocode(value)); } catch { setFromResults([]); }
  };

  const handleToSearch = async (value: string) => {
    setToQuery(value);
    if (value.length < 3) { setToResults([]); return; }
    try { setToResults(await geocode(value)); } catch { setToResults([]); }
  };

  const selectFrom = (coords: [number, number], name: string) => {
    setStart(coords);
    setFromQuery(name);
    setFromResults([]);
    setMapPickTarget(null);
    if (startMarker.current) startMarker.current.remove();
    if (map.current) {
      startMarker.current = new maplibregl.Marker({ color: "#a855f7", draggable: true })
        .setLngLat(coords)
        .addTo(map.current);

      startMarker.current.on("dragend", async () => {
        if (!startMarker.current) return;
        const pos = startMarker.current.getLngLat();
        const newCoords: [number, number] = [pos.lng, pos.lat];
        setStart(newCoords);
        const address = await reverseGeocode(pos.lng, pos.lat);
        setFromQuery(address);
      });

      map.current.flyTo({ center: coords, zoom: 14 });
    }
  };

  const selectTo = (coords: [number, number], name: string) => {
    setEnd(coords);
    setToQuery(name);
    setToResults([]);
    setMapPickTarget(null);
    if (endMarker.current) endMarker.current.remove();
    if (map.current) {
      endMarker.current = new maplibregl.Marker({ color: "#ff4d6d", draggable: true })
        .setLngLat(coords)
        .addTo(map.current);

      endMarker.current.on("dragend", async () => {
        if (!endMarker.current) return;
        const pos = endMarker.current.getLngLat();
        const newCoords: [number, number] = [pos.lng, pos.lat];
        setEnd(newCoords);
        const address = await reverseGeocode(pos.lng, pos.lat);
        setToQuery(address);
      });

      map.current.flyTo({ center: coords, zoom: 14 });
    }
  };

  // ── Handle Map Click for Location Selection ───────────────────────────────
  const handleMapClick = async (lng: number, lat: number, target: "from" | "to" = "to") => {
    const coords: [number, number] = [lng, lat];
    const locationName = await reverseGeocode(lng, lat);
    if (target === "from") {
      selectFrom(coords, locationName);
    } else {
      selectTo(coords, locationName);
    }
  };

  // ── Clear Functions ───────────────────────────────────────────────────────
  const clearAllRoute = () => {
    setStart(null);
    setEnd(null);
    setFromQuery("");
    setToQuery("");
    setFromResults([]);
    setToResults([]);
    setRouteInfo(null);
    setAllRoutesData(null);
    setSelectedRouteIndex(0);
    setWarning(null);
    setMapPickTarget(null);

    if (startMarker.current) {
      startMarker.current.remove();
      startMarker.current = null;
    }
    if (endMarker.current) {
      endMarker.current.remove();
      endMarker.current = null;
    }
    if (map.current) {
      const mapInstance = map.current;
      for (let i = 0; i < 10; i++) {
        const id = `route-${i}`;
        if (mapInstance.getLayer(id)) mapInstance.removeLayer(id);
        if (mapInstance.getSource(id)) mapInstance.removeSource(id);
      }
    }
    toast.info("Route & location markers cleared");
  };

  const clearFrom = () => {
    setStart(null);
    setFromQuery("");
    setFromResults([]);
    if (startMarker.current) {
      startMarker.current.remove();
      startMarker.current = null;
    }
    setRouteInfo(null);
    setAllRoutesData(null);
  };

  const clearTo = () => {
    setEnd(null);
    setToQuery("");
    setToResults([]);
    if (endMarker.current) {
      endMarker.current.remove();
      endMarker.current = null;
    }
    setRouteInfo(null);
    setAllRoutesData(null);
  };

  // ── Handle Route Selection ────────────────────────────────────────────────
  const handleRouteSelection = useCallback((index: number) => {
    if (!allRoutesData || !map.current) return;
    
    setSelectedRouteIndex(index);
    const selectedRoute = allRoutesData.allRoutes[index];
    
    // Update route info for the selected route
    const selectedAnalysis = allRoutesData.routeAnalyses?.[index];
    setRouteInfo({
      distance: selectedRoute.distance,
      duration: selectedAnalysis?.adjustedDuration ?? selectedRoute.duration,
      originalDuration: selectedRoute.duration,
      hazardCount: selectedAnalysis?.hazardCount ?? 0,
    });

    // Update route layer styles
    allRoutesData.allRoutes.forEach((_, i) => {
      const layerId = `route-${i}`;
      if (map.current?.getLayer(layerId)) {
        const isSelected = i === index;
        const isBestRoute = i === 0;
        map.current.setPaintProperty(
          layerId,
          "line-width",
          isSelected ? 7 : (isBestRoute ? 6 : 4)
        );
        map.current.setPaintProperty(
          layerId,
          "line-opacity",
          isSelected ? 1 : (isBestRoute ? 0.8 : 0.5)
        );
      }
    });

    // Fit map to selected route
    const coords = selectedRoute.geometry.coordinates as [number, number][];
    const bounds = coords.reduce(
      (b: maplibregl.LngLatBounds, coord) => b.extend(coord),
      new maplibregl.LngLatBounds(coords[0], coords[0])
    );
    map.current.fitBounds(bounds, { padding: 80, duration: 800 });

    // Update warning for selected route
    if (selectedAnalysis) {
      const hCount = selectedAnalysis.hazardCount;
      if (hCount > 0) {
        const breakdown = selectedAnalysis.typeBreakdown ?? {};
        const topType = Object.keys(breakdown).sort(
          (a, b) => breakdown[b] - breakdown[a]
        )[0];
        setWarning(
          `${hCount} hazard${hCount > 1 ? "s" : ""} on your route${topType ? ` (mostly ${topType})` : ""}. Drive carefully!`
        );
      } else {
        setWarning(null);
      }
    } else {
      setWarning(null);
    }
  }, [allRoutesData]);

  // ── Get Route ─────────────────────────────────────────────────────────────
  const getRoute = async () => {
    if (!user) {
      toast.info("Please sign in or register to calculate AI hazard-safe routes");
      setAuthModalOpen(true);
      return;
    }

    if (!start || !end || !map.current) return;

    setIsLoadingRoute(true);
    setWarning(null);
    setRouteInfo(null);

    try {
      const res = await fetch(
        `${API_URL}/api/route?from=${start[0]},${start[1]}&to=${end[0]},${end[1]}`
      );

      if (!res.ok) throw new Error(`Route error: ${res.status}`);

      const data = await res.json();
      const mapInstance = map.current;

      // Store full routes data
      setAllRoutesData(data);
      setSelectedRouteIndex(0); // Default to best route

      // ── Clean up old route layers ──────────────────────────────────────
      // Guard: only call getStyle() when the style is fully loaded to avoid
      // the "Cannot read properties of undefined (reading 'projection')" crash
      if (mapInstance.isStyleLoaded()) {
        const layers = mapInstance.getStyle().layers || [];
        layers.forEach((layer) => {
          if (layer.id.startsWith("route")) {
            if (mapInstance.getLayer(layer.id)) mapInstance.removeLayer(layer.id);
            if (mapInstance.getSource(layer.id)) mapInstance.removeSource(layer.id);
          }
        });
      } else {
        // Style not ready — remove by known names only (safe fallback)
        for (let i = 0; i < 10; i++) {
          const id = `route-${i}`;
          if (mapInstance.getLayer(id)) mapInstance.removeLayer(id);
          if (mapInstance.getSource(id)) mapInstance.removeSource(id);
        }
      }

      // ── Draw all routes ─────────────────────────────────────────────────
      data.allRoutes?.forEach((route: RouteData, index: number) => {
        const isBest = index === 0;
        const id = `route-${index}`;
        const geojson: Feature<LineString> = {
          type: "Feature",
          geometry: route.geometry,
          properties: { routeIndex: index, isBest },
        };
        mapInstance.addSource(id, { type: "geojson", data: geojson });
        mapInstance.addLayer({
          id,
          type: "line",
          source: id,
          layout: { "line-join": "round", "line-cap": "round" },
          paint: {
            "line-color": isBest ? "#a855f7" : "#60a5fa",
            "line-width": isBest ? 6 : 4,
            "line-opacity": isBest ? 1 : 0.5,
          },
        });

        // Add click handler for route selection
        mapInstance.on("click", id, () => {
          handleRouteSelection(index);
        });

        // Change cursor on hover
        mapInstance.on("mouseenter", id, () => {
          mapInstance.getCanvas().style.cursor = "pointer";
        });
        mapInstance.on("mouseleave", id, () => {
          mapInstance.getCanvas().style.cursor = "";
        });
      });

      // Make sure hazard markers stay on top of route
      if (mapInstance.getLayer("hazard-glow")) {
        mapInstance.moveLayer("hazard-glow");
      }
      if (mapInstance.getLayer("hazard-circles")) {
        mapInstance.moveLayer("hazard-circles");
      }

      // ── Fit map to best route ──────────────────────────────────────────
      const coords = data.bestRoute.geometry.coordinates as [number, number][];
      const bounds = coords.reduce(
        (b: maplibregl.LngLatBounds, coord) => b.extend(coord),
        new maplibregl.LngLatBounds(coords[0], coords[0])
      );
      mapInstance.fitBounds(bounds, { padding: 80, duration: 800 });

      // ── Route info panel (show best route initially) ──────────────────
      const bestAnalysis = data.routeAnalyses?.[0] ?? data.analysis;
      setRouteInfo({
        distance: data.bestRoute.distance,
        duration: bestAnalysis?.adjustedDuration ?? data.bestRoute.duration,
        originalDuration: data.bestRoute.duration,
        hazardCount: bestAnalysis?.hazardCount ?? 0,
      });

      // ── Warning for hazards on route ───────────────────────────────────
      const hCount = bestAnalysis?.hazardCount ?? 0;
      if (hCount > 0) {
        const breakdown = bestAnalysis?.typeBreakdown ?? {};
        const topType = Object.keys(breakdown).sort(
          (a, b) => breakdown[b] - breakdown[a]
        )[0];
        setWarning(
          `${hCount} hazard${hCount > 1 ? "s" : ""} on your route${topType ? ` (mostly ${topType})` : ""}. Drive carefully!`
        );
      }
    } catch (err) {
      console.error("Route error:", err);
      setWarning("Could not find route. Try different locations.");
    } finally {
      setIsLoadingRoute(false);
    }
  };

  // ── Reload hazards after new report ──────────────────────────────────────
  const handleReportSuccess = () => {
    loadHazards();
  };

  // ── Navigation Functions ──────────────────────────────────────────────────
  
  // Start navigation mode
  const startNavigation = useCallback(() => {
    if (!user) {
      toast.info("Please sign in or register to start turn-by-turn navigation");
      setAuthModalOpen(true);
      return;
    }

    if (!allRoutesData || !end) return;
    
    const selectedRoute = allRoutesData.allRoutes[selectedRouteIndex];
    if (!selectedRoute.legs || selectedRoute.legs.length === 0) {
      setWarning("Navigation data unavailable for this route");
      return;
    }

    const steps = selectedRoute.legs[0].steps;
    const coordinates = selectedRoute.geometry.coordinates as [number, number][];
    notifiedHazardIds.current.clear();

    setNavigation({
      isActive: true,
      currentStepIndex: 0,
      distanceToNextTurn: steps[0]?.distance || 0,
      bearing: 0,
      routeCoordinates: coordinates,
      steps,
      hazardsOnRoute: allRoutesData.routeHazards?.[selectedRouteIndex] ?? allRoutesData.hazardsOnRoute ?? [],
      announcedDistances: new Set(),
      announcedHazards: new Set(),
    });

    // Adaptive GPS tracking for navigation
    let useHighAccuracy = true;

    const handleGPSError = (error: GeolocationPositionError) => {
      const errorCode = error?.code;
      const errorMsg = error?.message || "unknown";
      console.warn(`GPS tracking status - Code: ${errorCode}, Message: ${errorMsg}`);

      if (errorCode === 1) {
        // PERMISSION_DENIED
        setWarning("Please enable location permissions in your browser settings.");
        exitNavigation();
        return;
      }

      // If high accuracy GPS timed out or is unavailable (common on laptops / indoor Wi-Fi), switch to standard accuracy
      if (useHighAccuracy && (errorCode === 3 || errorCode === 2)) {
        useHighAccuracy = false;
      }

      // Reconnect cleanly in the background without abruptly aborting navigation
      if (gpsRetryTimerRef.current) {
        clearTimeout(gpsRetryTimerRef.current);
      }
      gpsRetryTimerRef.current = setTimeout(() => {
        if (gpsWatchIdRef.current !== null && typeof navigator !== "undefined" && navigator.geolocation) {
          navigator.geolocation.clearWatch(gpsWatchIdRef.current);
          gpsWatchIdRef.current = null;
        }
        startWatching();
      }, 2000);
    };

    const startWatching = () => {
      if (typeof navigator === "undefined" || !navigator.geolocation) return;
      try {
        const watchId = navigator.geolocation.watchPosition(
          handleNavigationPosition,
          handleGPSError,
          {
            enableHighAccuracy: useHighAccuracy,
            maximumAge: useHighAccuracy ? 3000 : 20000,
            timeout: useHighAccuracy ? 15000 : 30000,
          }
        );
        gpsWatchIdRef.current = watchId;
      } catch (e) {
        console.warn("Navigation geolocation watcher error:", e);
      }
    };

    // If current user position is already available from useUserLocation, initialize navigation immediately
    if (position) {
      handleNavigationPosition({
        coords: {
          latitude: position.lat,
          longitude: position.lng,
          accuracy: position.accuracy,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
        },
        timestamp: Date.now(),
      } as GeolocationPosition);
    }

    // Start watching position
    if (navigator.geolocation) {
      startWatching();
    } else {
      setWarning("Geolocation is not supported by your browser");
      exitNavigation();
      return;
    }

    // Lock map to follow mode
    if (map.current && position) {
      map.current.flyTo({
        center: [position.lng, position.lat],
        zoom: 17,
        pitch: 45,
        duration: 1000,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allRoutesData, selectedRouteIndex, end, position]);

  // Calculate progress along route
  const updateRouteProgress = useCallback((lng: number, lat: number) => {
    if (!navigation.isActive || navigation.routeCoordinates.length === 0) return;

    const currentPos = turf.point([lng, lat]);
    const currentStep = navigation.steps[navigation.currentStepIndex];
    
    // Calculate distance to next maneuver
    const maneuverPoint = currentStep?.maneuver.location;
    if (maneuverPoint) {
      const distToManeuver = turf.distance(currentPos, turf.point(maneuverPoint), { units: "meters" });
      
      setNavigation(prev => ({
        ...prev,
        distanceToNextTurn: distToManeuver,
      }));

      // Check for distance-based announcements (500m, 200m, 100m, 50m)
      const nextDistance = getNextAnnouncementDistance(distToManeuver, navigation.announcedDistances);
      if (nextDistance !== null && currentStep) {
        const instruction = formatTurnInstruction(currentStep, nextDistance, true);
        sendNotification("Navigation", instruction);
        
        // Mark this distance as announced
        setNavigation(prev => ({
          ...prev,
          announcedDistances: new Set([...prev.announcedDistances, nextDistance]),
        }));
      }

      // Speed-adaptive hazard proximity check in navigation
      const navSpeedKmh = position?.speed ? position.speed * 3.6 : 0;
      const isHighNavSpeed = navSpeedKmh > 35;
      const effectiveNavRadius = isHighNavSpeed ? 150 : 80;

      const nearbyNavHazard = navigation.hazardsOnRoute.find((hazard) => {
        const hazardId = String(hazard.id ?? `${hazard.type}-${hazard.lat}-${hazard.lng}`);
        const dist = haversineDistance(lat, lng, hazard.lat, hazard.lng);
        return (
          !navigation.announcedHazards.has(hazardId) &&
          dist < effectiveNavRadius
        );
      });

      if (nearbyNavHazard) {
        const hazardId = String(
          nearbyNavHazard.id ??
            `${nearbyNavHazard.type}-${nearbyNavHazard.lat}-${nearbyNavHazard.lng}`
        );
        const hazardDistance = Math.round(haversineDistance(lat, lng, nearbyNavHazard.lat, nearbyNavHazard.lng));
        const formattedType = String(nearbyNavHazard.type ?? "hazard").charAt(0).toUpperCase() + String(nearbyNavHazard.type ?? "hazard").slice(1);

        let hazardMessage: string;
        if (hazardDistance <= 25) {
          hazardMessage = `Caution: ${formattedType} in ${hazardDistance} meters! Reduce speed now.`;
        } else if (isHighNavSpeed) {
          hazardMessage = `High speed detected (${Math.round(navSpeedKmh)} km/h)! Slow down, ${formattedType} reported in ${hazardDistance} meters.`;
        } else {
          hazardMessage = `${formattedType} reported ahead in ${hazardDistance} meters.`;
        }

        sendNotification("Hazard Ahead", hazardMessage);
        setWarning(hazardMessage);
        if (typeof nearbyNavHazard.id === "number") {
          notifiedHazardIds.current.add(nearbyNavHazard.id);
        }

        setNavigation((prev) => ({
          ...prev,
          announcedHazards: new Set([...prev.announcedHazards, hazardId]),
        }));
      }

      // Move to next step if close enough (within 20m)
      if (distToManeuver < 20 && navigation.currentStepIndex < navigation.steps.length - 1) {
        const nextStep = navigation.steps[navigation.currentStepIndex + 1];
        
        setNavigation(prev => ({
          ...prev,
          currentStepIndex: prev.currentStepIndex + 1,
          distanceToNextTurn: nextStep?.distance || 0,
          announcedDistances: new Set(), // Reset for next turn
        }));
        
        // Announce next instruction
        if (nextStep) {
          const nextInstruction = formatTurnInstruction(nextStep, nextStep.distance, false);
          sendNotification("Next Turn", nextInstruction);
        }
      }
    }
  }, [navigation, sendNotification, position?.speed]);

  // Check if user deviated from route
  const checkDeviation = useCallback((lng: number, lat: number) => {
    if (!navigation.isActive || navigation.routeCoordinates.length === 0 || isReroutingRef.current) return;

    const currentPos = turf.point([lng, lat]);
    const routeLine = turf.lineString(navigation.routeCoordinates);
    const snapped = turf.nearestPointOnLine(routeLine, currentPos);
    
    // Calculate perpendicular distance from route
    const distanceFromRoute = turf.distance(currentPos, snapped, { units: "meters" });

    if (distanceFromRoute > 30) {
      // User is >30m off route - start timer
      if (!offRouteTimerRef.current) {
        offRouteTimerRef.current = setTimeout(() => {
          triggerReroute(lng, lat);
        }, 5000); // Wait 5 seconds before rerouting
      }
    } else {
      // User is back on route - cancel reroute timer
      if (offRouteTimerRef.current) {
        clearTimeout(offRouteTimerRef.current);
        offRouteTimerRef.current = null;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation]);

  // Handle GPS position updates during navigation
  const handleNavigationPosition = useCallback((pos: GeolocationPosition) => {
    const { latitude: lat, longitude: lng } = pos.coords;
    const currentPos = turf.point([lng, lat]);

    let newBearing = navigation.bearing;

    // Calculate bearing if we have a previous position
    if (lastPositionRef.current) {
      const from = turf.point([lastPositionRef.current.lng, lastPositionRef.current.lat]);
      const to = currentPos;
      const calculatedBearing = turf.bearing(from, to);
      
      // Only update bearing if movement is significant (reduces jitter)
      const distance = turf.distance(from, to, { units: "meters" });
      if (distance > 3) { // Only update if moved more than 3 meters
        newBearing = calculatedBearing;
        setNavigation(prev => ({ ...prev, bearing: calculatedBearing }));
      }
    }
    lastPositionRef.current = { lat, lng };

    // Update user marker with smooth animation and rotation
    if (userMarker.current && map.current) {
      const element = userMarker.current.getElement();
      
      // Rotate the arrow to match bearing (bearing is relative to north, 0° = north)
      const arrow = element.querySelector('.user-location-arrow');
      if (arrow) {
        (arrow as HTMLElement).style.transform = `rotate(${newBearing}deg)`;
        (arrow as HTMLElement).style.transition = 'transform 0.3s ease-out';
      }
      
      // Animate to new position
      userMarker.current.setLngLat([lng, lat]);
      
      // Center map on user (follow mode) with rotation
      map.current.easeTo({
        center: [lng, lat],
        bearing: newBearing, // Rotate map to match travel direction
        duration: 500,
      });
    }

    // Update route progress
    if (navigation.isActive) {
      updateRouteProgress(lng, lat);
    }
    
    // Check if off-route
    if (navigation.isActive) {
      checkDeviation(lng, lat);
    }
  }, [navigation.bearing, navigation.isActive, updateRouteProgress, checkDeviation]);

  // Trigger reroute
  const triggerReroute = async (lng: number, lat: number) => {
    if (!end || isReroutingRef.current) return;

    isReroutingRef.current = true;
    setWarning("Rerouting...");

    try {
      const res = await fetch(
        `${API_URL}/api/route?from=${lng},${lat}&to=${end[0]},${end[1]}`
      );
      
      if (!res.ok) throw new Error("Reroute failed");

      const data = await res.json();
      
      // Update route with new data
      setAllRoutesData(data);
      setSelectedRouteIndex(0);
      
      // Restart navigation with new route
      const newRoute = data.allRoutes[0];
      if (newRoute.legs && newRoute.legs.length > 0) {
        const steps = newRoute.legs[0].steps;
        const coordinates = newRoute.geometry.coordinates as [number, number][];

        setNavigation({
          isActive: true,
          currentStepIndex: 0,
          distanceToNextTurn: steps[0]?.distance || 0,
          bearing: navigation.bearing,
          routeCoordinates: coordinates,
          steps,
          hazardsOnRoute: data.routeHazards?.[0] ?? data.hazardsOnRoute ?? [],
          announcedDistances: new Set(),
          announcedHazards: new Set(),
        });

        // Redraw route on map
        if (map.current) {
          // Clean up old routes
          for (let i = 0; i < 10; i++) {
            const id = `route-${i}`;
            if (map.current.getLayer(id)) map.current.removeLayer(id);
            if (map.current.getSource(id)) map.current.removeSource(id);
          }

          // Draw new route
          const id = "route-0";
          const geojson: Feature<LineString> = {
            type: "Feature",
            geometry: newRoute.geometry,
            properties: { routeIndex: 0, isBest: true },
          };
          map.current.addSource(id, { type: "geojson", data: geojson });
          map.current.addLayer({
            id,
            type: "line",
            source: id,
            layout: { "line-join": "round", "line-cap": "round" },
            paint: {
              "line-color": "#a855f7",
              "line-width": 7,
              "line-opacity": 1,
            },
          });
        }

        setWarning(null);
      }
    } catch (error) {
      console.error("Reroute error:", error);
      setWarning("Reroute failed. Continue to destination.");
    } finally {
      isReroutingRef.current = false;
      if (offRouteTimerRef.current) {
        clearTimeout(offRouteTimerRef.current);
        offRouteTimerRef.current = null;
      }
    }
  };

  // Exit navigation
  const exitNavigation = useCallback(() => {
    // Stop GPS tracking & retry timer
    if (gpsRetryTimerRef.current) {
      clearTimeout(gpsRetryTimerRef.current);
      gpsRetryTimerRef.current = null;
    }
    if (gpsWatchIdRef.current !== null && typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.clearWatch(gpsWatchIdRef.current);
      gpsWatchIdRef.current = null;
    }

    // Clear timers
    if (offRouteTimerRef.current) {
      clearTimeout(offRouteTimerRef.current);
      offRouteTimerRef.current = null;
    }

    // Reset navigation state
    setNavigation({
      isActive: false,
      currentStepIndex: 0,
      distanceToNextTurn: 0,
      bearing: 0,
      routeCoordinates: [],
      steps: [],
      hazardsOnRoute: [],
      announcedDistances: new Set(),
      announcedHazards: new Set(),
    });
    notifiedHazardIds.current.clear();

    isReroutingRef.current = false;
    lastPositionRef.current = null;

    // Reset map view
    if (map.current) {
      map.current.easeTo({
        pitch: 0,
        bearing: 0,
        duration: 500,
      });
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (gpsRetryTimerRef.current) {
        clearTimeout(gpsRetryTimerRef.current);
      }
      if (gpsWatchIdRef.current !== null && typeof navigator !== "undefined" && navigator.geolocation) {
        navigator.geolocation.clearWatch(gpsWatchIdRef.current);
      }
      if (offRouteTimerRef.current) {
        clearTimeout(offRouteTimerRef.current);
      }
    };
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ position: "relative", width: "100%", height: "100vh", overflow: "hidden" }}>

      {/* ── Warning Banner ─────────────────────────────────────────────── */}
      <WarningBanner message={warning} onDismiss={() => setWarning(null)} />

      {/* ── Search Panel (Collapsible Dropdown / Popup) ──────────────────── */}
      <div 
        className="search-panel" 
        style={{
          ...(warning ? { top: 60 } : {}),
          transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        {/* Top return, title & dropdown collapse button */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingBottom: isSearchOpen ? "6px" : "0",
            borderBottom: isSearchOpen ? "1px solid rgba(255, 255, 255, 0.08)" : "none",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Link
              href="/welcome"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                fontSize: "11px",
                fontWeight: 700,
                color: "#00ccff",
                textDecoration: "none",
                background: "rgba(0, 204, 255, 0.12)",
                border: "1px solid rgba(0, 204, 255, 0.3)",
                padding: "4px 10px",
                borderRadius: "999px",
                transition: "all 0.15s ease",
              }}
              title="Return to Main Website"
            >
              <ArrowLeft className="w-3 h-3" />
              <span>Main</span>
            </Link>

            <span className="flex items-center gap-1.5 text-xs font-bold text-slate-300 uppercase tracking-wider">
              <Shield className="w-3.5 h-3.5 text-sky-400" />
              <span>Routing</span>
            </span>
          </div>

          <button
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            style={{
              background: "rgba(255, 255, 255, 0.08)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              color: "#ffffff",
              cursor: "pointer",
              borderRadius: "999px",
              padding: "4px 10px",
              fontSize: "11px",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: "4px",
              transition: "all 0.15s ease",
            }}
            title={isSearchOpen ? "Collapse search panel" : "Expand search panel"}
          >
            {isSearchOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            <span style={{ fontSize: "10px" }}>{isSearchOpen ? "Hide" : "Route"}</span>
          </button>
        </div>

        {/* Expandable fields */}
        {isSearchOpen && (
          <>
            {/* FROM input */}
            <div className="search-panel__field">
              <div className="search-panel__input-row flex items-center">
                <span className="search-panel__dot search-panel__dot--start" />
                <input
                  id="search-from"
                  type="text"
                  placeholder="From: start location..."
                  value={fromQuery}
                  onChange={(e) => handleFromSearch(e.target.value)}
                  className="search-panel__input"
                  autoComplete="off"
                />
                {fromQuery && (
                  <button
                    onClick={clearFrom}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "rgba(255, 255, 255, 0.4)",
                      cursor: "pointer",
                      padding: "0 4px",
                      display: "flex",
                      alignItems: "center",
                    }}
                    title="Clear start location"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  {position && (
                    <button
                      className="search-panel__loc-btn flex items-center justify-center"
                      onClick={useMyLocation}
                      title="Use my current GPS location"
                      aria-label="Use my location as start"
                    >
                      <Locate className="w-3.5 h-3.5 text-sky-400" />
                    </button>
                  )}
                  <button
                    className={`search-panel__loc-btn flex items-center justify-center ${mapPickTarget === 'from' ? 'active' : ''}`}
                    onClick={() => setMapPickTarget(mapPickTarget === 'from' ? null : 'from')}
                    title={mapPickTarget === 'from' ? "Click map to set Start point" : "Pick Start point on map"}
                    aria-label="Pick start on map"
                    style={mapPickTarget === 'from' ? { background: "rgba(168, 85, 247, 0.3)", borderColor: "#a855f7" } : {}}
                  >
                    <Crosshair className="w-3.5 h-3.5 text-purple-400" />
                  </button>
                </div>
              </div>
              {fromResults.length > 0 && (
                <div className="search-panel__results">
                  {fromResults.map((place, i) => (
                    <div
                      key={i}
                      className="search-panel__result-item"
                      onClick={() => selectFrom(place.center, place.place_name)}
                    >
                      {place.place_name}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* TO input */}
            <div className="search-panel__field">
              <div className="search-panel__input-row flex items-center">
                <span className="search-panel__dot search-panel__dot--end" />
                <input
                  id="search-to"
                  type="text"
                  placeholder="To: destination..."
                  value={toQuery}
                  onChange={(e) => handleToSearch(e.target.value)}
                  className="search-panel__input"
                  autoComplete="off"
                />
                {toQuery && (
                  <button
                    onClick={clearTo}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "rgba(255, 255, 255, 0.4)",
                      cursor: "pointer",
                      padding: "0 4px",
                      display: "flex",
                      alignItems: "center",
                    }}
                    title="Clear destination"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  className={`search-panel__loc-btn flex items-center justify-center ${mapPickTarget === 'to' ? 'active' : ''}`}
                  onClick={() => setMapPickTarget(mapPickTarget === 'to' ? null : 'to')}
                  title={mapPickTarget === 'to' ? "Click map to set Destination" : "Pick Destination on map"}
                  aria-label="Pick destination on map"
                  style={mapPickTarget === 'to' ? { background: "rgba(255, 77, 109, 0.3)", borderColor: "#ff4d6d" } : {}}
                >
                  <Crosshair className="w-3.5 h-3.5 text-rose-400" />
                </button>
              </div>
              {toResults.length > 0 && (
                <div className="search-panel__results">
                  {toResults.map((place, i) => (
                    <div
                      key={i}
                      className="search-panel__result-item"
                      onClick={() => selectTo(place.center, place.place_name)}
                    >
                      {place.place_name}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Get Route & Clear buttons */}
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                id="get-route-btn"
                onClick={getRoute}
                disabled={!start || !end || isLoadingRoute}
                className="search-panel__route-btn flex items-center justify-center gap-2"
                style={{ flex: 1 }}
                aria-busy={isLoadingRoute}
              >
                <Navigation className="w-4 h-4" />
                <span>{isLoadingRoute ? "Finding best route..." : "Get Safe Route"}</span>
              </button>
              {(start || end) && (
                <button
                  onClick={clearAllRoute}
                  style={{
                    background: "rgba(255, 255, 255, 0.08)",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    color: "#ffffff",
                    borderRadius: "var(--radius-md)",
                    padding: "0 14px",
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                  title="Reset all points and routes"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                  <span>Clear</span>
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── Active Map Picker Floating Indicator ──────────────────────── */}
      {mapPickTarget && (
        <div
          style={{
            position: "absolute",
            top: "20px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 150,
            background: mapPickTarget === "from" ? "rgba(168, 85, 247, 0.95)" : "rgba(255, 77, 109, 0.95)",
            color: "#ffffff",
            padding: "8px 20px",
            borderRadius: "999px",
            fontSize: "13px",
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            gap: "12px",
            boxShadow: "0 6px 20px rgba(0, 0, 0, 0.4)",
            backdropFilter: "blur(8px)",
            border: "1px solid rgba(255, 255, 255, 0.3)",
          }}
        >
          <span className="flex items-center gap-2">
            <Crosshair className="w-4 h-4" />
            <span>Click anywhere on the map to set {mapPickTarget === "from" ? "Start Point (Purple)" : "Destination (Red)"}</span>
          </span>
          <button
            onClick={() => setMapPickTarget(null)}
            style={{
              background: "rgba(0, 0, 0, 0.25)",
              border: "none",
              color: "#fff",
              cursor: "pointer",
              borderRadius: "50%",
              width: "22px",
              height: "22px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            title="Cancel pick mode"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ── Map Container ──────────────────────────────────────────────── */}
      <div
        ref={mapContainer}
        style={{ 
          width: "100%", 
          height: "100vh",
          cursor: mapPickTarget ? "crosshair" : "default"
        }}
        aria-label="Interactive road map"
        role="application"
      />

      {/* ── Navigation Panel ───────────────────────────────────────────── */}
      {navigation.isActive && navigation.steps.length > 0 && (
        <NavigationPanel
          currentStep={navigation.steps[navigation.currentStepIndex] || null}
          distanceToTurn={navigation.distanceToNextTurn}
          totalDistance={allRoutesData?.allRoutes[selectedRouteIndex]?.distance || 0}
          totalDuration={
            allRoutesData?.routeAnalyses?.[selectedRouteIndex]?.adjustedDuration ??
            allRoutesData?.allRoutes[selectedRouteIndex]?.duration ??
            0
          }
          originalTotalDuration={allRoutesData?.allRoutes[selectedRouteIndex]?.duration || 0}
          onExit={exitNavigation}
        />
      )}

      {/* ── Route Panel ────────────────────────────────────────────────── */}
      {!navigation.isActive && (
        <RoutePanel
          distance={routeInfo?.distance ?? null}
          duration={routeInfo?.duration ?? null}
          originalDuration={routeInfo?.originalDuration ?? null}
          hazardCount={routeInfo?.hazardCount ?? null}
          onClose={() => {
            setRouteInfo(null);
            setAllRoutesData(null);
            setSelectedRouteIndex(0);
          }}
          onStartNavigation={startNavigation}
          canNavigate={!!allRoutesData && !!end}
        />
      )}

      {/* ── Route Selector ─────────────────────────────────────────────── */}
      {!navigation.isActive && allRoutesData && allRoutesData.allRoutes.length > 1 && (
        <RouteSelector
          routes={allRoutesData.allRoutes}
          routeAnalyses={allRoutesData.routeAnalyses}
          selectedIndex={selectedRouteIndex}
          onSelect={handleRouteSelection}
          onClose={() => {
            // Keep routes visible but hide selector
            setAllRoutesData(null);
          }}
        />
      )}

      {/* ── Profile / Dashboard Trigger (top-right) ──────────────────── */}
      {user ? (
        <div style={{ position: "absolute", top: "16px", right: "60px", zIndex: 10, display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            id="map-profile-btn"
            onClick={() => setProfileModalOpen(true)}
            aria-label="User Profile"
            title={`View Profile: ${user.name} (@${user.handle || "rider"})`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "rgba(15, 23, 42, 0.88)",
              backdropFilter: "blur(14px)",
              border: "1.5px solid rgba(56, 189, 248, 0.4)",
              boxShadow: "0 4px 20px rgba(0, 0, 0, 0.4), 0 0 16px rgba(56, 189, 248, 0.2)",
              borderRadius: "999px",
              padding: "4px 14px 4px 4px",
              cursor: "pointer",
              transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          >
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                overflow: "hidden",
                background: "linear-gradient(135deg, #0284c7, #6366f1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: "13px",
                color: "#fff",
                border: "1.5px solid #38bdf8",
                flexShrink: 0,
              }}
            >
              {user.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.avatar_url} alt={user.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                (user.name || "U")[0]?.toUpperCase()
              )}
            </div>
            <div style={{ textAlign: "left", lineHeight: 1.15 }}>
              <div style={{ fontSize: "12px", fontWeight: 700, color: "#f8fafc", maxWidth: "90px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {user.name.split(" ")[0]}
              </div>
              <div style={{ fontSize: "10px", color: "#38bdf8", fontFamily: "monospace", fontWeight: 600 }}>
                @{user.handle ? user.handle.replace(/^@/, '') : `rider_${user.id}`}
              </div>
            </div>
          </button>
        </div>
      ) : (
        <button
          onClick={() => setAuthModalOpen(true)}
          className="map-dashboard-btn"
          aria-label="Sign In"
          title="Sign In"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
            fontSize: "12px",
            color: "#fff",
            background: "linear-gradient(135deg, #00ccff, #3b82f6)",
            width: "auto",
            padding: "0 16px",
            borderRadius: "999px",
            border: "none",
            boxShadow: "0 4px 14px rgba(0, 204, 255, 0.4)",
            cursor: "pointer",
          }}
        >
          <span>Sign In</span>
        </button>
      )}

      {/* ── Profile Modal (View & Edit Profile / Hobbies) ────────────────── */}
      <ProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        onProfileUpdated={() => {
          loadHazards();
        }}
      />

      {/* ── Contributor Card (Public Profile Popup on Map) ────────────────── */}
      <ContributorCard
        isOpen={contributorModal.isOpen}
        handleOrId={contributorModal.handleOrId}
        initialData={contributorModal.initialData}
        onClose={() => setContributorModal({ isOpen: false, handleOrId: null })}
      />

      {/* ── Auth Modal (In-Place Popup) ────────────────────────────────── */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />

      {/* ── Floating Report Button ─────────────────────────────────────── */}
      <ReportButton
        onClick={() => {
          if (!user) {
            toast.info("Please sign in or register to report road hazards");
            setAuthModalOpen(true);
            return;
          }
          if (permission !== "granted") requestPermission();
          setIsReportOpen(true);
        }}
      />

      {/* ── Bottom Sheet (hazard report form) ─────────────────────────── */}
      <BottomSheet
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        userLat={position?.lat ?? null}
        userLng={position?.lng ?? null}
        apiUrl={API_URL}
        onSuccess={handleReportSuccess}
        idToken={idToken}
        onRequireAuth={() => setAuthModalOpen(true)}
      />
    </div>
  );
}
