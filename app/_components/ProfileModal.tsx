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
  Tag,
  Copy,
  CheckCheck,
  Loader2,
  Plus,
} from "lucide-react";
import { useAuth } from "../_hooks/useAuth";

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
}

export default function ProfileModal({ isOpen, onClose, onProfileUpdated }: ProfileModalProps) {
  const { user, idToken, updateUser } = useAuth();
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

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch latest profile from API when modal opens
  useEffect(() => {
    if (!isOpen || !idToken) return;

    const fetchProfile = async () => {
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

          // Sync into auth state
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

    fetchProfile();
    setIsEditing(false);
    setAvatarFile(null);
    setAvatarPreview(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, idToken]);

  if (!isOpen) return null;

  const handleCopyHandle = () => {
    if (!handle) return;
    navigator.clipboard.writeText(`@${handle}`);
    setCopied(true);
    toast.success(`Copied @${handle} to clipboard!`);
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
    toast.loading("Saving profile...", { id: "profile-save" });

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

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save profile");
      }

      setAvatarUrl(finalAvatarUrl);
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

      toast.success("Profile updated successfully!", { id: "profile-save" });
      if (onProfileUpdated) onProfileUpdated();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error saving profile";
      toast.error(msg, { id: "profile-save" });
    } finally {
      setSaving(false);
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
        backgroundColor: "rgba(3, 7, 18, 0.82)",
        backdropFilter: "blur(12px)",
      }}
      onClick={onClose}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: "520px",
          maxHeight: "90vh",
          overflowY: "auto",
          background: "linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.92))",
          border: "1px solid rgba(56, 189, 248, 0.25)",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 35px rgba(56, 189, 248, 0.15)",
          borderRadius: "24px",
          padding: "28px",
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
          }}
          aria-label="Close Profile"
        >
          <X className="w-5 h-5" />
        </button>

        {loading ? (
          <div style={{ padding: "60px 0", textAlign: "center" }}>
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#38bdf8", margin: "0 auto 12px" }} />
            <p style={{ color: "#94a3b8", fontSize: "14px" }}>Loading profile details...</p>
          </div>
        ) : (
          <div>
            {/* Header / Avatar Area */}
            <div style={{ display: "flex", alignItems: "center", gap: "20px", marginBottom: "24px" }}>
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
                    {name || user?.name || "RideBuddy Contributor"}
                  </h2>
                  {user?.role === "official" && (
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: "600",
                        padding: "2px 8px",
                        borderRadius: "999px",
                        background: "rgba(0, 204, 255, 0.2)",
                        color: "#00ccff",
                        border: "1px solid rgba(0, 204, 255, 0.4)",
                      }}
                    >
                      Official
                    </span>
                  )}
                </div>

                {/* Unique Handle with copy badge */}
                <div
                  onClick={handleCopyHandle}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    marginTop: "6px",
                    background: "rgba(56, 189, 248, 0.12)",
                    border: "1px solid rgba(56, 189, 248, 0.28)",
                    padding: "3px 10px",
                    borderRadius: "999px",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                  title="Click to copy unique system ID"
                >
                  <span style={{ fontSize: "13px", fontWeight: "600", color: "#38bdf8", fontFamily: "monospace" }}>
                    @{handle || `rider_${user?.id || "00"}`}
                  </span>
                  {copied ? (
                    <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3 h-3 text-sky-400 opacity-75" />
                  )}
                </div>

                <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "4px" }}>
                  {user?.email}
                </div>
              </div>
            </div>

            {/* Quick Stats Bar */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "12px",
                marginBottom: "24px",
                padding: "12px 16px",
                background: "rgba(15, 23, 42, 0.6)",
                borderRadius: "16px",
                border: "1px solid rgba(255, 255, 255, 0.08)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "10px",
                    background: "rgba(56, 189, 248, 0.15)",
                    color: "#38bdf8",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <div style={{ fontSize: "16px", fontWeight: "700", color: "#f8fafc" }}>{totalReports}</div>
                  <div style={{ fontSize: "11px", color: "#94a3b8" }}>Hazards Shared</div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "10px",
                    background: "rgba(245, 158, 11, 0.15)",
                    color: "#f59e0b",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Award className="w-4 h-4" />
                </div>
                <div>
                  <div style={{ fontSize: "13px", fontWeight: "600", color: "#f59e0b" }}>
                    {achievementTitle || "Explorer"}
                  </div>
                  <div style={{ fontSize: "11px", color: "#94a3b8" }}>Community Rank</div>
                </div>
              </div>
            </div>

            {/* Content Sections */}
            {!isEditing ? (
              /* VIEW MODE */
              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                {/* Bio / Description */}
                <div>
                  <label style={{ fontSize: "12px", fontWeight: "600", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    About & Description
                  </label>
                  <div
                    style={{
                      marginTop: "6px",
                      padding: "14px 16px",
                      background: "rgba(15, 23, 42, 0.4)",
                      borderRadius: "14px",
                      border: "1px solid rgba(255, 255, 255, 0.06)",
                      fontSize: "14px",
                      lineHeight: "1.6",
                      color: bio ? "#e2e8f0" : "#64748b",
                      fontStyle: bio ? "normal" : "italic",
                    }}
                  >
                    {bio || "No description added yet. Add a short bio to let other riders know what you ride or enjoy!"}
                  </div>
                </div>

                {/* Hobbies / Interests */}
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
                    <Tag className="w-3.5 h-3.5 text-sky-400" />
                    <label style={{ fontSize: "12px", fontWeight: "600", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      Hobbies & Riding Interests
                    </label>
                  </div>
                  {hobbies.length > 0 ? (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                      {hobbies.map((h, i) => (
                        <span
                          key={i}
                          style={{
                            padding: "6px 12px",
                            borderRadius: "999px",
                            background: "rgba(14, 165, 233, 0.15)",
                            border: "1px solid rgba(14, 165, 233, 0.3)",
                            color: "#38bdf8",
                            fontSize: "12px",
                            fontWeight: "500",
                          }}
                        >
                          {h}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p style={{ fontSize: "13px", color: "#64748b", fontStyle: "italic", margin: 0 }}>
                      No hobbies specified. Click Edit Profile to add hobbies!
                    </p>
                  )}
                </div>

                {/* Edit Button */}
                <button
                  onClick={() => setIsEditing(true)}
                  style={{
                    width: "100%",
                    marginTop: "8px",
                    padding: "12px",
                    borderRadius: "14px",
                    background: "linear-gradient(135deg, #0284c7, #2563eb)",
                    color: "#ffffff",
                    fontWeight: "600",
                    fontSize: "14px",
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    boxShadow: "0 4px 14px rgba(2, 132, 199, 0.35)",
                    transition: "all 0.2s",
                  }}
                >
                  <Edit3 className="w-4 h-4" />
                  <span>Edit Profile & Hobbies</span>
                </button>
              </div>
            ) : (
              /* EDIT MODE */
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {/* Name */}
                <div>
                  <label style={{ fontSize: "12px", fontWeight: "600", color: "#94a3b8", display: "block", marginBottom: "6px" }}>
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: "12px",
                      background: "rgba(15, 23, 42, 0.7)",
                      border: "1px solid rgba(56, 189, 248, 0.3)",
                      color: "#f8fafc",
                      fontSize: "14px",
                      outline: "none",
                    }}
                  />
                </div>

                {/* Bio */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                    <label style={{ fontSize: "12px", fontWeight: "600", color: "#94a3b8" }}>
                      Bio / Description
                    </label>
                    <span style={{ fontSize: "11px", color: bio.length > 450 ? "#ef4444" : "#64748b" }}>
                      {bio.length}/500
                    </span>
                  </div>
                  <textarea
                    rows={3}
                    maxLength={500}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell other riders about yourself, your riding style, or your vehicle..."
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: "12px",
                      background: "rgba(15, 23, 42, 0.7)",
                      border: "1px solid rgba(56, 189, 248, 0.3)",
                      color: "#f8fafc",
                      fontSize: "14px",
                      outline: "none",
                      resize: "none",
                    }}
                  />
                </div>

                {/* Hobbies Editor */}
                <div>
                  <label style={{ fontSize: "12px", fontWeight: "600", color: "#94a3b8", display: "block", marginBottom: "6px" }}>
                    Hobbies & Interests ({hobbies.length}/10)
                  </label>

                  {/* Active Hobbies Pills */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "10px" }}>
                    {hobbies.map((h, i) => (
                      <span
                        key={i}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          padding: "5px 10px",
                          borderRadius: "999px",
                          background: "rgba(14, 165, 233, 0.2)",
                          border: "1px solid rgba(14, 165, 233, 0.4)",
                          color: "#38bdf8",
                          fontSize: "12px",
                        }}
                      >
                        <span>{h}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveHobby(h)}
                          style={{
                            background: "transparent",
                            border: "none",
                            color: "#94a3b8",
                            cursor: "pointer",
                            padding: 0,
                            display: "flex",
                            alignItems: "center",
                          }}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>

                  {/* Add Custom Hobby Input */}
                  <div style={{ display: "flex", gap: "8px", marginBottom: "10px" }}>
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
                      placeholder="Add custom hobby (press Enter)..."
                      style={{
                        flex: 1,
                        padding: "8px 12px",
                        borderRadius: "10px",
                        background: "rgba(15, 23, 42, 0.7)",
                        border: "1px solid rgba(255, 255, 255, 0.12)",
                        color: "#f8fafc",
                        fontSize: "13px",
                        outline: "none",
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
                        fontWeight: "600",
                        fontSize: "13px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add</span>
                    </button>
                  </div>

                  {/* Preset Suggestions */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {PRESET_HOBBIES.filter((p) => !hobbies.includes(p)).map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleAddHobby(preset)}
                        style={{
                          fontSize: "11px",
                          padding: "4px 8px",
                          borderRadius: "6px",
                          background: "rgba(255, 255, 255, 0.05)",
                          border: "1px solid rgba(255, 255, 255, 0.1)",
                          color: "#94a3b8",
                          cursor: "pointer",
                          transition: "all 0.15s",
                        }}
                      >
                        + {preset}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Save & Cancel Action Buttons */}
                <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      setAvatarFile(null);
                      setAvatarPreview(null);
                    }}
                    disabled={saving}
                    style={{
                      flex: 1,
                      padding: "12px",
                      borderRadius: "12px",
                      background: "rgba(255, 255, 255, 0.08)",
                      border: "1px solid rgba(255, 255, 255, 0.15)",
                      color: "#e2e8f0",
                      fontSize: "14px",
                      fontWeight: "600",
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
                      color: "#ffffff",
                      fontSize: "14px",
                      fontWeight: "600",
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
                        <span>Save Changes</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
