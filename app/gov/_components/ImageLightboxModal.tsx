"use client";

import React, { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { X, ZoomIn, ZoomOut, ExternalLink, Sparkles } from "lucide-react";

interface ImageLightboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string | null;
  title?: string;
  subtitle?: string;
}

const LOUPE_SIZE = 170;
const ZOOM_LEVEL = 2.8;

export default function ImageLightboxModal({
  isOpen,
  onClose,
  imageUrl,
  title = "Hazard Photo Evidence",
  subtitle,
}: ImageLightboxModalProps) {
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);
  const [isZoomActive, setIsZoomActive] = useState(false);
  const [loupe, setLoupe] = useState<{
    x: number;
    y: number;
    relX: number;
    relY: number;
    visible: boolean;
  }>({
    x: 0,
    y: 0,
    relX: 0,
    relY: 0,
    visible: false,
  });

  const imageContainerRef = useRef<HTMLDivElement>(null);

  // Handle ESC key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Reset natural size & zoom when image URL changes
  useEffect(() => {
    setNaturalSize(null);
    setIsZoomActive(false);
    setLoupe((prev) => ({ ...prev, visible: false }));
  }, [imageUrl]);

  if (!isOpen || !imageUrl) return null;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imageContainerRef.current) return;
    const rect = imageContainerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (x < 0 || y < 0 || x > rect.width || y > rect.height) {
      setLoupe((prev) => ({ ...prev, visible: false }));
      return;
    }

    const relX = (x / rect.width) * 100;
    const relY = (y / rect.height) * 100;

    setLoupe({
      x,
      y,
      relX,
      relY,
      visible: true,
    });
  };

  const handleMouseLeave = () => {
    setLoupe((prev) => ({ ...prev, visible: false }));
  };

  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    setIsZoomActive((prev) => !prev);
    handleMouseMove(e);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0, 0, 0, 0.88)",
        backdropFilter: "blur(14px)",
        padding: "24px",
        animation: "fadeIn 0.2s ease-out",
      }}
      onClick={onClose}
    >
      {/* Modal Dialog Card - Beautifully framed with padding & rounded edges */}
      <div
        style={{
          position: "relative",
          width: "fit-content",
          maxWidth: "92vw",
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          background: "var(--gov-surface, #0f172a)",
          border: "1px solid var(--gov-border-strong, rgba(255, 255, 255, 0.16))",
          borderRadius: "20px",
          boxShadow: "0 25px 70px -10px rgba(0, 0, 0, 0.85)",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 20px",
            minWidth: "340px",
            borderBottom: "1px solid var(--gov-border, rgba(255, 255, 255, 0.1))",
            background: "var(--gov-surface2, rgba(255, 255, 255, 0.03))",
            gap: "16px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
            {/* Interactive Zoom Mode Toggle Button */}
            <button
              type="button"
              onClick={() => setIsZoomActive((prev) => !prev)}
              style={{
                width: "34px",
                height: "34px",
                borderRadius: "10px",
                background: isZoomActive
                  ? "linear-gradient(135deg, rgba(0, 204, 255, 0.3), rgba(2, 132, 199, 0.4))"
                  : "rgba(0, 204, 255, 0.15)",
                border: isZoomActive
                  ? "1.5px solid #00ccff"
                  : "1px solid rgba(0, 204, 255, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: isZoomActive ? "#38bdf8" : "#00ccff",
                cursor: "pointer",
                flexShrink: 0,
                transition: "all 0.15s ease",
              }}
              title={isZoomActive ? "Click to deactivate Loupe Zoom" : "Click to activate Interactive Loupe Zoom"}
            >
              {isZoomActive ? <ZoomOut className="w-4 h-4" /> : <ZoomIn className="w-4 h-4" />}
            </button>

            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: "14px",
                  fontWeight: 700,
                  color: "var(--gov-text, #fff)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <span>{title}</span>
                {isZoomActive && (
                  <span
                    style={{
                      fontSize: "10px",
                      padding: "2px 7px",
                      borderRadius: "999px",
                      background: "rgba(0, 204, 255, 0.2)",
                      border: "1px solid rgba(0, 204, 255, 0.4)",
                      color: "#38bdf8",
                      fontWeight: 700,
                    }}
                  >
                    Loupe 2.8x Active
                  </span>
                )}
              </div>
              {subtitle && (
                <div
                  style={{
                    fontSize: "11px",
                    color: "var(--gov-text-muted, #94a3b8)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {subtitle}
                </div>
              )}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
            <a
              href={imageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn--ghost"
              style={{
                padding: "6px 12px",
                fontSize: "12px",
                display: "flex",
                alignItems: "center",
                gap: "5px",
                textDecoration: "none",
                borderRadius: "8px",
              }}
              title="Open full image in original resolution"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Original</span>
            </a>

            <button
              onClick={onClose}
              className="btn btn--ghost flex items-center justify-center"
              style={{
                width: "32px",
                height: "32px",
                padding: 0,
                borderRadius: "8px",
                color: "var(--gov-text-muted, #94a3b8)",
              }}
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Container - Placed neatly within popup with padding & rounded frame */}
        <div
          style={{
            padding: "16px",
            background: "rgba(0, 0, 0, 0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* Framed Image Canvas */}
          <div
            ref={imageContainerRef}
            onClick={handleImageClick}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{
              position: "relative",
              borderRadius: "14px",
              overflow: "hidden",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              background: "#000",
              boxShadow: "0 10px 30px rgba(0, 0, 0, 0.5)",
              cursor: isZoomActive ? "crosshair" : "zoom-in",
              userSelect: "none",
            }}
          >
            <Image
              src={imageUrl}
              alt={title}
              width={naturalSize?.width || 800}
              height={naturalSize?.height || 600}
              unoptimized
              priority
              onLoad={(e) => {
                const img = e.currentTarget;
                if (img.naturalWidth && img.naturalHeight) {
                  setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
                }
              }}
              style={{
                width: "auto",
                height: "auto",
                maxWidth: "84vw",
                maxHeight: "calc(82vh - 85px)",
                objectFit: "contain",
                display: "block",
                borderRadius: "14px",
              }}
            />

            {/* Interactive Circular Magnifying Loupe Zoom */}
            {isZoomActive && loupe.visible && (
              <div
                style={{
                  position: "absolute",
                  left: `${loupe.x - LOUPE_SIZE / 2}px`,
                  top: `${loupe.y - LOUPE_SIZE / 2}px`,
                  width: `${LOUPE_SIZE}px`,
                  height: `${LOUPE_SIZE}px`,
                  borderRadius: "50%",
                  border: "2.5px solid #00ccff",
                  boxShadow:
                    "0 0 0 3px rgba(0, 204, 255, 0.3), 0 16px 36px rgba(0, 0, 0, 0.85), inset 0 0 16px rgba(0, 204, 255, 0.25)",
                  backgroundImage: `url(${imageUrl})`,
                  backgroundPosition: `${loupe.relX}% ${loupe.relY}%`,
                  backgroundSize: `${ZOOM_LEVEL * 100}%`,
                  backgroundRepeat: "no-repeat",
                  pointerEvents: "none",
                  zIndex: 20,
                  transform: "scale(1.02)",
                  transition: "transform 0.05s ease-out",
                }}
              >
                {/* Center crosshair dot */}
                <div
                  style={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    background: "rgba(0, 204, 255, 0.8)",
                    border: "1px solid #fff",
                  }}
                />
              </div>
            )}

            {/* Click-to-zoom hint overlay when not in zoom mode */}
            {!isZoomActive && (
              <div
                style={{
                  position: "absolute",
                  bottom: "10px",
                  right: "10px",
                  background: "rgba(15, 23, 42, 0.8)",
                  backdropFilter: "blur(6px)",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  borderRadius: "8px",
                  padding: "4px 10px",
                  fontSize: "11px",
                  color: "#94a3b8",
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  pointerEvents: "none",
                }}
              >
                <ZoomIn className="w-3 h-3 text-sky-400" />
                <span>Click image to activate Loupe Zoom</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
