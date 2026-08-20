"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { authService } from "../_services/auth";
import { useAuthContext } from "../_store/auth.store";

const NAV = [
  { href: "/gov", icon: "▦", label: "Dashboard" },
  { href: "/gov/hazards", icon: "⚠️", label: "Hazards" },
  { href: "/gov/map", icon: "🗺️", label: "Map View" },
];

export default function Sidebar() {
  const { user, setUser } = useAuthContext();
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    authService.logout();
    setUser(null);
    router.replace("/gov/login");
  };

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((s) => s[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "OF";

  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <div className="sidebar__brand-icon">🏛️</div>
        <div>
          <div className="sidebar__brand-name">GovOps Portal</div>
          <div className="sidebar__brand-sub">Road Hazard Command</div>
        </div>
      </div>

      <nav className="sidebar__nav">
        {NAV.map(({ href, icon, label }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`sidebar__link${isActive ? " sidebar__link--active" : ""}`}
            >
              <span className="sidebar__link-icon">{icon}</span>
              {label}
            </Link>
          );
        })}

        <div style={{ marginTop: "16px", paddingTop: "12px", borderTop: "1px solid var(--gov-border)" }}>
          <Link
            href="/"
            className="sidebar__link"
            style={{ color: "var(--gov-primary)", fontWeight: 600 }}
          >
            <span className="sidebar__link-icon">🛣️</span>
            Citizen Map
          </Link>
        </div>
      </nav>

      <div className="sidebar__footer">
        <div className="sidebar__user">
          <div className="sidebar__avatar">{initials}</div>
          <div style={{ overflow: "hidden" }}>
            <div className="sidebar__user-name">{user?.name || "Official"}</div>
            <div className="sidebar__user-role">Government Official</div>
          </div>
        </div>
        <button className="sidebar__logout" onClick={handleLogout}>
          <span>⬅</span> Log out
        </button>
      </div>
    </aside>
  );
}
