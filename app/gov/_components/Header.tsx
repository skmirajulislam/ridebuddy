"use client";

import React from "react";
import { Sun, Moon } from "lucide-react";
import { useGovTheme } from "../_hooks/useGovTheme";

interface HeaderProps {
  title: string;
  subtitle: string;
}

export default function Header({ title, subtitle }: HeaderProps) {
  const { theme, toggleTheme, mounted } = useGovTheme();

  return (
    <header className="gov-header">
      <div>
        <h1 className="gov-header__title">{title}</h1>
        <p className="gov-header__sub">{subtitle}</p>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
        {/* Theme Toggle Button */}
        {mounted && (
          <button
            type="button"
            className="theme-toggle-btn"
            onClick={toggleTheme}
            title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
            aria-label="Toggle theme"
          >
            {theme === "dark" ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span>Light Mode</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-sky-500" />
                <span>Dark Mode</span>
              </>
            )}
          </button>
        )}

        {/* Live Status Indicator */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span
            style={{
              display: "inline-block",
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "#22c55e",
              boxShadow: "0 0 6px #22c55e",
            }}
          />
          <span style={{ fontSize: "12px", color: "var(--gov-text-muted)", fontWeight: 500 }}>
            Live Stream Active
          </span>
        </div>
      </div>
    </header>
  );
}
