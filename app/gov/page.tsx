"use client";

import { useState } from "react";
import Header from "./_components/Header";
import StatsGrid from "./_components/StatsGrid";
import DataTable from "./_components/DataTable";
import HazardPanel from "./_components/HazardPanel";
import { useHazards } from "./_hooks/useHazards";
import type { Hazard } from "./_services/api";

export default function GovDashboardPage() {
  const { data: hazards = [], isPending, isError } = useHazards();
  const [selected, setSelected] = useState<Hazard | null>(null);

  return (
    <>
      <Header
        title="Dashboard Overview"
        subtitle="Real-time road hazard status across your jurisdiction"
      />

      <div className="gov-content">
        <StatsGrid />

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
            hazards={hazards}
            selectedId={selected?.id ?? null}
            onSelect={setSelected}
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
