"use client";

import { useState, useEffect } from "react";

export type GovTheme = "light" | "dark";

export function applyTheme(newTheme: GovTheme) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", newTheme);
  if (newTheme === "dark") {
    document.documentElement.classList.add("theme-dark");
    document.documentElement.classList.remove("theme-light");
  } else {
    document.documentElement.classList.add("theme-light");
    document.documentElement.classList.remove("theme-dark");
  }
}

export function useGovTheme() {
  const [theme, setThemeState] = useState<GovTheme>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("gov_theme") as GovTheme;
      return saved === "dark" || saved === "light" ? saved : "light";
    }
    return "light";
  });
  const [mounted] = useState(() => typeof window !== "undefined");

  useEffect(() => {
    applyTheme(theme);

    const handleThemeChange = (e: Event) => {
      const customEvent = e as CustomEvent<GovTheme>;
      if (customEvent.detail && (customEvent.detail === "light" || customEvent.detail === "dark")) {
        setThemeState(customEvent.detail);
        applyTheme(customEvent.detail);
      }
    };

    window.addEventListener("gov_theme_changed", handleThemeChange);
    return () => window.removeEventListener("gov_theme_changed", handleThemeChange);
  }, [theme]);

  const toggleTheme = () => {
    const nextTheme: GovTheme = theme === "light" ? "dark" : "light";
    setThemeState(nextTheme);
    localStorage.setItem("gov_theme", nextTheme);
    applyTheme(nextTheme);
    window.dispatchEvent(new CustomEvent("gov_theme_changed", { detail: nextTheme }));
  };

  return { theme, toggleTheme, mounted };
}
