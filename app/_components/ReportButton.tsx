"use client";

interface ReportButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

export default function ReportButton({ onClick, disabled }: ReportButtonProps) {
  return (
    <button
      id="report-hazard-btn"
      className="report-btn"
      onClick={onClick}
      disabled={disabled}
      aria-label="Report a road hazard"
      title="Report a hazard"
    >
      <span className="report-btn__icon" aria-hidden="true">⚠</span>
      <span className="report-btn__label">Report</span>
    </button>
  );
}
