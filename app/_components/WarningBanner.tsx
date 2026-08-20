"use client";

import React from "react";
import { AlertTriangle, X } from "lucide-react";

interface WarningBannerProps {
  message: string | null;
  onDismiss: () => void;
}

export default function WarningBanner({ message, onDismiss }: WarningBannerProps) {
  if (!message) return null;

  // Strip leading emoji if any passed from legacy strings
  const cleanMessage = message.replace(/^[\s⚠️❌🔄🧭🛡️]+/, "").trim();

  return (
    <div className="warning-banner flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 backdrop-blur-md shadow-lg" role="alert" aria-live="assertive">
      <div className="warning-banner__content flex items-center gap-2.5 text-amber-300 text-sm font-medium">
        <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-400" aria-hidden="true" />
        <span className="warning-banner__text">{cleanMessage}</span>
      </div>
      <button
        className="warning-banner__close flex items-center justify-center w-6 h-6 rounded-full hover:bg-amber-500/20 text-amber-300 hover:text-amber-100 transition-colors"
        onClick={onDismiss}
        aria-label="Dismiss warning"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
