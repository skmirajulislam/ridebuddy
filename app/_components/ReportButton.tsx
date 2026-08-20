"use client";

import React from "react";
import { ShieldAlert } from "lucide-react";

interface ReportButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

export default function ReportButton({ onClick, disabled }: ReportButtonProps) {
  return (
    <button
      id="report-hazard-btn"
      className="report-btn flex items-center justify-center gap-2"
      onClick={onClick}
      disabled={disabled}
      aria-label="Report a road hazard"
      title="Report a hazard"
    >
      <ShieldAlert className="w-5 h-5 text-amber-400" aria-hidden="true" />
      <span className="report-btn__label font-semibold">Report</span>
    </button>
  );
}
