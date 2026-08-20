"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  AlertTriangle,
  Map as MapIcon,
  Route,
  Landmark,
  LogOut,
} from "lucide-react";
import { authService } from "../_services/auth";
import { useAuthContext } from "../_store/auth.store";

const NAV = [
  { href: "/gov", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/gov/hazards", icon: AlertTriangle, label: "Hazards" },
  { href: "/gov/map", icon: MapIcon, label: "Map View" },
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
        <div className="sidebar__brand-icon flex items-center justify-center">
          <Landmark className="w-5 h-5 text-sky-400" />
        </div>
        <div>
          <div className="sidebar__brand-name font-bold">GovOps Portal</div>
          <div className="sidebar__brand-sub">Road Hazard Command</div>
        </div>
      </div>

      <nav className="sidebar__nav">
        {NAV.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`sidebar__link${isActive ? " sidebar__link--active" : ""}`}
            >
              <span className="sidebar__link-icon flex items-center justify-center">
                <Icon className="w-4 h-4" />
              </span>
              <span>{label}</span>
            </Link>
          );
        })}

        <div style={{ marginTop: "16px", paddingTop: "12px", borderTop: "1px solid var(--gov-border)" }}>
          <Link
            href="/"
            className="sidebar__link"
            style={{ color: "var(--gov-primary)", fontWeight: 600 }}
          >
            <span className="sidebar__link-icon flex items-center justify-center">
              <Route className="w-4 h-4" />
            </span>
            <span>Citizen Map</span>
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
        <button className="sidebar__logout flex items-center justify-center gap-1.5" onClick={handleLogout}>
          <LogOut className="w-3.5 h-3.5" />
          <span>Log out</span>
        </button>
      </div>
    </aside>
  );
}
