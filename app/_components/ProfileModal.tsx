"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import {
  Camera,
  X,
  Edit3,
  Check,
  Award,
  MapPin,
  Copy,
  CheckCheck,
  Loader2,
  Plus,
  Trash2,
  AlertTriangle,
  Droplets,
  Car,
  Ban,
  Boxes,
  Activity,
  Construction,
  Lightbulb,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Lock,
  Landmark,
  ExternalLink,
  Mail,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "../_hooks/useAuth";
import type { HazardRecord } from "@/lib/services/hazard.service";

const HAZARD_TYPE_ICONS: Record<string, { icon: LucideIcon; color: string; label: string }> = {
  pothole: { icon: AlertTriangle, color: "#f59e0b", label: "Pothole" },
  flood: { icon: Droplets, color: "#3b82f6", label: "Flood" },
  accident: { icon: Car, color: "#ef4444", label: "Accident" },
  roadblock: { icon: Ban, color: "#f43f5e", label: "Road Block" },
  debris: { icon: Boxes, color: "#a855f7", label: "Debris" },
  "speed braker": { icon: Activity, color: "#eab308", label: "Unmarked Bump" },
  patch: { icon: Construction, color: "#f97316", label: "Patchwork" },
  "low light": { icon: Lightbulb, color: "#eab308", label: "Low Light" },
  others: { icon: MapPin, color: "#6366f1", label: "Other Hazard" },
};

const OFFICIAL_SPECIALIZATION_TAGS = [
  "Road Hazard Inspector",
  "Traffic Operations & Flow",
  "PWD & Highway Engineering",
  "Emergency Dispatch & SOS",
  "Pothole Repair & Patchwork",
  "Monsoon Drainage & Floods",
  "Structural Safety & Bridges",
  "Road Safety Auditor",
  "Highway Patrol & Enforcement",
  "Citizen Grievance Response",
  "Traffic Signal & Lighting",
  "Urban Infrastructure",
];

const CITIZEN_HOBBIES_TAGS = [
  "Highway Cruising",
  "Night Riding",
  "Motorcycling",
  "Cycling",
  "Daily Commuter",
  "Off-roading",
  "Road Trips",
  "Photography",
  "Tech & Maps",
  "Safety Advocate",
];

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProfileUpdated?: () => void;
  initialTab?: "profile" | "contributions";
  readOnly?: boolean;
  readOnlyReason?: string;
}

