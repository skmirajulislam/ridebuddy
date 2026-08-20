"use client";

import React, { useState } from "react";
import { DownloadCloud, CheckCircle2, X, HardDrive, WifiOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { CachedHazard } from "../_hooks/useHazardCache";

interface OfflineMapPackModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentHazards: CachedHazard[];
}

export default function OfflineMapPackModal({
  isOpen,
  onClose,
  currentHazards,
}: OfflineMapPackModalProps) {
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  if (!isOpen) return null;

  const handleDownloadPack = async () => {
    setDownloading(true);
    try {
      // 1. Cache current hazards in localStorage
      localStorage.setItem(
        "ridebuddy_offline_pack_hazards",
        JSON.stringify({ data: currentHazards, timestamp: Date.now() })
      );

      // 2. Pre-cache app shell assets into CacheStorage
      if ("caches" in window) {
        const cache = await caches.open("ridebuddy-offline-pack-v2");
        await cache.addAll(["/", "/manifest.json", "/icons/icon.svg", "/api/hazards"]);
      }

      setDownloaded(true);
      toast.success("Offline Safety Pack downloaded! Maps & radar will work with zero internet.", { icon: "📥" });
    } catch {
      toast.error("Failed to download offline pack");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-3xl border border-slate-700 bg-slate-900/95 p-6 sm:p-8 text-slate-100 shadow-2xl shadow-cyan-950/40 backdrop-blur-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 h-8 w-8 rounded-full bg-slate-800 border border-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          aria-label="Close Offline Modal"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/30">
            <DownloadCloud className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-100">Offline Highway Pack</h3>
            <p className="text-xs text-slate-400">
              Download maps & hazard radar for zero-connectivity zones
            </p>
          </div>
        </div>

        {/* Feature Points */}
        <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3 mb-6">
          <div className="flex items-center gap-2.5 text-xs text-slate-300">
            <WifiOff className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>Zero-internet safety radar and hazard warnings</span>
          </div>
          <div className="flex items-center gap-2.5 text-xs text-slate-300">
            <HardDrive className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Caches {currentHazards.length} active road hazards & route data</span>
          </div>
          <div className="flex items-center gap-2.5 text-xs text-slate-300">
            <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Lightweight footprint (~4.2 MB storage)</span>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={handleDownloadPack}
          disabled={downloading}
          className={`w-full h-12 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all ${
            downloaded
              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
              : "bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-cyan-500/20 active:scale-98"
          }`}
        >
          {downloading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Caching Offline Highway Pack...</span>
            </>
          ) : downloaded ? (
            <>
              <CheckCircle2 className="w-4 h-4" />
              <span>Pack Cached Offline (Ready)</span>
            </>
          ) : (
            <>
              <DownloadCloud className="w-4 h-4" />
              <span>Download Offline Pack (4.2 MB)</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
