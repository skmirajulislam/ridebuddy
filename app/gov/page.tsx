"use client";

import { useState, useMemo } from "react";
import Header from "./_components/Header";
import StatsGrid from "./_components/StatsGrid";
import DataTable from "./_components/DataTable";
import HazardPanel from "./_components/HazardPanel";
import ContributorLeaderboard from "./_components/ContributorLeaderboard";
import { useHazards } from "./_hooks/useHazards";
import type { Hazard } from "./_services/api";

export default function GovDashboardPage() {
  const { data: hazards = [], isPending, isError } = useHazards();
  const [selected, setSelected] = useState<Hazard | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  // Filter hazards if an official selects a specific citizen contributor
  const displayedHazards = useMemo(() => {
    if (selectedUserId === null) return hazards;
    return hazards.filter((h) => (h.user_id || 0) === selectedUserId);
  }, [hazards, selectedUserId]);

  return (
    <>
      <Header
        title="Dashboard Overview"
        subtitle="Real-time road hazard status & citizen contribution tracking across your jurisdiction"
      />

      <div className="gov-content">
        <StatsGrid />

        {/* Citizen Contributors Breakdown Widget */}
        {!isPending && !isError && (
          <ContributorLeaderboard
            hazards={hazards}
            selectedUserId={selectedUserId}
            onSelectUser={setSelectedUserId}
          />
        )}

        {isPending && (
          <div
            style={{
              textAlign: "center",
              padding: "48px",
              color: "var(--gov-text-muted)",
            }}
          >
            <span className="spinner" /> Loading hazards…
          </div>
        )}
        {isError && (
          <div className="error-msg">Failed to load hazards. Check database connection.</div>
        )}

        {!isPending && !isError && (
          <DataTable
            hazards={displayedHazards}
            selectedId={selected?.id ?? null}
            onSelect={setSelected}
            title={
              selectedUserId !== null
                ? `Hazard Reports by Contributor (UID #${selectedUserId})`
                : "All Hazard Reports"
            }
          />
        )}
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