export default function ProfileModal({
  isOpen,
  onClose,
  onProfileUpdated,
  initialTab = "profile",
  readOnly = false,
  readOnlyReason,
}: ProfileModalProps) {
  const { user, idToken, updateUser } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<"profile" | "contributions">(initialTab);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  // Form fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("user");
  const [handle, setHandle] = useState("");
  const [city, setCity] = useState("Kolkata");
  const [karma, setKarma] = useState(50);
  const [badges, setBadges] = useState<string[]>(["Community Pioneer"]);
  const [emergencyContact, setEmergencyContact] = useState("");
  const [bio, setBio] = useState("");
  const [hobbies, setHobbies] = useState<string[]>([]);
  const [newHobbyInput, setNewHobbyInput] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [totalReports, setTotalReports] = useState(0);
  const [achievementTitle, setAchievementTitle] = useState<string | null>(null);

  // Contributions state
  const [contributions, setContributions] = useState<HazardRecord[]>([]);
  const [loadingContributions, setLoadingContributions] = useState(false);
  const [deletingHazardId, setDeletingHazardId] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const getEffectiveToken = (): string | null => {
    if (idToken) return idToken;
    if ((user as unknown as { token?: string })?.token) return (user as unknown as { token: string }).token;
    if (typeof window !== "undefined") {
      return (
        localStorage.getItem("gov_token") ||
        sessionStorage.getItem("gov_token") ||
        localStorage.getItem("rb_token") ||
        sessionStorage.getItem("rb_token")
      );
    }
    return null;
  };

  // Fetch latest profile from API when modal opens
  const fetchProfile = async () => {
    const token = getEffectiveToken();
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch("/api/user/profile", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setName(data.name || "");
        setEmail(data.email || user?.email || "");
        setRole(data.role || user?.role || "user");
        setHandle(data.handle || "");
        setCity(data.city || "Kolkata");
        setKarma(Number(data.karma || 50));
        setBadges(Array.isArray(data.badges) ? data.badges : ["Community Pioneer"]);
        setEmergencyContact(data.emergency_contact || "");
        setBio(data.bio || "");
        setHobbies(Array.isArray(data.hobbies) ? data.hobbies : []);
        setAvatarUrl(data.avatar_url || null);
        setTotalReports(data.total_reports || 0);
        setAchievementTitle(data.achievement?.title || "Community Explorer");

        updateUser({
          name: data.name,
          email: data.email,
          role: data.role,
          handle: data.handle,
          city: data.city,
          karma: data.karma,
          badges: data.badges,
          emergency_contact: data.emergency_contact,
          avatar_url: data.avatar_url,
          bio: data.bio,
          hobbies: data.hobbies,
        });
      }
    } catch (err) {
      console.error("Failed to load profile:", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch user contributions
  const fetchContributions = async () => {
    const token = getEffectiveToken();
    if (!token) return;
    setLoadingContributions(true);
    try {
      const res = await fetch("/api/user/hazards", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setContributions(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Failed to load contributions:", err);
    } finally {
      setLoadingContributions(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    setActiveTab(initialTab);

    // Initial pre-fill from user or stored session
    let storedUser: {
      name?: string;
      email?: string;
      role?: string;
      handle?: string;
      city?: string;
      avatar_url?: string | null;
      bio?: string | null;
      hobbies?: string[];
      emergency_contact?: string | null;
    } | null = user;

    if (!storedUser && typeof window !== "undefined") {
      try {
        const raw =
          localStorage.getItem("gov_user") ||
          sessionStorage.getItem("gov_user") ||
          localStorage.getItem("rb_user") ||
          sessionStorage.getItem("rb_user");
        if (raw) storedUser = JSON.parse(raw);
      } catch {}
    }

    if (storedUser) {
      if (storedUser.name) setName(storedUser.name);
      if (storedUser.email) setEmail(storedUser.email);
      if (storedUser.role) setRole(storedUser.role);
      if (storedUser.handle) setHandle(storedUser.handle);
      if (storedUser.city) setCity(storedUser.city);
      if (storedUser.avatar_url) setAvatarUrl(storedUser.avatar_url);
      if (storedUser.bio) setBio(storedUser.bio);
      if (Array.isArray(storedUser.hobbies)) setHobbies(storedUser.hobbies);
      if (storedUser.emergency_contact) setEmergencyContact(storedUser.emergency_contact);
    }

    fetchProfile();
    fetchContributions();
    setIsEditing(false);
    setAvatarFile(null);
    setAvatarPreview(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!mounted || !isOpen) return null;

  const handleCopyHandle = () => {
    if (!handle) return;
    navigator.clipboard.writeText(`@${handle.replace(/^@/, "")}`);
    setCopied(true);
    toast.success(`Copied @${handle.replace(/^@/, "")} to clipboard!`);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddHobby = (hobbyToAdd: string) => {
    const clean = hobbyToAdd.trim();
    if (!clean) return;
    if (hobbies.includes(clean)) {
      toast.info("Hobby already added");
      return;
    }
    if (hobbies.length >= 10) {
      toast.error("Maximum 10 hobbies allowed");
      return;
    }
    setHobbies([...hobbies, clean]);
    setNewHobbyInput("");
  };

  const handleRemoveHobby = (hobbyToRemove: string) => {
    setHobbies(hobbies.filter((h) => h !== hobbyToRemove));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be smaller than 5MB");
      return;
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleSaveProfile = async () => {
    const token = getEffectiveToken();
    if (!token) {
      toast.error("Please sign in to update profile");
      return;
    }

    setSaving(true);
    toast.loading("Saving profile...", { id: "profile-save" });

    try {
      let finalAvatarUrl = avatarUrl;

      // Upload new avatar if selected
      if (avatarFile) {
        toast.loading("Uploading avatar to cloud storage...", { id: "profile-save" });
        const imageBase64 = await fileToBase64(avatarFile);
        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            imageBase64,
            fileName: avatarFile.name || "avatar.jpg",
            mimeType: avatarFile.type || "image/jpeg",
          }),
        });

        if (!uploadRes.ok) {
          const errData = await uploadRes.json().catch(() => ({}));
          throw new Error(errData.error || "Failed to upload photo to cloud storage");
        }

        const upJson = await uploadRes.json();
        if (!upJson.url) {
          throw new Error("No photo URL returned from cloud storage");
        }
        finalAvatarUrl = upJson.url;
      }

      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          city: city.trim(),
          emergency_contact: emergencyContact.trim(),
          avatar_url: finalAvatarUrl,
          bio: bio.trim(),
          hobbies,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to update profile");
      }

      const data = await res.json();
      setName(data.name || name);
      setEmail(data.email || email);
      setRole(data.role || role);
      setHandle(data.handle || handle);
      setCity(data.city || "Kolkata");
      setKarma(Number(data.karma || 50));
      setBadges(Array.isArray(data.badges) ? data.badges : ["Community Pioneer"]);
      setEmergencyContact(data.emergency_contact || "");
      setBio(data.bio || "");
      setHobbies(data.hobbies || []);
      setAvatarUrl(data.avatar_url);
      setAvatarFile(null);
      setAvatarPreview(null);
      setIsEditing(false);

      updateUser({
        name: data.name || name,
        email: data.email || email,
        role: data.role || role,
        handle: data.handle || handle,
        city: data.city,
        karma: data.karma,
        badges: data.badges,
        emergency_contact: data.emergency_contact,
        avatar_url: data.avatar_url,
        bio: data.bio,
        hobbies: data.hobbies,
      });

      toast.success("Profile and photo updated!", { id: "profile-save" });
      if (onProfileUpdated) onProfileUpdated();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error saving profile";
      toast.error(msg, { id: "profile-save" });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteHazard = async (hazardId: number) => {
    const token = getEffectiveToken();
    if (!token) return;
    const confirmDelete = window.confirm("Are you sure you want to delete this hazard report? Its photo and record will be permanently removed.");
    if (!confirmDelete) return;

    setDeletingHazardId(hazardId);
    toast.loading("Removing report & deleting image from storage...", { id: "delete-hazard" });

    try {
      const res = await fetch(`/api/hazards/${hazardId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to delete hazard report");
      }

      // Remove from local list
      setContributions((prev) => prev.filter((h) => h.id !== hazardId));
      setTotalReports((prev) => Math.max(0, prev - 1));

      toast.success("Hazard report & image safely removed!", { id: "delete-hazard" });
      if (onProfileUpdated) onProfileUpdated();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete report", { id: "delete-hazard" });
    } finally {
      setDeletingHazardId(null);
    }
  };

  const displayAvatar = avatarPreview || avatarUrl;
  const isOfficialUser = role === "official" || user?.role === "official";

  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        backgroundColor: "rgba(3, 7, 18, 0.85)",
        backdropFilter: "blur(14px)",
      }}
      onClick={onClose}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: "580px",
          maxHeight: "92vh",
          overflowY: "auto",
          background: "linear-gradient(135deg, rgba(15, 23, 42, 0.96), rgba(30, 41, 59, 0.94))",
          border: isOfficialUser
            ? "1px solid rgba(0, 204, 255, 0.4)"
            : "1px solid rgba(56, 189, 248, 0.25)",
          boxShadow: isOfficialUser
            ? "0 25px 50px -12px rgba(0, 0, 0, 0.85), 0 0 40px rgba(0, 204, 255, 0.2)"
            : "0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 35px rgba(56, 189, 248, 0.15)",
          borderRadius: "24px",
          padding: "24px",
          color: "#f8fafc",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: "20px",
            right: "20px",
            width: "36px",
            height: "36px",
            borderRadius: "50%",
            background: "rgba(255, 255, 255, 0.08)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            color: "#94a3b8",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            transition: "all 0.2s",
            zIndex: 10,
          }}
          aria-label="Close Profile"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Tab Navigation Header */}
        <div style={{ display: "flex", gap: "8px", borderBottom: "1px solid rgba(255, 255, 255, 0.08)", paddingBottom: "16px", marginBottom: "20px" }}>
          <button
            onClick={() => setActiveTab("profile")}
            style={{
              padding: "8px 18px",
              borderRadius: "12px",
              fontWeight: 600,
              fontSize: "14px",
              cursor: "pointer",
              transition: "all 0.2s",
              border: activeTab === "profile" ? "1px solid rgba(56, 189, 248, 0.5)" : "1px solid transparent",
              background: activeTab === "profile" ? "rgba(56, 189, 248, 0.15)" : "transparent",
              color: activeTab === "profile" ? "#38bdf8" : "#94a3b8",
            }}
          >
            {isOfficialUser ? "Official Profile & Bio" : "My Profile & Bio"}
          </button>
          <button
            onClick={() => {
              setActiveTab("contributions");
              fetchContributions();
            }}
            style={{
              padding: "8px 18px",
              borderRadius: "12px",
              fontWeight: 600,
              fontSize: "14px",
              cursor: "pointer",
              transition: "all 0.2s",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              border: activeTab === "contributions" ? "1px solid rgba(56, 189, 248, 0.5)" : "1px solid transparent",
              background: activeTab === "contributions" ? "rgba(56, 189, 248, 0.15)" : "transparent",
              color: activeTab === "contributions" ? "#38bdf8" : "#94a3b8",
            }}
          >
            <span>{isOfficialUser ? "Field Reports" : "My Contributions"}</span>
            <span
              style={{
                fontSize: "11px",
                padding: "2px 8px",
                borderRadius: "999px",
                background: "rgba(56, 189, 248, 0.25)",
                color: "#38bdf8",
                fontWeight: 700,
              }}
            >
              {contributions.length || totalReports}
            </span>
          </button>
        </div>

        {/* Read-Only Notice for Officials on Citizen Map */}
        {isOfficialUser && readOnly && (
          <div
            style={{
              padding: "14px 18px",
              marginBottom: "20px",
              borderRadius: "16px",
              background: "linear-gradient(135deg, rgba(0, 204, 255, 0.12), rgba(15, 23, 42, 0.85))",
              border: "1px solid rgba(0, 204, 255, 0.35)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "14px",
              flexWrap: "wrap",
            }}
          >
            <div style={{ flex: 1, minWidth: "220px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 700, color: "#00ccff", fontSize: "13px" }}>
                <Landmark className="w-4 h-4 text-sky-400" />
                <span>Government Official • View Only on Map</span>
              </div>
              <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#cbd5e1", lineHeight: 1.4 }}>
                {readOnlyReason || "To update your posting city, photo, or department hobbies, please access your profile from the GovOps Dashboard."}
              </p>
            </div>
            <Link
              href="/gov"
              onClick={onClose}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 14px",
                borderRadius: "10px",
                background: "linear-gradient(135deg, #00aaee, #0284c7)",
                color: "#ffffff",
                fontSize: "12px",
                fontWeight: 600,
                textDecoration: "none",
                boxShadow: "0 2px 10px rgba(0, 170, 238, 0.35)",
              }}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Go to GovOps Dashboard</span>
            </Link>
          </div>
        )}

        {loading ? (
          <div style={{ padding: "60px 0", textAlign: "center" }}>
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#38bdf8", margin: "0 auto 12px" }} />
            <p style={{ color: "#94a3b8", fontSize: "14px" }}>Loading profile details...</p>
          </div>
        ) : activeTab === "profile" ? (
          <div>
            {/* Header / Avatar Area */}
            <div style={{ display: "flex", alignItems: "center", gap: "20px", marginBottom: "20px" }}>
              <div style={{ position: "relative" }}>
                <div
                  style={{
                    width: "88px",
                    height: "88px",
                    borderRadius: "50%",
                    overflow: "hidden",
                    border: isOfficialUser ? "3px solid #00ccff" : "3px solid #38bdf8",
                    boxShadow: isOfficialUser
                      ? "0 0 20px rgba(0, 204, 255, 0.4)"
                      : "0 0 20px rgba(56, 189, 248, 0.35)",
                    background: "linear-gradient(135deg, #0284c7, #6366f1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {displayAvatar ? (
                    <Image
                      src={displayAvatar}
                      alt={name || "User Avatar"}
                      width={88}
                      height={88}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      unoptimized
                    />
                  ) : (
                    <span style={{ fontSize: "32px", fontWeight: "bold", color: "#fff" }}>
                      {(name || user?.name || "U")[0]?.toUpperCase()}
                    </span>
                  )}
                </div>

                {isEditing && !readOnly && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      position: "absolute",
                      bottom: "0",
                      right: "0",
                      width: "32px",
                      height: "32px",
                      borderRadius: "50%",
                      background: "#0284c7",
                      border: "2px solid #0f172a",
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.5)",
                    }}
                    title="Upload New Photo"
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  style={{ display: "none" }}
                />
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                  <h2 style={{ fontSize: "22px", fontWeight: "700", margin: 0, color: "#f8fafc" }}>
                    {name || "Driver"}
                  </h2>

                  {/* Official Role Badge */}
                  {isOfficialUser && (
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        background: "rgba(0, 204, 255, 0.15)",
                        border: "1px solid rgba(0, 204, 255, 0.4)",
                        padding: "2px 8px",
                        borderRadius: "999px",
                        fontSize: "11px",
                        fontWeight: 700,
                        color: "#00ccff",
                      }}
                    >
                      <Landmark className="w-3 h-3" />
                      <span>Government Official</span>
                    </div>
                  )}
                </div>

                {/* Copyable Unique Handle */}
                <div
                  onClick={handleCopyHandle}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    marginTop: "6px",
                    background: "rgba(56, 189, 248, 0.12)",
                    border: "1px solid rgba(56, 189, 248, 0.3)",
                    padding: "3px 10px",
                    borderRadius: "999px",
                    cursor: "pointer",
                  }}
                  title="Click to copy unique handle"
                >
                  <span style={{ fontSize: "12px", fontWeight: "600", color: "#38bdf8", fontFamily: "monospace" }}>
                    @{handle.replace(/^@/, "") || `rider_${user?.id}`}
                  </span>
                  {copied ? (
                    <CheckCheck className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <Copy className="w-3 h-3 text-sky-400 opacity-75" />
                  )}
                </div>

                {/* City, Karma, and Achievement Badges */}
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "8px", flexWrap: "wrap" }}>
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      background: "rgba(245, 158, 11, 0.15)",
                      border: "1px solid rgba(245, 158, 11, 0.4)",
                      padding: "2px 8px",
                      borderRadius: "999px",
                    }}
                  >
                    <Award className="w-3.5 h-3.5 text-amber-400" />
                    <span style={{ fontSize: "12px", color: "#f59e0b", fontWeight: "700" }}>
                      {karma} Karma
                    </span>
                  </div>

                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      background: "rgba(16, 185, 129, 0.15)",
                      border: "1px solid rgba(16, 185, 129, 0.4)",
                      padding: "2px 8px",
                      borderRadius: "999px",
                    }}
                  >
                    <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                    <span style={{ fontSize: "12px", color: "#10b981", fontWeight: "600" }}>
                      {city}
                    </span>
                  </div>

                  <span style={{ fontSize: "12px", color: "#94a3b8" }}>
                    • {achievementTitle} ({totalReports} reports)
                  </span>
                </div>
              </div>

              {/* Edit button: only when not editing and not in readOnly mode */}
              {!isEditing && !readOnly && (
                <button
                  onClick={() => setIsEditing(true)}
                  style={{
                    padding: "8px 14px",
                    borderRadius: "10px",
                    background: "rgba(56, 189, 248, 0.12)",
                    border: "1px solid rgba(56, 189, 248, 0.3)",
                    color: "#38bdf8",
                    fontSize: "13px",
                    fontWeight: "600",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    cursor: "pointer",
                  }}
                >
                  <Edit3 className="w-4 h-4" />
                  <span>Edit Profile</span>
                </button>
              )}
            </div>

            {/* Editable or Display Fields */}
            {isEditing && !readOnly ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {/* Non-editable Name & Email with locked indication */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "12px", color: "#94a3b8", marginBottom: "6px", fontWeight: 600 }}>
                      <span>Full Name</span>
                      <span style={{ fontSize: "10px", color: "#64748b", display: "inline-flex", alignItems: "center", gap: "3px" }}>
                        <Lock className="w-3 h-3" /> Locked
                      </span>
                    </label>
                    <input
                      type="text"
                      value={name}
                      disabled
                      readOnly
                      style={{
                        width: "100%",
                        padding: "10px 14px",
                        borderRadius: "12px",
                        background: "rgba(15, 23, 42, 0.4)",
                        border: "1px solid rgba(255, 255, 255, 0.08)",
                        color: "#94a3b8",
                        fontSize: "14px",
                        cursor: "not-allowed",
                      }}
                      title="Name cannot be modified"
                    />
                    <p style={{ margin: "4px 0 0", fontSize: "10px", color: "#64748b" }}>
                      Name cannot be changed
                    </p>
                  </div>

                  <div>
                    <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "12px", color: "#94a3b8", marginBottom: "6px", fontWeight: 600 }}>
                      <span>Email Address</span>
                      <span style={{ fontSize: "10px", color: "#64748b", display: "inline-flex", alignItems: "center", gap: "3px" }}>
                        <Lock className="w-3 h-3" /> Locked
                      </span>
                    </label>
                    <input
                      type="email"
                      value={email || user?.email || ""}
                      disabled
                      readOnly
                      style={{
                        width: "100%",
                        padding: "10px 14px",
                        borderRadius: "12px",
                        background: "rgba(15, 23, 42, 0.4)",
                        border: "1px solid rgba(255, 255, 255, 0.08)",
                        color: "#94a3b8",
                        fontSize: "14px",
                        cursor: "not-allowed",
                      }}
                      title="Email cannot be modified"
                    />
                    <p style={{ margin: "4px 0 0", fontSize: "10px", color: "#64748b" }}>
                      Email cannot be changed
                    </p>
                  </div>
                </div>

                {/* Editable Posting City and SOS/Contact */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", color: "#38bdf8", marginBottom: "6px", fontWeight: 600 }}>
                      {isOfficialUser ? "Posting City / Jurisdiction" : "Primary City / Region"}
                    </label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="e.g. Kolkata, Howrah, Delhi"
                      maxLength={50}
                      style={{
                        width: "100%",
                        padding: "10px 14px",
                        borderRadius: "12px",
                        background: "rgba(15, 23, 42, 0.6)",
                        border: "1px solid rgba(56, 189, 248, 0.35)",
                        color: "#f8fafc",
                        fontSize: "14px",
                        outline: "none",
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "12px", color: "#94a3b8", marginBottom: "6px", fontWeight: 600 }}>
                      {isOfficialUser ? "Official Contact / Dispatch" : "Emergency SOS Contact"}
                    </label>
                    <input
                      type="tel"
                      value={emergencyContact}
                      onChange={(e) => setEmergencyContact(e.target.value)}
                      placeholder="e.g. +91 9876543210"
                      maxLength={20}
                      style={{
                        width: "100%",
                        padding: "10px 14px",
                        borderRadius: "12px",
                        background: "rgba(15, 23, 42, 0.6)",
                        border: "1px solid rgba(255, 255, 255, 0.12)",
                        color: "#f8fafc",
                        fontSize: "14px",
                        outline: "none",
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", color: "#94a3b8", marginBottom: "6px", fontWeight: 600 }}>
                    {isOfficialUser ? "Official Bio / Department Role" : "Bio / Description"}
                  </label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder={
                      isOfficialUser
                        ? "e.g. Traffic Operations & Highway Safety Division. Road hazard inspector..."
                        : "Tell other riders about yourself (e.g. Daily commuter on NH48, motorcycle enthusiast...)"
                    }
                    rows={3}
                    maxLength={500}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: "12px",
                      background: "rgba(15, 23, 42, 0.6)",
                      border: "1px solid rgba(255, 255, 255, 0.12)",
                      color: "#f8fafc",
                      fontSize: "14px",
                      outline: "none",
                      resize: "none",
                    }}
                  />
                  <div style={{ textAlign: "right", fontSize: "11px", color: "#64748b", marginTop: "4px" }}>
                    {bio.length}/500
                  </div>
                </div>

                {/* Hobbies Selector */}
                <div>
                  <label style={{ display: "block", fontSize: "12px", color: "#94a3b8", marginBottom: "8px", fontWeight: 600 }}>
                    {isOfficialUser ? "Department & Specialization Tags" : "Interests & Riding Tags"} ({hobbies.length}/10)
                  </label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "12px" }}>
                    {hobbies.map((h, i) => (
                      <span
                        key={i}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          padding: "5px 12px",
                          borderRadius: "999px",
                          background: "rgba(56, 189, 248, 0.2)",
                          border: "1px solid rgba(56, 189, 248, 0.4)",
                          color: "#38bdf8",
                          fontSize: "12px",
                          fontWeight: 500,
                        }}
                      >
                        <span>{h}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveHobby(h)}
                          style={{
                            background: "transparent",
                            border: "none",
                            color: "#38bdf8",
                            cursor: "pointer",
                            padding: 0,
                            display: "flex",
                          }}
                          title="Remove tag"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>

                  {/* Add Custom Hobby / Tag */}
                  <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
                    <input
                      type="text"
                      value={newHobbyInput}
                      onChange={(e) => setNewHobbyInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddHobby(newHobbyInput);
                        }
                      }}
                      placeholder={isOfficialUser ? "Add department tag / specialization (press Enter)" : "Add interest or tag (press Enter)"}
                      style={{
                        flex: 1,
                        padding: "8px 12px",
                        borderRadius: "10px",
                        background: "rgba(15, 23, 42, 0.6)",
                        border: "1px solid rgba(255, 255, 255, 0.1)",
                        color: "#f8fafc",
                        fontSize: "13px",
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => handleAddHobby(newHobbyInput)}
                      style={{
                        padding: "8px 14px",
                        borderRadius: "10px",
                        background: isOfficialUser ? "rgba(0, 204, 255, 0.2)" : "rgba(56, 189, 248, 0.2)",
                        border: isOfficialUser ? "1px solid rgba(0, 204, 255, 0.4)" : "1px solid rgba(56, 189, 248, 0.4)",
                        color: isOfficialUser ? "#00ccff" : "#38bdf8",
                        fontWeight: 600,
                        fontSize: "13px",
                        cursor: "pointer",
                      }}
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Preset Suggestions (Work-related for officials, rider hobbies for citizens) */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {(isOfficialUser ? OFFICIAL_SPECIALIZATION_TAGS : CITIZEN_HOBBIES_TAGS)
                      .filter((p) => !hobbies.includes(p))
                      .map((preset, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => handleAddHobby(preset)}
                          style={{
                            padding: "4px 10px",
                            borderRadius: "999px",
                            background: isOfficialUser ? "rgba(0, 204, 255, 0.08)" : "rgba(255, 255, 255, 0.05)",
                            border: isOfficialUser ? "1px solid rgba(0, 204, 255, 0.25)" : "1px solid rgba(255, 255, 255, 0.1)",
                            color: isOfficialUser ? "#7dd3fc" : "#94a3b8",
                            fontSize: "11px",
                            cursor: "pointer",
                            transition: "all 0.15s",
                          }}
                        >
                          + {preset}
                        </button>
                      ))}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      setAvatarFile(null);
                      setAvatarPreview(null);
                    }}
                    style={{
                      flex: 1,
                      padding: "12px",
                      borderRadius: "12px",
                      background: "rgba(255, 255, 255, 0.08)",
                      border: "1px solid rgba(255, 255, 255, 0.12)",
                      color: "#94a3b8",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveProfile}
                    disabled={saving}
                    style={{
                      flex: 2,
                      padding: "12px",
                      borderRadius: "12px",
                      background: "linear-gradient(135deg, #0284c7, #2563eb)",
                      border: "none",
                      color: "#fff",
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      boxShadow: "0 4px 14px rgba(2, 132, 199, 0.4)",
                    }}
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Save Profile</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {/* Account Details & Email */}
                <div
                  style={{
                    padding: "14px 18px",
                    background: "rgba(15, 23, 42, 0.6)",
                    borderRadius: "16px",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <Mail className="w-4 h-4 text-sky-400" />
                    <div>
                      <span style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        Official Email
                      </span>
                      <span style={{ fontSize: "13px", color: "#e2e8f0", fontWeight: 500 }}>
                        {email || user?.email || "Not provided"}
                      </span>
                    </div>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <span style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      {isOfficialUser ? "Posting City" : "City"}
                    </span>
                    <span style={{ fontSize: "13px", color: "#38bdf8", fontWeight: 600 }}>
                      {city}
                    </span>
                  </div>
                </div>

                {/* Bio Card */}
                <div
                  style={{
                    padding: "14px 18px",
                    background: "rgba(15, 23, 42, 0.6)",
                    borderRadius: "16px",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                  }}
                >
                  <span style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "6px" }}>
                    {isOfficialUser ? "About Official / Department Role" : "About Rider"}
                  </span>
                  <p style={{ margin: 0, fontSize: "14px", color: bio ? "#cbd5e1" : "#64748b", fontStyle: bio ? "normal" : "italic", lineHeight: "1.5" }}>
                    {bio || (isOfficialUser ? "No official bio added yet." : "No bio added yet. Click Edit to tell others about yourself!")}
                  </p>
                </div>

                {/* Safety Badges & Recognition */}
                <div
                  style={{
                    padding: "14px 18px",
                    background: "rgba(15, 23, 42, 0.6)",
                    borderRadius: "16px",
                    border: "1px solid rgba(245, 158, 11, 0.2)",
                  }}
                >
                  <span style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#f59e0b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>
                    {isOfficialUser ? "Official Accreditations & Badges" : "Safety Achievements & Badges"} ({badges.length})
                  </span>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    {badges.map((b, i) => (
                      <span
                        key={i}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          padding: "4px 12px",
                          borderRadius: "999px",
                          background: "rgba(245, 158, 11, 0.15)",
                          border: "1px solid rgba(245, 158, 11, 0.35)",
                          color: "#fbbf24",
                          fontSize: "12px",
                          fontWeight: 600,
                        }}
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>{b}</span>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Hobbies / Interests */}
                <div
                  style={{
                    padding: "14px 18px",
                    background: "rgba(15, 23, 42, 0.6)",
                    borderRadius: "16px",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                  }}
                >
                  <span style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>
                    {isOfficialUser ? "Department Tags & Specializations" : "Interests & Riding Tags"}
                  </span>
                  {hobbies.length > 0 ? (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                      {hobbies.map((h, i) => (
                        <span
                          key={i}
                          style={{
                            padding: "4px 12px",
                            borderRadius: "999px",
                            background: "rgba(56, 189, 248, 0.15)",
                            border: "1px solid rgba(56, 189, 248, 0.35)",
                            color: "#38bdf8",
                            fontSize: "12px",
                            fontWeight: 500,
                          }}
                        >
                          {h}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p style={{ margin: 0, fontSize: "13px", color: "#64748b", fontStyle: "italic" }}>
                      No interests or tags added yet.
                    </p>
                  )}
                </div>

                {/* Emergency Contact Notice */}
                {emergencyContact && (
                  <div
                    style={{
                      padding: "12px 16px",
                      background: "rgba(239, 68, 68, 0.1)",
                      borderRadius: "14px",
                      border: "1px solid rgba(239, 68, 68, 0.25)",
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                    }}
                  >
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                    <div>
                      <span style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#f87171", textTransform: "uppercase" }}>
                        {isOfficialUser ? "Department Dispatch Contact" : "1-Tap Emergency SOS Contact"}
                      </span>
                      <span style={{ fontSize: "13px", color: "#fca5a5", fontWeight: 600 }}>
                        {emergencyContact}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          /* Tab 2: My Contributions List */
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "between", marginBottom: "14px" }}>
              <p style={{ fontSize: "13px", color: "#94a3b8", margin: 0 }}>
                Road hazards you reported. When resolved by government or removed, images are deleted from storage.
              </p>
            </div>

            {loadingContributions ? (
              <div style={{ padding: "40px 0", textAlign: "center" }}>
                <Loader2 className="w-6 h-6 animate-spin" style={{ color: "#38bdf8", margin: "0 auto 8px" }} />
                <p style={{ color: "#94a3b8", fontSize: "13px" }}>Loading your contributions...</p>
              </div>
            ) : contributions.length === 0 ? (
              <div style={{ padding: "40px 16px", textAlign: "center", background: "rgba(15, 23, 42, 0.4)", borderRadius: "16px", border: "1px dashed rgba(255, 255, 255, 0.1)" }}>
                <ShieldCheck className="w-10 h-10 text-slate-500" style={{ margin: "0 auto 8px" }} />
                <p style={{ fontWeight: 600, color: "#cbd5e1", margin: "0 0 4px" }}>No contributions yet</p>
                <p style={{ fontSize: "12px", color: "#64748b", margin: 0 }}>
                  Report potholes and road hazards while traveling to help keep everyone safe!
                </p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "420px", overflowY: "auto", paddingRight: "4px" }}>
                {contributions.map((hazard) => {
                  const cfg = HAZARD_TYPE_ICONS[hazard.type] || HAZARD_TYPE_ICONS.others;
                  const IconComp = cfg.icon;
                  const isResolved = hazard.status === "resolved";
                  const isDeleting = deletingHazardId === hazard.id;

                  return (
                    <div
                      key={hazard.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        padding: "12px 14px",
                        borderRadius: "14px",
                        background: isResolved ? "rgba(16, 185, 129, 0.08)" : "rgba(15, 23, 42, 0.6)",
                        border: isResolved ? "1px solid rgba(16, 185, 129, 0.25)" : "1px solid rgba(255, 255, 255, 0.08)",
                        transition: "all 0.2s",
                      }}
                    >
                      {/* Image Thumbnail */}
                      {hazard.image_url ? (
                        <div
                          style={{
                            width: "52px",
                            height: "52px",
                            borderRadius: "10px",
                            overflow: "hidden",
                            flexShrink: 0,
                            border: "1px solid rgba(255, 255, 255, 0.1)",
                            position: "relative",
                          }}
                        >
                          <Image
                            src={hazard.image_url}
                            alt={hazard.type}
                            width={52}
                            height={52}
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                            unoptimized
                          />
                        </div>
                      ) : (
                        <div
                          style={{
                            width: "52px",
                            height: "52px",
                            borderRadius: "10px",
                            background: `${cfg.color}18`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: cfg.color,
                            flexShrink: 0,
                          }}
                        >
                          <IconComp className="w-6 h-6" />
                        </div>
                      )}

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                          <span style={{ fontWeight: 700, fontSize: "14px", color: "#f8fafc", textTransform: "capitalize" }}>
                            {cfg.label}
                          </span>

                          {/* Status Badge */}
                          {isResolved ? (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                padding: "2px 8px",
                                borderRadius: "999px",
                                background: "rgba(16, 185, 129, 0.2)",
                                color: "#34d399",
                                fontSize: "10px",
                                fontWeight: 700,
                              }}
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Resolved by Gov</span>
                            </span>
                          ) : hazard.status === "in_progress" ? (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                padding: "2px 8px",
                                borderRadius: "999px",
                                background: "rgba(245, 158, 11, 0.2)",
                                color: "#fbbf24",
                                fontSize: "10px",
                                fontWeight: 700,
                              }}
                            >
                              <Clock className="w-3 h-3" />
                              <span>Under Review</span>
                            </span>
                          ) : (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                padding: "2px 8px",
                                borderRadius: "999px",
                                background: "rgba(56, 189, 248, 0.2)",
                                color: "#38bdf8",
                                fontSize: "10px",
                                fontWeight: 700,
                              }}
                            >
                              <span>Active on Radar</span>
                            </span>
                          )}
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "3px", fontSize: "11px", color: "#94a3b8" }}>
                          <span>{new Date(hazard.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                          <span>•</span>
                          <span style={{ fontFamily: "monospace" }}>{hazard.lat.toFixed(4)}, {hazard.lng.toFixed(4)}</span>
                        </div>
                      </div>

                      {/* Delete Button */}
                      <button
                        onClick={() => handleDeleteHazard(hazard.id)}
                        disabled={isDeleting}
                        style={{
                          padding: "8px",
                          borderRadius: "10px",
                          background: "rgba(239, 68, 68, 0.12)",
                          border: "1px solid rgba(239, 68, 68, 0.3)",
                          color: "#f87171",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          transition: "all 0.15s",
                        }}
                        title="Delete this report and remove from storage"
                      >
                        {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
