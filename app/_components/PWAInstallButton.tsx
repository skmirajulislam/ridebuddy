"use client";

import React, { useState, useEffect } from "react";
import { Download, X, Share, PlusSquare, Smartphone, Monitor, CheckCircle, Sparkles } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface NavigatorWithStandalone extends Navigator {
  standalone?: boolean;
}

interface PWAInstallButtonProps {
  variant?: "compact" | "hero" | "banner";
  className?: string;
}

export default function PWAInstallButton({ variant = "compact", className = "" }: PWAInstallButtonProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone] = useState(() => {
    if (typeof window === "undefined") return false;
    return (
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as NavigatorWithStandalone).standalone === true
    );
  });
  const [isIOS] = useState(() => {
    if (typeof window === "undefined") return false;
    return /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
  });
  const [isMobileOrTablet] = useState(() => {
    if (typeof window === "undefined") return false;
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isMobileDevice = /iphone|ipad|ipod|android|mobile|tablet|touch/.test(userAgent);
    const isSmallScreen = window.innerWidth < 1024;
    return isMobileDevice || isSmallScreen;
  });
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (isStandalone) return;

    // Standard Chromium beforeinstallprompt handler
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
      setShowGuideModal(false);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, [isStandalone]);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choiceResult = await deferredPrompt.userChoice;
        if (choiceResult.outcome === "accepted") {
          setInstalled(true);
        }
        setDeferredPrompt(null);
      } catch {
        setShowGuideModal(true);
      }
    } else {
      setShowGuideModal(true);
    }
  };

  // If already running standalone, installed, or on a desktop screen, don't show prompt
  if (isStandalone || installed || !isMobileOrTablet) {
    return null;
  }

  return (
    <>
      {/* ── Visual Variants ────────────────────────────────────────── */}
      {variant === "hero" ? (
        <button
          onClick={handleInstallClick}
          className={`w-full sm:w-auto text-base h-13 px-8 rounded-xl font-bold flex items-center justify-center gap-2.5 bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-xl shadow-violet-900/30 border border-violet-400/40 transition-all transform active:scale-95 cursor-pointer ${className}`}
          title="Install RideBuddy App on your phone or desktop"
          aria-label="Install RideBuddy PWA App"
        >
          <Download className="h-5 w-5 animate-bounce" />
          <span>Install RideBuddy App</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/20 uppercase tracking-widest font-extrabold hidden sm:inline-block">
            PWA
          </span>
        </button>
      ) : variant === "banner" ? (
        <div className={`p-4 rounded-2xl bg-gradient-to-r from-violet-950/80 to-indigo-950/80 border border-violet-500/40 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl ${className}`}>
          <div className="flex items-center gap-3 text-left">
            <div className="h-10 w-10 rounded-xl bg-violet-600/30 border border-violet-400/40 flex items-center justify-center text-violet-300 shrink-0">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="font-bold text-sm text-white">Install RideBuddy for Real-Time Offline Navigation</div>
              <div className="text-xs text-slate-300">Fast 1-tap launch, full-screen map, and zero battery drain.</div>
            </div>
          </div>
          <button
            onClick={handleInstallClick}
            className="w-full sm:w-auto px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs shadow-lg shadow-violet-900/40 transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
          >
            <Download className="w-4 h-4 animate-bounce" />
            <span>Install App Now</span>
          </button>
        </div>
      ) : (
        <button
          onClick={handleInstallClick}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-violet-900/30 border border-violet-400/40 transition-all transform active:scale-95 cursor-pointer ${className}`}
          title="Install RideBuddy App to your device"
          aria-label="Install RideBuddy PWA App"
        >
          <Download className="w-3.5 h-3.5 animate-bounce" />
          <span>Install App</span>
        </button>
      )}

      {/* ── Universal PWA Installation Guide Modal ─────────────────── */}
      {showGuideModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-violet-500/50 p-6 text-slate-100 shadow-2xl relative">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-violet-600/30 border border-violet-500/50 flex items-center justify-center text-violet-400">
                  <Smartphone className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-white">Install RideBuddy App</h3>
                  <p className="text-[11px] text-violet-300">Fast 1-Tap Home Screen Launch & Offline Maps</p>
                </div>
              </div>
              <button
                onClick={() => setShowGuideModal(false)}
                className="h-8 w-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {isIOS ? (
              /* iOS Safari Instructions */
              <div className="space-y-3">
                <p className="text-xs text-slate-300 leading-relaxed">
                  To install on your iPhone or iPad:
                </p>
                <div className="space-y-2.5 text-xs text-slate-200">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/90 border border-slate-700">
                    <div className="h-6 w-6 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold shrink-0">1</div>
                    <span>
                      Tap the <Share className="h-3.5 w-3.5 text-sky-400 inline mx-0.5" /> <strong>Share</strong> button in Safari bottom bar
                    </span>
                  </div>

                  <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/90 border border-slate-700">
                    <div className="h-6 w-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold shrink-0">2</div>
                    <span>
                      Scroll down and tap <PlusSquare className="h-3.5 w-3.5 text-emerald-400 inline mx-0.5" /> <strong>&ldquo;Add to Home Screen&rdquo;</strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/90 border border-slate-700">
                    <div className="h-6 w-6 rounded-lg bg-violet-500/20 text-violet-400 flex items-center justify-center font-bold shrink-0">3</div>
                    <span>
                      Tap <strong>&ldquo;Add&rdquo;</strong> at the top right to complete installation
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              /* Android & Desktop Chrome / Edge / Brave Instructions */
              <div className="space-y-3">
                <p className="text-xs text-slate-300 leading-relaxed">
                  Install RideBuddy directly to your home screen or desktop:
                </p>
                <div className="space-y-2.5 text-xs text-slate-200">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/90 border border-slate-700">
                    <div className="h-6 w-6 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold shrink-0">
                      <Monitor className="h-3.5 w-3.5" />
                    </div>
                    <span>
                      <strong>Chrome / Edge / Brave:</strong> Click the <strong>Install App icon (⊕ or ⎋)</strong> on the right side of the address bar.
                    </span>
                  </div>

                  <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/90 border border-slate-700">
                    <div className="h-6 w-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold shrink-0">
                      <Smartphone className="h-3.5 w-3.5" />
                    </div>
                    <span>
                      <strong>Android:</strong> Tap the <strong>three dots (⋮)</strong> menu &rarr; select <strong>&ldquo;Install App&rdquo;</strong> or <strong>&ldquo;Add to Home Screen&rdquo;</strong>.
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-1.5 text-emerald-400">
                <CheckCircle className="h-3.5 w-3.5" />
                <span>Works 100% Offline</span>
              </div>
              <button
                onClick={() => setShowGuideModal(false)}
                className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold transition-colors cursor-pointer"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
