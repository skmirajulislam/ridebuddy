"use client";

import { useState, useCallback } from "react";

export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>(() =>
    typeof Notification !== "undefined" ? Notification.permission : "default"
  );

  const requestPermission = useCallback(async () => {
    if (typeof Notification === "undefined") return "denied" as NotificationPermission;
    const result = await Notification.requestPermission();
    setPermission(result);
    return result;
  }, []);

  const sendNotification = useCallback(
    (title: string, body: string, icon = "/icons/icon.svg") => {
      if (typeof Notification === "undefined" || permission !== "granted") return;
      try {
        new Notification(title, { body, icon });
      } catch {
        // Silently fail (e.g. service worker required in some browsers)
      }
    },
    [permission]
  );

  return { permission, requestPermission, sendNotification };
}
