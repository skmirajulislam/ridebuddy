"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    // In development mode, unregister any existing service workers and clear caches to prevent stale bundle caching
    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          registration.unregister();
          console.log("[RideBuddy] Unregistered dev service worker:", registration.scope);
        }
      });
      if ("caches" in window) {
        caches.keys().then((names) => {
          for (const name of names) {
            caches.delete(name);
          }
        });
      }
      return;
    }

    // In production, register the service worker
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
  }, []);

  return null;
}
