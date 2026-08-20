"use client";

import { useState, useMemo } from "react";
import Header from "../_components/Header";
import MapView from "../_components/MapView";
import HazardPanel from "../_components/HazardPanel";
import { useHazards } from "../_hooks/useHazards";
import type { Hazard } from "../_services/api";

function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function GovMapPage() {
  const { data: hazards = [], isPending } = useHazards();
  const [selected, setSelected] = useState<Hazard | null>(null);
  const [userLoc, setUserLoc] = useState<{ lng: number; lat: number } | null>(
    null
  );

  const nearestHazards = useMemo(() => {
    if (!userLoc || hazards.length === 0) return [];

    // Calculate distance for all active/in-progress hazards
    const withDistance = hazards
      .filter((h) => h.status !== "resolved")
      .map((h) => ({
        ...h,
        distKm: getDistanceKm(userLoc.lat, userLoc.lng, h.lat, h.lng),
      }));

    // Sort by nearest and take top 5
    return withDistance.sort((a, b) => a.distKm - b.distKm).slice(0, 5);
  }, [hazards, userLoc]);

  return (
    <>
      <Header
        title="Map View"
        subtitle="Spatial overview of all reported hazards"
      />
      <div
        className="gov-content"
        style={{
          paddingRight: selected ? "420px" : "24px",
          transition: "padding .25s",
        }}
      >
        {/* Legend */}
        <div
          style={{
            display: "flex",
            gap: "16px",
            marginBottom: "12px",
            fontSize: "12px",
            color: "var(--gov-text-secondary)",
          }}
        >
          {[
            { color: "#00ccff", label: "Active" },
            { color: "#f6ad55", label: "In Progress" },
            { color: "#a0aec0", label: "Resolved" },
          ].map(({ color, label }) => (
            <span
              key={label}
              style={{ display: "flex", alignItems: "center", gap: "6px" }}
            >
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: color,
                  display: "inline-block",
                }}
              />
              {label}
            </span>
          ))}
          {isPending && (
            <span style={{ marginLeft: "auto" }}>
              <span className="spinner" /> Loading…
            </span>
          )}
        </div>

        <div style={{ position: "relative" }}>
          <MapView
            hazards={hazards}
            selectedId={selected?.id ?? null}
            onSelect={setSelected}
            height="calc(100vh - 168px)"
            onUserLocate={(lng, lat) => setUserLoc({ lng, lat })}
          />

          {/* Nearest Hazards Overlay */}
          {userLoc && nearestHazards.length > 0 && (
            <div
              style={{
                position: "absolute",
                bottom: "40px",
                left: "20px",
                background: "white",
                padding: "16px",
                borderRadius: "12px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                zIndex: 10,
                width: "300px",
              }}
            >
              <h3
                style={{
                  margin: "0 0 12px 0",
                  fontSize: "14px",
                  color: "var(--gov-text)",
                  fontWeight: 600,
                }}
              >
                Nearest Unresolved Hazards
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {nearestHazards.map((h) => (
                  <div
                    key={h.id}
                    onClick={() => setSelected(h)}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "8px",
                      background: "var(--gov-bg)",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "12px",
                      border:
                        selected?.id === h.id
                          ? "1px solid var(--gov-primary)"
                          : "1px solid transparent",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontWeight: 600,
                          textTransform: "capitalize",
                        }}
                      >
                        {h.type.replace("_", " ")}
                      </div>
                      <div style={{ color: "var(--gov-text-secondary)" }}>
                        Status: {h.status.replace("_", " ")}
                      </div>
                    </div>
                    <div
                      style={{
                        color: "#0088cc",
                        fontWeight: "bold",
                      }}
                    >
                      {h.distKm < 1
                        ? `${Math.round(h.distKm * 1000)}m`
                        : `${h.distKm.toFixed(1)}km`}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <HazardPanel
        hazard={
          selected ? hazards.find((h) => h.id === selected.id) ?? selected : null
        }
        onClose={() => setSelected(null)}
      />
    </>
  );
}
