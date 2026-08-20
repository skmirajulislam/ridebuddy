import axios from "axios";
import pool from "../db";
import type { HazardRecord } from "./hazard.service";

export interface RouteAnalysis {
  hazardCount: number;
  severitySum: number;
  penalty: number;
  estimatedDelaySeconds: number;
  adjustedDuration: number;
  typeBreakdown: Record<string, number>;
  score?: number;
}

export interface RankedRouteResult {
  bestRoute: any;
  allRoutes: any[];
  routeAnalyses: RouteAnalysis[];
  routeHazards: HazardRecord[][];
  analysis: RouteAnalysis | null;
  hazardsOnRoute: HazardRecord[];
}

function haversineDistance(point: [number, number], hazard: HazardRecord): number {
  const [lng1, lat1] = point;
  const { lng: lng2, lat: lat2 } = hazard;

  const R = 6371e3;
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δφ = toRad(lat2 - lat1);
  const Δλ = toRad(lng2 - lng1);

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function isNear(point: [number, number], hazard: HazardRecord, threshold = 100): boolean {
  return haversineDistance(point, hazard) < threshold;
}

function getBoundingBox(coords: [number, number][]) {
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;

  coords.forEach(([lng, lat]) => {
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
  });

  return { minLat, maxLat, minLng, maxLng };
}

export async function getRoute(from: string, to: string): Promise<RankedRouteResult> {
  const url = `https://router.project-osrm.org/route/v1/driving/${from};${to}?alternatives=true&overview=full&geometries=geojson&steps=true&annotations=true`;

  console.log("[Routing] Requesting OSRM:", url);
  const response = await axios.get(url);
  const routes = response.data.routes || [];

  if (routes.length === 0) {
    throw new Error("No routes found between the provided locations.");
  }

  const rankedRoutes: {
    route: any;
    analysis: RouteAnalysis;
    hazardsOnRoute: HazardRecord[];
  }[] = [];

  for (const route of routes) {
    const coords: [number, number][] = route.geometry.coordinates;
    const { minLat, maxLat, minLng, maxLng } = getBoundingBox(coords);

    const hazardRes = await pool.query<HazardRecord>(
      `SELECT * FROM hazards
       WHERE status != 'resolved'
         AND lat BETWEEN $1 AND $2
         AND lng BETWEEN $3 AND $4`,
      [minLat, maxLat, minLng, maxLng]
    );

    const hazards = hazardRes.rows;

    let hazardCount = 0;
    let severitySum = 0;
    let penalty = 0;
    let estimatedDelaySeconds = 0;
    const typeBreakdown: Record<string, number> = {};
    const hazardsOnRoute: HazardRecord[] = [];

    hazards.forEach((h) => {
      // Sample every 3 points along coordinates for performant matching
      for (let i = 0; i < coords.length; i += 3) {
        if (isNear(coords[i], h)) {
          const severity = h.severity || 1;
          const weight = severity * 30;
          penalty += weight;
          severitySum += severity;
          estimatedDelaySeconds += severity * 40;
          hazardCount++;
          typeBreakdown[h.type] = (typeBreakdown[h.type] || 0) + 1;

          if (!hazardsOnRoute.find((x) => x.id === h.id)) {
            hazardsOnRoute.push(h);
          }
          break;
        }
      }
    });

    rankedRoutes.push({
      route,
      analysis: {
        hazardCount,
        severitySum,
        penalty,
        estimatedDelaySeconds,
        adjustedDuration: route.duration + estimatedDelaySeconds,
        typeBreakdown,
      },
      hazardsOnRoute,
    });
  }

  const durations = rankedRoutes.map((r) => r.analysis.adjustedDuration);
  const distances = rankedRoutes.map((r) => r.route.distance);
  const hazardMetrics = rankedRoutes.map(
    (r) => r.analysis.hazardCount * 2 + r.analysis.severitySum * 3
  );

  const minDuration = Math.min(...durations);
  const maxDuration = Math.max(...durations);
  const minDistance = Math.min(...distances);
  const maxDistance = Math.max(...distances);
  const minHazardMetric = Math.min(...hazardMetrics);
  const maxHazardMetric = Math.max(...hazardMetrics);

  const normalize = (val: number, min: number, max: number) =>
    max === min ? 0 : (val - min) / (max - min);

  // Balanced scoring: 55% hazard safety, 30% time, 15% distance
  const HAZARD_WEIGHT = 0.55;
  const TIME_WEIGHT = 0.3;
  const DISTANCE_WEIGHT = 0.15;

  rankedRoutes.forEach((r) => {
    const hazardMetric = r.analysis.hazardCount * 2 + r.analysis.severitySum * 3;
    const normalizedHazard = normalize(hazardMetric, minHazardMetric, maxHazardMetric);
    const normalizedTime = normalize(r.analysis.adjustedDuration, minDuration, maxDuration);
    const normalizedDistance = normalize(r.route.distance, minDistance, maxDistance);

    r.analysis.score =
      HAZARD_WEIGHT * normalizedHazard +
      TIME_WEIGHT * normalizedTime +
      DISTANCE_WEIGHT * normalizedDistance;
  });

  rankedRoutes.sort((a, b) => {
    if (a.analysis.score !== b.analysis.score) {
      return (a.analysis.score ?? 0) - (b.analysis.score ?? 0);
    }
    if (a.analysis.hazardCount !== b.analysis.hazardCount) {
      return a.analysis.hazardCount - b.analysis.hazardCount;
    }
    if (a.route.duration !== b.route.duration) {
      return a.route.duration - b.route.duration;
    }
    return a.route.distance - b.route.distance;
  });

  const best = rankedRoutes[0];
  const bestRoute = best?.route ?? null;
  const bestDetails = best?.analysis ?? null;
  const bestHazardsOnRoute = best?.hazardsOnRoute ?? [];

  return {
    bestRoute,
    allRoutes: rankedRoutes.map((r) => r.route),
    routeAnalyses: rankedRoutes.map((r) => r.analysis),
    routeHazards: rankedRoutes.map((r) => r.hazardsOnRoute),
    analysis: bestDetails,
    hazardsOnRoute: bestHazardsOnRoute,
  };
}
