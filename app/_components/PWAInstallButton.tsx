"use client";

import React, { useState, useEffect } from "react";
import { Download, X, Share, PlusSquare, Smartphone, CheckCircle } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function PWAInstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Check if already running as standalone PWA
    const isStandaloneMode =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;

    if (isStandaloneMode) {
      setIsStandalone(true);
      return;
    }

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    if (isIosDevice) {
      setIsInstallable(true);
    }

    // Standard Chromium beforeinstallprompt handler
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === "accepted") {
        setInstalled(true);
        setIsInstallable(false);
      }
      setDeferredPrompt(null);
    } else if (isIOS) {
      setShowIOSModal(true);
    }
  };

  if (isStandalone || !isInstallable || installed) {
    return null;
  }

  return (
    <>
      {/* Install Button Trigger */}
      <button
        onClick={handleInstallClick}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-violet-900/30 border border-violet-400/30 transition-all transform active:scale-95"
        title="Install RideBuddy App to your device"
        aria-label="Install RideBuddy PWA App"
      >
        <Download className="w-3.5 h-3.5 animate-bounce" />
        <span>Install App</span>
      </button>

      {/* iOS Instructions Modal */}
      {showIOSModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-violet-500/40 p-5 text-slate-100 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-violet-600/30 border border-violet-500/50 flex items-center justify-center text-violet-400">
                  <Smartphone className="h-4 w-4" />
                </div>
                <h3 className="font-bold text-sm text-white">Install RideBuddy on iOS</h3>
              </div>
              <button
                onClick={() => setShowIOSModal(false)}
                className="h-7 w-7 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              Install RideBuddy on your home screen for full-screen navigation, instant offline hazard maps, and voice co-pilot:
            </p>

            <ol className="space-y-3 text-xs text-slate-200">
              <li className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-800/80 border border-slate-700">
                <div className="h-6 w-6 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center flex-shrink-0 font-bold">1</div>
                <span className="flex items-center gap-1.5">
                  Tap the <Share className="h-3.5 w-3.5 text-sky-400 inline" /> <strong>Share</strong> button in Safari toolbar
                </span>
              </li>

              <li className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-800/80 border border-slate-700">
                <div className="h-6 w-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0 font-bold">2</div>
                <span className="flex items-center gap-1.5">
                  Scroll down and tap <PlusSquare className="h-3.5 w-3.5 text-emerald-400 inline" /> <strong>&ldquo;Add to Home Screen&rdquo;</strong>
                </span>
              </li>

              <li className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-800/80 border border-slate-700">
                <div className="h-6 w-6 rounded-lg bg-violet-500/20 text-violet-400 flex items-center justify-center flex-shrink-0 font-bold">3</div>
                <span className="flex items-center gap-1.5">
                  Tap <strong>&ldquo;Add&rdquo;</strong> at the top right to install
                </span>
              </li>
            </ol>

            <button
              onClick={() => setShowIOSModal(false)}
              className="w-full mt-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold transition-colors"
            >
              Got it!
            </button>
          </div>
        </div>
      )}
    </>
  );
}
