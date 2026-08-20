"use client";

interface WarningBannerProps {
  message: string | null;
  onDismiss: () => void;
}

export default function WarningBanner({ message, onDismiss }: WarningBannerProps) {
  if (!message) return null;

  return (
    <div className="warning-banner" role="alert" aria-live="assertive">
      <div className="warning-banner__content">
        <span className="warning-banner__icon" aria-hidden="true">⚠️</span>
        <span className="warning-banner__text">{message}</span>
      </div>
      <button
        className="warning-banner__close"
        onClick={onDismiss}
        aria-label="Dismiss warning"
      >
        ✕
      </button>
    </div>
  );
}
