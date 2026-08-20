"use client";

import React from "react";
import { Clock, Milestone, AlertTriangle, Navigation, X } from "lucide-react";

interface RoutePanelProps {
  distance: number | null;
  duration: number | null;
  originalDuration: number | null;
  hazardCount: number | null;
  onClose: () => void;
  onStartNavigation?: () => void;
  canNavigate?: boolean;
}

function formatDistance(meters: number): string {
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${Math.round(meters)} m`;
}

function formatDuration(seconds: number): string {
  const mins = Math.round(seconds / 60);
  if (mins >= 60) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m`;
  }
  return `${mins} min`;
}

export default function RoutePanel({
  distance,
  duration,
  originalDuration,
  hazardCount,
  onClose,
  onStartNavigation,
  canNavigate = false,
}: RoutePanelProps) {
  if (distance === null || duration === null) return null;

  return (
    <div className="route-panel" role="region" aria-label="Route information">
      <div className="route-panel__header flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
          <span className="route-panel__title font-semibold text-sm">Route Summary</span>
        </div>
        <button
          className="route-panel__close flex items-center justify-center w-6 h-6 rounded-full hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
          onClick={onClose}
          aria-label="Close route panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="route-panel__stats flex items-center justify-around py-2">
        <div className="route-panel__stat flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-sky-500/15 flex items-center justify-center text-sky-400">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <div className="route-panel__stat-value font-bold text-base text-slate-100">{formatDuration(duration)}</div>
            <div className="route-panel__stat-label text-[11px] text-slate-400">Adjusted Duration</div>
            {originalDuration !== null && originalDuration !== duration && (
              <div className="route-panel__stat-subtext text-[10px] text-slate-500">
                Base: {formatDuration(originalDuration)}
              </div>
            )}
          </div>
        </div>

        <div className="route-panel__divider h-8 w-[1px] bg-slate-700/60" />

        <div className="route-panel__stat flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center text-emerald-400">
            <Milestone className="w-4 h-4" />
          </div>
          <div>
            <div className="route-panel__stat-value font-bold text-base text-slate-100">{formatDistance(distance)}</div>
            <div className="route-panel__stat-label text-[11px] text-slate-400">Total Distance</div>
          </div>
        </div>

        {hazardCount !== null && hazardCount > 0 && (
          <>
            <div className="route-panel__divider h-8 w-[1px] bg-slate-700/60" />
            <div className="route-panel__stat route-panel__stat--warning flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center text-amber-400">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <div className="route-panel__stat-value font-bold text-base text-amber-400">{hazardCount}</div>
                <div className="route-panel__stat-label text-[11px] text-slate-400">Hazards on Route</div>
              </div>
            </div>
          </>
        )}
      </div>

      {canNavigate && onStartNavigation && (
        <button
          className="route-panel__nav-btn flex items-center justify-center gap-2 w-full py-2.5 rounded-xl font-semibold text-sm transition-all"
          onClick={onStartNavigation}
          aria-label="Start turn-by-turn navigation"
        >
          <Navigation className="w-4 h-4" />
          <span>Start Navigation</span>
        </button>
      )}
    </div>
  );
}
