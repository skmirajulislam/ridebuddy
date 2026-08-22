"use client";

import React, { useMemo, useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import Header from "../_components/Header";
import { useHazards } from "../_hooks/useHazards";
import {
  BarChart3,
  TrendingDown,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Download,
  FileSpreadsheet,
  Globe,
  FileCode,
  ShieldCheck,
  MapPin,
  ExternalLink,
  Layers,
  User,
  Search,
  ArrowUpDown,
  Filter,
  Eye,
  CheckCircle,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { toast } from "sonner";
import type { Hazard } from "../_services/api";
import ImageLightboxModal from "../_components/ImageLightboxModal";

// Spatial clustering distance helper (~450m radius threshold)
function distanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371008.8;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

interface HazardCluster {
  id: string;
  lat: number;
  lng: number;
  totalHazards: number;
  activeHazards: number;
  resolvedHazards: number;
  dominantType: string;
  maxSeverity: number;
  hazards: Hazard[];
}

export default function AnalyticsPage() {
  const { data: hazards = [], isLoading, error } = useHazards();
  const [timeRange, setTimeRange] = useState<"all" | "30d" | "7d">("all");
  const [activeTab, setActiveTab] = useState<"reports" | "clusters">("reports");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"critical" | "id_asc" | "newest" | "oldest">("critical");
  const [lightboxImage, setLightboxImage] = useState<{ url: string; title: string; subtitle: string } | null>(null);

  // Drag-to-scroll functionality for high volume data records
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const isMouseDownRef = useRef(false);
  const startYRef = useRef(0);
  const scrollTopRef = useRef(0);
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!tableContainerRef.current) return;
    // Don't drag if clicking interactive buttons/links
    if ((e.target as HTMLElement).closest("button, a, input, select")) return;

    isMouseDownRef.current = true;
    startYRef.current = e.pageY - tableContainerRef.current.offsetTop;
    scrollTopRef.current = tableContainerRef.current.scrollTop;
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isMouseDownRef.current || !tableContainerRef.current) return;
    e.preventDefault();
    const y = e.pageY - tableContainerRef.current.offsetTop;
    const walk = (y - startYRef.current) * 1.5; // Drag scroll multiplier
    tableContainerRef.current.scrollTop = scrollTopRef.current - walk;
  };

  const handleMouseUpOrLeave = () => {
    isMouseDownRef.current = false;
    setIsDragging(false);
  };

  // Filter hazards genuinely by selected time period
  const periodHazards = useMemo(() => {
    if (timeRange === "all") return hazards;
    const cutoff = Date.now() - (timeRange === "7d" ? 7 : 30) * 24 * 3600 * 1000;
    return hazards.filter((h) => new Date(h.created_at).getTime() >= cutoff);
  }, [hazards, timeRange]);

  // Search and sort hazards based on critical condition (High -> Medium -> Low)
  const filteredHazards = useMemo(() => {
    let list = periodHazards;
    if (searchQuery.trim()) {
      const searchTerms = searchQuery
        .toLowerCase()
        .trim()
        .split(/\s+/)
        .filter(Boolean);

      list = list.filter((h) => {
        const severityStr =
          h.severity === 3
            ? "high l3 level 3 critical 24h"
            : h.severity === 2
            ? "medium l2 level 2 72h"
            : "low l1 level 1 standard 7d";

        const formattedDate = format(new Date(h.created_at), "dd MMM yyyy HH:mm").toLowerCase();

        const searchableText = [
          `#${h.id}`,
          `${h.id}`,
          `hazard #${h.id}`,
          `hazard ${h.id}`,
          h.reporter_name || "citizen reporter",
          h.reporter_handle || "@citizen",
          h.user_id ? `uid #${h.user_id}` : "",
          h.user_id ? `uid ${h.user_id}` : "",
          h.user_id ? `uid:${h.user_id}` : "",
          h.user_id ? `#${h.user_id}` : "",
          h.user_id ? `${h.user_id}` : "",
          h.type ? h.type.replace(/_/g, " ") : "",
          h.status ? h.status.replace(/_/g, " ") : "",
          severityStr,
          `severity ${h.severity}`,
          `level ${h.severity}`,
          `${h.lat}`,
          `${h.lng}`,
          `${h.lat.toFixed(5)}`,
          `${h.lng.toFixed(5)}`,
          `${h.lat.toFixed(4)}, ${h.lng.toFixed(4)}`,
          formattedDate,
        ]
          .join(" ")
          .toLowerCase();

        // Every typed keyword term must match in the searchable text (AND match)
        return searchTerms.every((term) => searchableText.includes(term));
      });
    }

    return [...list].sort((a, b) => {
      if (sortBy === "critical") {
        // High severity (3) first, then medium (2), then low (1)
        if (b.severity !== a.severity) return b.severity - a.severity;
        // If same severity, active before resolved
        if (a.status !== b.status) return a.status === "active" ? -1 : 1;
        // Then newest date
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      if (sortBy === "id_asc") return a.id - b.id;
      if (sortBy === "newest") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortBy === "oldest") return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      return 0;
    });
  }, [periodHazards, searchQuery, sortBy]);

  // Compute genuine performance metrics from actual database records
  const metrics = useMemo(() => {
    const total = periodHazards.length;
    const resolved = periodHazards.filter((h) => h.status === "resolved");
    const active = periodHazards.filter((h) => h.status === "active");
    const inProgress = periodHazards.filter((h) => h.status === "in_progress");

    // Mean Time To Repair (MTTR) calculation
    let totalRepairTimeMs = 0;
    let repairCount = 0;
    let slaMetCount = 0;

    resolved.forEach((h) => {
      const createdTime = new Date(h.created_at).getTime();
      const resolvedTime = h.resolved_at ? new Date(h.resolved_at).getTime() : Date.now();
      const durationMs = resolvedTime - createdTime;

      if (durationMs > 0) {
        totalRepairTimeMs += durationMs;
        repairCount++;

        const slaAllowedMs = (h.severity === 3 ? 24 : h.severity === 2 ? 72 : 168) * 3600 * 1000;
        if (durationMs <= slaAllowedMs) {
          slaMetCount++;
        }
      }
    });

    const mttrHours = repairCount > 0 ? (totalRepairTimeMs / repairCount / (3600 * 1000)).toFixed(1) : "0.0";
    const slaRate = repairCount > 0 ? Math.round((slaMetCount / repairCount) * 100) : (total > 0 ? 100 : 0);
    const resolutionRate = total > 0 ? Math.round((resolved.length / total) * 100) : 0;

    // Breakdown by type
    const typeCounts: Record<string, number> = {};
    periodHazards.forEach((h) => {
      const t = (h.type || "hazard").replace(/_/g, " ").toLowerCase();
      typeCounts[t] = (typeCounts[t] || 0) + 1;
    });

    // Breakdown by severity
    const sevCounts = { high: 0, medium: 0, low: 0 };
    periodHazards.forEach((h) => {
      if (h.severity === 3) sevCounts.high++;
      else if (h.severity === 2) sevCounts.medium++;
      else sevCounts.low++;
    });

    return {
      total,
      resolved: resolved.length,
      active: active.length,
      inProgress: inProgress.length,
      repairCount,
      mttrHours,
      slaRate,
      resolutionRate,
      typeCounts,
      sevCounts,
    };
  }, [periodHazards]);

  // Dynamically cluster genuine hazard records by spatial proximity
  const dynamicHotspots = useMemo(() => {
    if (filteredHazards.length === 0) return [];

    const clusters: HazardCluster[] = [];
    const CLUSTER_RADIUS_METERS = 450; // 450 meters proximity radius

    filteredHazards.forEach((h) => {
      if (!h.lat || !h.lng || isNaN(h.lat) || isNaN(h.lng)) return;

      let assignedCluster = clusters.find(
        (c) => distanceMeters(c.lat, c.lng, h.lat, h.lng) <= CLUSTER_RADIUS_METERS
      );

      if (assignedCluster) {
        assignedCluster.hazards.push(h);
        assignedCluster.totalHazards++;
        if (h.status === "active") assignedCluster.activeHazards++;
        if (h.status === "resolved") assignedCluster.resolvedHazards++;
        if (h.severity > assignedCluster.maxSeverity) {
          assignedCluster.maxSeverity = h.severity;
        }
      } else {
        clusters.push({
          id: `cluster-${clusters.length + 1}`,
          lat: h.lat,
          lng: h.lng,
          totalHazards: 1,
          activeHazards: h.status === "active" ? 1 : 0,
          resolvedHazards: h.status === "resolved" ? 1 : 0,
          dominantType: h.type || "pothole",
          maxSeverity: h.severity || 1,
          hazards: [h],
        });
      }
    });

    clusters.forEach((c) => {
      const typeFreq: Record<string, number> = {};
      c.hazards.forEach((h) => {
        const t = (h.type || "pothole").replace(/_/g, " ");
        typeFreq[t] = (typeFreq[t] || 0) + 1;
      });
      let maxCount = 0;
      let dominant = "Pothole";
      Object.entries(typeFreq).forEach(([t, count]) => {
        if (count > maxCount) {
          maxCount = count;
          dominant = t;
        }
      });
      c.dominantType = dominant.charAt(0).toUpperCase() + dominant.slice(1);
    });

    clusters.sort((a, b) => b.activeHazards - a.activeHazards || b.totalHazards - a.totalHazards);
    return clusters.slice(0, 10);
  }, [filteredHazards]);

  // Export handlers
  const exportCSV = () => {
    if (periodHazards.length === 0) {
      toast.info("No hazards to export");
      return;
    }

    const headers = [
      "Hazard ID",
      "Type",
      "Severity Level",
      "Status",
      "Latitude",
      "Longitude",
      "Reporter Name",
      "Reporter Handle",
      "Reporter User UID",
      "Reported At",
      "Resolved At",
      "Confidence Score",
      "Image URL",
    ];

    const rows = periodHazards.map((h) => [
      h.id,
      `"${h.type}"`,
      h.severity,
      h.status,
      h.lat,
      h.lng,
      `"${h.reporter_name || "Citizen Reporter"}"`,
      `"${h.reporter_handle || "@citizen"}"`,
      h.user_id || "",
      `"${h.created_at}"`,
      h.resolved_at ? `"${h.resolved_at}"` : "",
      h.confidence != null ? h.confidence : "",
      h.image_url ? `"${h.image_url}"` : "",
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `RideBuddy_GovOps_Hazards_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV export downloaded successfully!");
  };

  const exportGeoJSON = () => {
    if (periodHazards.length === 0) {
      toast.info("No hazards to export");
      return;
    }

    const geojson = {
      type: "FeatureCollection",
      features: periodHazards.map((h) => ({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [h.lng, h.lat],
        },
        properties: {
          id: h.id,
          type: h.type,
          severity: h.severity,
          status: h.status,
          reporter_name: h.reporter_name,
          reporter_handle: h.reporter_handle,
          user_id: h.user_id,
          created_at: h.created_at,
          resolved_at: h.resolved_at,
          confidence: h.confidence,
        },
      })),
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(geojson, null, 2));
    const link = document.createElement("a");
    link.setAttribute("href", dataStr);
    link.setAttribute("download", `RideBuddy_Hazards_GIS_${new Date().toISOString().slice(0, 10)}.geojson`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("GeoJSON spatial data downloaded successfully!");
  };

  const exportJSON = () => {
    if (periodHazards.length === 0) {
      toast.info("No hazards to export");
      return;
    }

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(periodHazards, null, 2));
    const link = document.createElement("a");
    link.setAttribute("href", dataStr);
    link.setAttribute("download", `RideBuddy_Audit_Dump_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("JSON audit dump downloaded successfully!");
  };

  return (
    <div className="gov-body-wrapper">
      <Header
        title="Municipal Analytics & Safety Reports"
        subtitle="Track Mean Time to Repair (MTTR), SLA compliance benchmarks, and citizen audit reports"
      />

      <div className="gov-content">
        {/* Filter Bar & Export Toolbar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "12px",
            marginBottom: "24px",
          }}
        >
          {/* Time Range Selector */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--gov-text-muted)" }}>Period:</span>
            {(["all", "30d", "7d"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                className={`btn ${timeRange === r ? "btn--primary" : "btn--ghost"}`}
                style={{ padding: "5px 12px", fontSize: "12px", borderRadius: "999px" }}
              >
                {r === "all" ? "All Time" : r === "30d" ? "Past 30 Days" : "Past 7 Days"}
              </button>
            ))}
          </div>

          {/* Export Action Buttons */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              onClick={exportCSV}
              className="btn btn--ghost flex items-center gap-1.5"
              style={{ fontSize: "12px", padding: "6px 12px" }}
              title="Export all rows to CSV (Excel compatible)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={exportGeoJSON}
              className="btn btn--ghost flex items-center gap-1.5"
              style={{ fontSize: "12px", padding: "6px 12px" }}
              title="Export GIS Spatial Layers (ArcGIS/QGIS GeoJSON)"
            >
              <Globe className="w-3.5 h-3.5 text-sky-500" />
              <span>Export GeoJSON</span>
            </button>

            <button
              onClick={exportJSON}
              className="btn btn--ghost flex items-center gap-1.5"
              style={{ fontSize: "12px", padding: "6px 12px" }}
              title="Export raw JSON structured data"
            >
              <FileCode className="w-3.5 h-3.5 text-amber-500" />
              <span>JSON Dump</span>
            </button>
          </div>
        </div>

        {/* Top 4 Performance Metric Cards */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-card__icon" style={{ background: "rgba(0, 204, 255, 0.15)", color: "#00ccff" }}>
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="stat-card__value">
                {metrics.repairCount > 0 ? `${metrics.mttrHours}h` : "N/A"}
              </div>
              <div className="stat-card__label">
                Mean Time to Repair {metrics.repairCount > 0 ? `(${metrics.repairCount} resolved)` : "(0 completed)"}
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-card__icon" style={{ background: "rgba(34, 197, 94, 0.15)", color: "#22c55e" }}>
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="stat-card__value">{metrics.slaRate}%</div>
              <div className="stat-card__label">SLA Compliance Rate</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-card__icon" style={{ background: "rgba(245, 158, 11, 0.15)", color: "#f59e0b" }}>
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="stat-card__value">{metrics.resolutionRate}%</div>
              <div className="stat-card__label">
                Resolution Rate ({metrics.resolved}/{metrics.total})
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-card__icon" style={{ background: "rgba(239, 68, 68, 0.15)", color: "#ef4444" }}>
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="stat-card__value">{metrics.active}</div>
              <div className="stat-card__label">Active Unresolved Hazards</div>
            </div>
          </div>
        </div>

        {/* Charts & Breakdown Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "24px" }}>
          {/* Hazard Type Breakdown */}
          <div className="data-table-card" style={{ padding: "20px" }}>
            <h3 style={{ fontSize: "15px", fontWeight: 700, margin: "0 0 16px 0", color: "var(--gov-text)" }}>
              Hazard Types Distribution
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {Object.entries(metrics.typeCounts).map(([type, count]) => {
                const pct = metrics.total > 0 ? Math.round((count / metrics.total) * 100) : 0;
                return (
                  <div key={type}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "4px" }}>
                      <span style={{ textTransform: "capitalize", fontWeight: 600, color: "var(--gov-text)" }}>{type}</span>
                      <span style={{ color: "var(--gov-text-muted)" }}>{count} ({pct}%)</span>
                    </div>
                    <div style={{ width: "100%", height: "8px", background: "var(--gov-surface2)", borderRadius: "999px", overflow: "hidden" }}>
                      <div
                        style={{
                          width: `${pct}%`,
                          height: "100%",
                          background: "linear-gradient(90deg, #00ccff, #3b82f6)",
                          borderRadius: "999px",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
              {Object.keys(metrics.typeCounts).length === 0 && (
                <div style={{ color: "var(--gov-text-muted)", fontSize: "13px", textAlign: "center", padding: "20px 0" }}>
                  No hazard records found for selected period
                </div>
              )}
            </div>
          </div>

          {/* Severity & Resolution Ratio */}
          <div className="data-table-card" style={{ padding: "20px" }}>
            <h3 style={{ fontSize: "15px", fontWeight: 700, margin: "0 0 16px 0", color: "var(--gov-text)" }}>
              Severity Level Breakdown
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "4px" }}>
                  <span style={{ color: "#ef4444", fontWeight: 700 }}>High Severity (Level 3 - Immediate 24h SLA)</span>
                  <span style={{ fontWeight: 600 }}>{metrics.sevCounts.high}</span>
                </div>
                <div style={{ width: "100%", height: "8px", background: "var(--gov-surface2)", borderRadius: "999px", overflow: "hidden" }}>
                  <div
                    style={{
                      width: `${metrics.total > 0 ? (metrics.sevCounts.high / metrics.total) * 100 : 0}%`,
                      height: "100%",
                      background: "#ef4444",
                    }}
                  />
                </div>
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "4px" }}>
                  <span style={{ color: "#f59e0b", fontWeight: 700 }}>Medium Severity (Level 2 - 72h SLA)</span>
                  <span style={{ fontWeight: 600 }}>{metrics.sevCounts.medium}</span>
                </div>
                <div style={{ width: "100%", height: "8px", background: "var(--gov-surface2)", borderRadius: "999px", overflow: "hidden" }}>
                  <div
                    style={{
                      width: `${metrics.total > 0 ? (metrics.sevCounts.medium / metrics.total) * 100 : 0}%`,
                      height: "100%",
                      background: "#f59e0b",
                    }}
                  />
                </div>
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "4px" }}>
                  <span style={{ color: "#22c55e", fontWeight: 700 }}>Low Severity (Level 1 - 7d SLA)</span>
                  <span style={{ fontWeight: 600 }}>{metrics.sevCounts.low}</span>
                </div>
                <div style={{ width: "100%", height: "8px", background: "var(--gov-surface2)", borderRadius: "999px", overflow: "hidden" }}>
                  <div
                    style={{
                      width: `${metrics.total > 0 ? (metrics.sevCounts.low / metrics.total) * 100 : 0}%`,
                      height: "100%",
                      background: "#22c55e",
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Interactive Reports Table with Drag-to-Scroll & Reporter Person Details */}
        <div className="data-table-card">
          <div
            className="data-table-card__header"
            style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}
          >
            {/* View Switcher Tabs */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <button
                onClick={() => setActiveTab("reports")}
                className={`btn ${activeTab === "reports" ? "btn--primary" : "btn--ghost"}`}
                style={{ padding: "6px 14px", fontSize: "12px", borderRadius: "8px" }}
              >
                <span>Citizen Reports ({filteredHazards.length})</span>
              </button>

              <button
                onClick={() => setActiveTab("clusters")}
                className={`btn ${activeTab === "clusters" ? "btn--primary" : "btn--ghost"}`}
                style={{ padding: "6px 14px", fontSize: "12px", borderRadius: "8px" }}
              >
                <span>Spatial Hotspot Clusters ({dynamicHotspots.length})</span>
              </button>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              {/* Sort Order Selector */}
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--gov-text-muted)" }}>Sort:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  style={{
                    padding: "5px 10px",
                    fontSize: "12px",
                    borderRadius: "8px",
                    background: "var(--gov-surface2)",
                    border: "1px solid var(--gov-border-strong)",
                    color: "var(--gov-text)",
                    outline: "none",
                    cursor: "pointer",
                  }}
                >
                  <option value="critical">🚨 Critical Condition </option>
                  <option value="id_asc">Hazard ID </option>
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                </select>
              </div>

              {/* Real-time Search Input */}
              <div style={{ position: "relative", minWidth: "240px" }}>
                <Search
                  className="w-3.5 h-3.5 text-slate-400"
                  style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)" }}
                />
                <input
                  type="text"
                  placeholder="Search reporter, UID, type, coord..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "6px 12px 6px 32px",
                    fontSize: "12px",
                    borderRadius: "8px",
                    background: "var(--gov-surface2)",
                    border: "1px solid var(--gov-border-strong)",
                    color: "var(--gov-text)",
                    outline: "none",
                  }}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    style={{
                      position: "absolute",
                      right: "8px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      color: "var(--gov-text-muted)",
                      fontSize: "11px",
                      cursor: "pointer",
                    }}
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Smooth Drag-to-Scroll Table Container */}
          <div
            ref={tableContainerRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUpOrLeave}
            onMouseLeave={handleMouseUpOrLeave}
            style={{
              maxHeight: "560px",
              overflowY: "auto",
              overflowX: "auto",
              cursor: isDragging ? "grabbing" : "default",
              userSelect: isDragging ? "none" : "auto",
              transition: "box-shadow 0.15s ease",
            }}
          >
            {activeTab === "reports" ? (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Hazard ID</th>
                    <th>Reported By (Person Details)</th>
                    <th>Issue Type</th>
                    <th>GPS Coordinates</th>
                    <th>
                      <button
                        onClick={() => setSortBy((prev) => (prev === "critical" ? "id_asc" : "critical"))}
                        style={{
                          background: "none",
                          border: "none",
                          color: "inherit",
                          font: "inherit",
                          fontWeight: 700,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                          padding: 0,
                        }}
                        title="Click to sort by Critical Severity Condition"
                      >
                        <span>Critical Condition (Severity)</span>
                        <span style={{ fontSize: "11px", color: sortBy === "critical" ? "#ef4444" : "#94a3b8" }}>
                          {sortBy === "critical" ? "🚨 Active" : "⇅"}
                        </span>
                      </button>
                    </th>
                    <th>Status</th>
                    <th>Reported Date</th>
                    <th>Evidence & Map</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHazards.map((hazard) => {
                    const reporterName = hazard.reporter_name || "Citizen Reporter";
                    const reporterHandle = hazard.reporter_handle || "@citizen";
                    const uidDisplay = hazard.user_id ? `#${hazard.user_id}` : "UID: #Guest";
                    const initials = reporterName
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2) || "CR";

                    const sevLabel = hazard.severity === 3 ? "High (L3)" : hazard.severity === 2 ? "Medium (L2)" : "Low (L1)";
                    const sevBadgeClass = hazard.severity === 3 ? "badge--high" : hazard.severity === 2 ? "badge--medium" : "badge--low";
                    const statusBadgeClass =
                      hazard.status === "active" ? "badge--high" : hazard.status === "in_progress" ? "badge--medium" : "badge--resolved";

                    return (
                      <tr key={hazard.id} style={{ transition: "background 0.15s ease" }}>
                        <td style={{ fontWeight: 700, color: "#00ccff" }}>#{hazard.id}</td>

                        {/* Reported Person Details Column */}
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            {hazard.reporter_avatar ? (
                              <div
                                style={{
                                  position: "relative",
                                  width: "32px",
                                  height: "32px",
                                  borderRadius: "50%",
                                  overflow: "hidden",
                                  flexShrink: 0,
                                  border: "1.5px solid var(--gov-border-strong)",
                                }}
                              >
                                <Image
                                  src={hazard.reporter_avatar}
                                  alt={reporterName}
                                  fill
                                  unoptimized
                                  style={{ objectFit: "cover" }}
                                />
                              </div>
                            ) : (
                              <div
                                style={{
                                  width: "32px",
                                  height: "32px",
                                  borderRadius: "50%",
                                  background: "linear-gradient(135deg, #00ccff, #3b82f6)",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  color: "#fff",
                                  fontSize: "12px",
                                  fontWeight: 700,
                                  flexShrink: 0,
                                }}
                              >
                                {initials}
                              </div>
                            )}

                            <div>
                              <div style={{ fontWeight: 600, color: "var(--gov-text)", fontSize: "13px" }}>
                                {reporterName}
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "var(--gov-text-muted)" }}>
                                <span>{reporterHandle}</span>
                                <span>•</span>
                                <span
                                  style={{
                                    fontFamily: "monospace",
                                    background: "var(--gov-surface2)",
                                    padding: "1px 5px",
                                    borderRadius: "4px",
                                    border: "1px solid var(--gov-border)",
                                    color: "#00ccff",
                                    fontWeight: 600,
                                  }}
                                >
                                  UID {uidDisplay}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Issue Type */}
                        <td style={{ textTransform: "capitalize", fontWeight: 600 }}>
                          {hazard.type.replace(/_/g, " ")}
                        </td>

                        {/* GPS Coordinates */}
                        <td>
                          <div style={{ fontFamily: "monospace", fontSize: "12px", color: "var(--gov-text)" }}>
                            {hazard.lat.toFixed(5)}, {hazard.lng.toFixed(5)}
                          </div>
                        </td>

                        {/* Severity */}
                        <td>
                          <span className={`badge ${sevBadgeClass}`}>{sevLabel}</span>
                        </td>

                        {/* Status */}
                        <td>
                          <span className={`badge ${statusBadgeClass}`} style={{ textTransform: "capitalize" }}>
                            {hazard.status.replace("_", " ")}
                          </span>
                        </td>

                        {/* Reported Date */}
                        <td>
                          <div style={{ fontSize: "12px", color: "var(--gov-text)" }}>
                            {format(new Date(hazard.created_at), "dd MMM yyyy, HH:mm")}
                          </div>
                          <div style={{ fontSize: "11px", color: "var(--gov-text-muted)" }}>
                            {formatDistanceToNow(new Date(hazard.created_at), { addSuffix: true })}
                          </div>
                        </td>

                        {/* Evidence & Map Action */}
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            {hazard.image_url ? (
                              <button
                                onClick={() =>
                                  setLightboxImage({
                                    url: hazard.image_url!,
                                    title: `${hazard.type.toUpperCase()} Evidence • Hazard #${hazard.id}`,
                                    subtitle: `Reported by ${reporterName} (${uidDisplay}) at [${hazard.lat.toFixed(5)}, ${hazard.lng.toFixed(5)}]`,
                                  })
                                }
                                className="btn btn--ghost flex items-center gap-1"
                                style={{ padding: "4px 8px", fontSize: "11px" }}
                                title="View full photo evidence"
                              >
                                <Eye className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Photo</span>
                              </button>
                            ) : (
                              <span style={{ fontSize: "11px", color: "var(--gov-text-muted)", padding: "4px 8px" }}>
                                No Image
                              </span>
                            )}

                            <Link
                              href={`/gov/map?id=${hazard.id}&lat=${hazard.lat}&lng=${hazard.lng}`}
                              className="btn btn--ghost flex items-center gap-1"
                              style={{ padding: "4px 8px", fontSize: "11px" }}
                              title="Go to exact location on Map View"
                            >
                              <MapPin className="w-3.5 h-3.5 text-sky-400" />
                              <span>Map</span>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredHazards.length === 0 && (
                    <tr>
                      <td colSpan={8} style={{ textAlign: "center", padding: "32px", color: "var(--gov-text-muted)" }}>
                        {searchQuery
                          ? `No hazard reports match "${searchQuery}".`
                          : "No hazard reports recorded in the database yet."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Cluster Coordinates / Zone</th>
                    <th>Dominant Hazard</th>
                    <th>Active Reports</th>
                    <th>Total Reports</th>
                    <th>Priority Level</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {dynamicHotspots.map((cluster, idx) => {
                    const priorityLabel =
                      cluster.maxSeverity === 3 ? "Critical" : cluster.maxSeverity === 2 ? "High" : "Standard";
                    const priorityBadgeClass =
                      cluster.maxSeverity === 3 ? "badge--high" : cluster.maxSeverity === 2 ? "badge--medium" : "badge--low";

                    return (
                      <tr key={cluster.id}>
                        <td style={{ fontWeight: 700, color: "#00ccff" }}>#{idx + 1}</td>
                        <td>
                          <div style={{ fontWeight: 600, color: "var(--gov-text)", display: "flex", alignItems: "center", gap: "5px" }}>
                            <MapPin className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" />
                            <span>Zone [{cluster.lat.toFixed(5)}, {cluster.lng.toFixed(5)}]</span>
                          </div>
                          <div style={{ fontSize: "11px", color: "var(--gov-text-muted)" }}>
                            {cluster.hazards.length} site {cluster.hazards.length === 1 ? "report" : "reports"} clustered
                          </div>
                        </td>
                        <td style={{ fontWeight: 600 }}>{cluster.dominantType}</td>
                        <td>
                          <span className={`badge ${cluster.activeHazards > 0 ? "badge--high" : "badge--active"}`}>
                            {cluster.activeHazards} Active
                          </span>
                        </td>
                        <td>
                          <span style={{ fontWeight: 600, color: "var(--gov-text)" }}>
                            {cluster.totalHazards} total
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${priorityBadgeClass}`}>{priorityLabel}</span>
                        </td>
                        <td>
                          <Link
                            href={`/gov/map?lat=${cluster.lat}&lng=${cluster.lng}`}
                            className="btn btn--ghost flex items-center gap-1"
                            style={{ padding: "4px 8px", fontSize: "11px" }}
                            title="View Cluster on Map"
                          >
                            <ExternalLink className="w-3 h-3 text-sky-400" />
                            <span>View Map</span>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}

                  {dynamicHotspots.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ textAlign: "center", padding: "24px", color: "var(--gov-text-muted)" }}>
                        No hazard clusters recorded for the selected period.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Full Photo Evidence Lightbox Modal */}
      {lightboxImage && (
        <ImageLightboxModal
          isOpen={!!lightboxImage}
          onClose={() => setLightboxImage(null)}
          imageUrl={lightboxImage.url}
          title={lightboxImage.title}
          subtitle={lightboxImage.subtitle}
        />
      )}
    </div>
  );
}
