"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((reg) => {
            console.log("[RideBuddy] Service Worker registered:", reg.scope);
          })
          .catch((err) => {
            console.warn("[RideBuddy] Service Worker registration failed:", err);
          });
      });
    }
  }, []);

  return null;
}
