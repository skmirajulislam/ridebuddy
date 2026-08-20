"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { uploadFiles } from "@/lib/uploadthing";
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

const PRESET_HOBBIES = [
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
}

export default function ProfileModal({
  isOpen,
  onClose,
  onProfileUpdated,
  initialTab = "profile",
}: ProfileModalProps) {
  const { user, idToken, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState<"profile" | "contributions">(initialTab);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  // Form fields
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
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

  // Fetch latest profile from API when modal opens
  const fetchProfile = async () => {
    if (!idToken) return;
    setLoading(true);
    try {
      const res = await fetch("/api/user/profile", {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setName(data.name || "");
        setHandle(data.handle || "");
        setBio(data.bio || "");
        setHobbies(Array.isArray(data.hobbies) ? data.hobbies : []);
        setAvatarUrl(data.avatar_url || null);
        setTotalReports(data.total_reports || 0);
        setAchievementTitle(data.achievement?.title || "Community Explorer");

        updateUser({
          name: data.name,
          handle: data.handle,
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
    if (!idToken) return;
    setLoadingContributions(true);
    try {
      const res = await fetch("/api/user/hazards", {
        headers: { Authorization: `Bearer ${idToken}` },
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
    if (!isOpen || !idToken) return;
    setActiveTab(initialTab);
    fetchProfile();
    fetchContributions();
    setIsEditing(false);
    setAvatarFile(null);
    setAvatarPreview(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, idToken]);

  if (!isOpen) return null;

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

  const handleSaveProfile = async () => {
    if (!name.trim()) {
      toast.error("Name cannot be empty");
      return;
    }
    if (!idToken) {
      toast.error("Please sign in to update profile");
      return;
    }

    setSaving(true);
    toast.loading("Saving profile & cleaning old storage...", { id: "profile-save" });

    try {
      let finalAvatarUrl = avatarUrl;

      // Upload new avatar if selected
      if (avatarFile) {
        try {
          const uploadRes = await uploadFiles("profileAvatarUploader", {
            files: [avatarFile],
          });
          if (uploadRes && uploadRes.length > 0) {
            finalAvatarUrl = uploadRes[0].url || uploadRes[0].appUrl || null;
          }
        } catch (uploadErr) {
          console.warn("Avatar upload warning:", uploadErr);
        }
      }

      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          name: name.trim(),
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
      setName(data.name);
      setHandle(data.handle);
      setBio(data.bio || "");
      setHobbies(data.hobbies || []);
      setAvatarUrl(data.avatar_url);
      setAvatarFile(null);
      setAvatarPreview(null);
      setIsEditing(false);

      updateUser({
        name: data.name,
        handle: data.handle,
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
    if (!idToken) return;
    const confirmDelete = window.confirm("Are you sure you want to delete this hazard report? Its photo and record will be permanently removed.");
    if (!confirmDelete) return;

    setDeletingHazardId(hazardId);
    toast.loading("Removing report & deleting image from storage...", { id: "delete-hazard" });

    try {
      const res = await fetch(`/api/hazards/${hazardId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${idToken}` },
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

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
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
          border: "1px solid rgba(56, 189, 248, 0.25)",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 35px rgba(56, 189, 248, 0.15)",
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
            My Profile & Bio
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
            <span>My Contributions</span>
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
                    border: "3px solid #38bdf8",
                    boxShadow: "0 0 20px rgba(56, 189, 248, 0.35)",
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

                {isEditing && (
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
                    title="Change Photo"
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

                {/* Achievement Badge */}
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "8px" }}>
                  <Award className="w-4 h-4 text-amber-400" />
                  <span style={{ fontSize: "12px", color: "#f59e0b", fontWeight: "600" }}>
                    {achievementTitle}
                  </span>
                  <span style={{ fontSize: "12px", color: "#64748b" }}>•</span>
                  <span style={{ fontSize: "12px", color: "#94a3b8" }}>
                    {totalReports} contributions
                  </span>
                </div>
              </div>

              {!isEditing && (
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
                  <span>Edit</span>
                </button>
              )}
            </div>

            {/* Editable or Display Fields */}
            {isEditing ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", color: "#94a3b8", marginBottom: "6px", fontWeight: 600 }}>
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    maxLength={50}
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

                <div>
                  <label style={{ display: "block", fontSize: "12px", color: "#94a3b8", marginBottom: "6px", fontWeight: 600 }}>
                    Bio / Description
                  </label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell other riders about yourself (e.g. Daily commuter on NH48, motorcycle enthusiast...)"
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
                    Interests & Riding Tags ({hobbies.length}/10)
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
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>

                  {/* Add Custom Hobby */}
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
                      placeholder="Add custom interest (press Enter)"
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
                        background: "rgba(56, 189, 248, 0.2)",
                        border: "1px solid rgba(56, 189, 248, 0.4)",
                        color: "#38bdf8",
                        fontWeight: 600,
                        fontSize: "13px",
                        cursor: "pointer",
                      }}
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Preset Suggestions */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {PRESET_HOBBIES.filter((p) => !hobbies.includes(p)).map((preset, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleAddHobby(preset)}
                        style={{
                          padding: "4px 10px",
                          borderRadius: "999px",
                          background: "rgba(255, 255, 255, 0.05)",
                          border: "1px solid rgba(255, 255, 255, 0.1)",
                          color: "#94a3b8",
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
                    About Rider
                  </span>
                  <p style={{ margin: 0, fontSize: "14px", color: bio ? "#cbd5e1" : "#64748b", fontStyle: bio ? "normal" : "italic", lineHeight: "1.5" }}>
                    {bio || "No bio added yet. Click Edit to tell others about yourself!"}
                  </p>
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
                    Interests & Badges
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
                      No interests selected yet.
                    </p>
                  )}
                </div>
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
    </div>
  );
}
