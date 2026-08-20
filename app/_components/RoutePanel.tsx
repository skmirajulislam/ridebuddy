"use client";

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
      <div className="route-panel__header">
        <span className="route-panel__title">Route Summary</span>
        <button
          className="route-panel__close"
          onClick={onClose}
          aria-label="Close route panel"
        >
          ✕
        </button>
      </div>

      <div className="route-panel__stats">
        <div className="route-panel__stat">
          <span className="route-panel__stat-icon">🕐</span>
          <div>
            <div className="route-panel__stat-value">{formatDuration(duration)}</div>
            <div className="route-panel__stat-label">Adjusted Duration</div>
            {originalDuration !== null && originalDuration !== duration && (
              <div className="route-panel__stat-subtext">
                Base: {formatDuration(originalDuration)}
              </div>
            )}
          </div>
        </div>

        <div className="route-panel__divider" />

        <div className="route-panel__stat">
          <span className="route-panel__stat-icon">📏</span>
          <div>
            <div className="route-panel__stat-value">{formatDistance(distance)}</div>
            <div className="route-panel__stat-label">Distance</div>
          </div>
        </div>

        {hazardCount !== null && hazardCount > 0 && (
          <>
            <div className="route-panel__divider" />
            <div className="route-panel__stat route-panel__stat--warning">
              <span className="route-panel__stat-icon">⚠️</span>
              <div>
                <div className="route-panel__stat-value">{hazardCount}</div>
                <div className="route-panel__stat-label">Hazards</div>
              </div>
            </div>
          </>
        )}
      </div>

      {canNavigate && onStartNavigation && (
        <button
          className="route-panel__nav-btn"
          onClick={onStartNavigation}
          aria-label="Start turn-by-turn navigation"
        >
          🧭 Start Navigation
        </button>
      )}
    </div>
  );
}
