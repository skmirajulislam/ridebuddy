"use client";

// app/_components/BottomSheet.tsx
// Enhanced 4-step reporting flow with GPS proximity validation and Gemini AI image verification.

import React, { useState, useRef } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  Droplets,
  Car,
  Ban,
  Boxes,
  Activity,
  Construction,
  Lightbulb,
  MapPin,
  Camera,
  Upload,
  RefreshCw,
  Check,
  CheckCircle2,
  X,
  ArrowLeft,
  ArrowRight,
  ShieldAlert,
  Send,
  type LucideIcon,
} from "lucide-react";

export interface HazardTypeItem {
  value: string;
  label: string;
  icon: LucideIcon;
  color: string;
}

const HAZARD_TYPES: readonly HazardTypeItem[] = [
  { value: "pothole", label: "Pothole", icon: AlertTriangle, color: "#f59e0b" },
  { value: "flood", label: "Flood", icon: Droplets, color: "#3b82f6" },
  { value: "accident", label: "Accident", icon: Car, color: "#ef4444" },
  { value: "roadblock", label: "Road Block", icon: Ban, color: "#f43f5e" },
  { value: "debris", label: "Debris", icon: Boxes, color: "#a855f7" },
  { value: "speed braker", label: "Unmarked Speed Bump", icon: Activity, color: "#eab308" },
  { value: "patch", label: "Road Patchwork", icon: Construction, color: "#f97316" },
  { value: "low light", label: "Low Lighting", icon: Lightbulb, color: "#eab308" },
  { value: "others", label: "Others", icon: MapPin, color: "#6366f1" },
] as const;

const SEVERITY_LEVELS = [
  { value: 1, label: "Low", color: "#eab308" },
  { value: 2, label: "Medium", color: "#f97316" },
  { value: 3, label: "High", color: "#ef4444" },
] as const;

const STEP_LABELS = ["Hazard type", "Capture image", "Confirm location", "Submit"];

function getSafeImageUrl(url: string | null): string | undefined {
  if (!url || typeof url !== "string") return undefined;
  const trimmed = url.trim();
  if (
    trimmed.startsWith("blob:") ||
    trimmed.startsWith("data:image/") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("http://")
  ) {
    return trimmed;
  }
  return undefined;
}

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  userLat: number | null;
  userLng: number | null;
  apiUrl: string;
  onSuccess: () => void;
  idToken?: string | null;
  onRequireAuth?: () => void;
}

// Convert File to base64 string (no data URL prefix)
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip "data:image/jpeg;base64," prefix
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function BottomSheet({
  isOpen,
  onClose,
  userLat,
  userLng,
  apiUrl,
  onSuccess,
  idToken,
  onRequireAuth,
}: BottomSheetProps) {
  const [step, setStep] = useState(1); // 1-4
  const [type, setType] = useState<string>("pothole");
  const [severity, setSeverity] = useState<number>(1);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "validating" | "submitting" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileUploadInputRef = useRef<HTMLInputElement>(null);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const startCamera = async (mode: "environment" | "user" = facingMode) => {
    try {
      setError(null);
      stopCamera();

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast.info("Direct camera access not available. Opening fallback camera...");
        cameraInputRef.current?.click();
        return;
      }

      toast.info("Requesting camera access...");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      setIsCameraActive(true);
      setFacingMode(mode);

      // Short delay to allow DOM video element to mount
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch((err) => console.warn("Video play error:", err));
        }
      }, 100);
    } catch (err: unknown) {
      console.warn("[BottomSheet] Camera access error:", err);
      toast.error("Could not open live camera. Please check camera permissions.");
      stopCamera();
    }
  };

  const switchCamera = () => {
    const nextMode = facingMode === "environment" ? "user" : "environment";
    startCamera(nextMode);
  };

  const captureLivePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Draw frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          toast.error("Failed to capture image snapshot.");
          return;
        }
        const file = new File([blob], `hazard_${Date.now()}.jpg`, { type: "image/jpeg" });
        setImageFile(file);
        setImagePreviewUrl(URL.createObjectURL(blob));
        stopCamera();
        toast.success("Photo captured successfully!");
      },
      "image/jpeg",
      0.92
    );
  };

  const reset = () => {
    stopCamera();
    setStep(1);
    setType("pothole");
    setSeverity(1);
    setImageFile(null);
    setImagePreviewUrl(null);
    setError(null);
    setSubmitStatus("idle");
    setIsSubmitting(false);
  };

  const handleClose = () => {
    stopCamera();
    reset();
    onClose();
  };

  // Clean up camera stream on unmount
  React.useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreviewUrl(URL.createObjectURL(file));
    setError(null);
  };

  const selectedHazardConfig = HAZARD_TYPES.find((t) => t.value === type) || HAZARD_TYPES[0];
  const SelectedIcon = selectedHazardConfig.icon;

  const handleSubmit = async () => {
    if (!idToken) {
      setError("Authentication required. Please sign in to report road hazards.");
      toast.error("Please sign in to submit hazard reports");
      if (onRequireAuth) onRequireAuth();
      return;
    }

    if (userLat == null || userLng == null) {
      setError("GPS location required. You must be physically present at the hazard location (within 100m) to report.");
      toast.error("GPS location is required to verify proximity");
      return;
    }

    if (!imageFile) {
      setError("Please capture a photo of the hazard.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Step 1: encode image for AI validation
      setSubmitStatus("validating");
      const imageBase64 = await fileToBase64(imageFile);
      const imageMimeType = imageFile.type || "image/jpeg";

      // Step 2: submit to backend (Gemini validation happens server-side FIRST.
      // Cloud storage upload ONLY happens on backend after Gemini confirms valid hazard!)
      setSubmitStatus("submitting");
      const endpoint = apiUrl ? `${apiUrl}/api/hazards` : "/api/hazards";

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (idToken) {
        headers["Authorization"] = `Bearer ${idToken}`;
      }

      const payload = {
        type,
        lat: userLat,
        lng: userLng,
        severity,
        imageBase64,
        imageMimeType,
        fileName: imageFile.name || `hazard_${Date.now()}.jpg`,
      };
      toast.loading("Verifying hazard with Gemini Vision AI...", { id: "hazard-submit" });

      const res = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      const responseData = await res.json();

      if (!res.ok) {
        const errorMsg = responseData.error || `Server error: ${res.status}`;
        toast.error(errorMsg, { id: "hazard-submit" });
        throw new Error(errorMsg);
      }

      toast.success("Hazard verified and added to live safety radar!", { id: "hazard-submit" });
      setSubmitStatus("success");
      setTimeout(() => {
        reset();
        onSuccess();
        onClose();
      }, 1500);
    } catch (err: unknown) {
      console.error("[BottomSheet] Submit error:", err);
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
      setSubmitStatus("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="bottom-sheet__overlay"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        className={`bottom-sheet ${isOpen ? "bottom-sheet--open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Report a hazard"
      >
        {/* Drag handle */}
        <div className="bottom-sheet__handle" />

        {/* Header */}
        <div className="bottom-sheet__header flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <h2 className="bottom-sheet__title">Report a Hazard</h2>
          </div>
          <button
            className="bottom-sheet__close flex items-center justify-center"
            onClick={handleClose}
            aria-label="Close report form"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step indicator */}
        <div className="step-indicator">
          {STEP_LABELS.map((label, i) => {
            const n = i + 1;
            return (
              <div
                key={n}
                className={`step-indicator__item${step === n ? " step-indicator__item--active" : ""}${step > n ? " step-indicator__item--done" : ""}`}
              >
                <div className="step-indicator__dot flex items-center justify-center">
                  {step > n ? <Check className="w-3.5 h-3.5" /> : n}
                </div>
                <span className="step-indicator__label">{label}</span>
                {i < STEP_LABELS.length - 1 && (
                  <div className={`step-indicator__line${step > n ? " step-indicator__line--done" : ""}`} />
                )}
              </div>
            );
          })}
        </div>

        <div className="bottom-sheet__body">
          {!idToken ? (
            <div className="flex flex-col items-center justify-center p-8 text-center" style={{ minHeight: "260px" }}>
              <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4">
                <ShieldAlert className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-white mb-1.5">Sign In Required</h3>
              <p className="text-sm text-slate-400 max-w-xs mb-6 leading-relaxed">
                Only authenticated users can upload hazard photos and contribute to the live safety radar.
              </p>
              <button
                onClick={() => {
                  onClose();
                  if (onRequireAuth) onRequireAuth();
                }}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-sm shadow-lg shadow-sky-500/30 cursor-pointer transition-all"
              >
                Sign In to Report
              </button>
            </div>
          ) : (
            <div>
              {/* ── Step 1: Hazard type ───────────────────────────────────────── */}
              {step === 1 && (
                <div>
                  <p className="bottom-sheet__section-label">Type of Hazard</p>
                  <div className="bottom-sheet__type-grid">
                    {HAZARD_TYPES.map((t) => {
                      const IconComp = t.icon;
                      const isSelected = type === t.value;
                      return (
                        <button
                          key={t.value}
                          className={`bottom-sheet__type-btn flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-all ${
                            isSelected
                              ? "bottom-sheet__type-btn--active border-sky-500 bg-sky-500/10"
                              : "border-slate-700/50 hover:border-slate-600 bg-slate-800/40"
                          }`}
                          onClick={() => setType(t.value)}
                          aria-pressed={isSelected}
                        >
                          <span
                            className="bottom-sheet__type-icon flex items-center justify-center w-8 h-8 rounded-lg"
                            style={{ color: t.color, backgroundColor: `${t.color}15` }}
                          >
                            <IconComp className="w-5 h-5" />
                          </span>
                          <span className="bottom-sheet__type-label font-medium text-xs text-center">{t.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  <p className="bottom-sheet__section-label mt-4">Severity</p>
                  <div className="bottom-sheet__severity-row">
                    {SEVERITY_LEVELS.map((s) => (
                      <button
                        key={s.value}
                        className={`bottom-sheet__severity-btn${severity === s.value ? " bottom-sheet__severity-btn--active" : ""}`}
                        style={severity === s.value ? { borderColor: s.color, color: s.color, background: `${s.color}18` } : {}}
                        onClick={() => setSeverity(s.value)}
                        aria-pressed={severity === s.value}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>

                  <button
                    className="bottom-sheet__submit flex items-center justify-center gap-2 mt-4"
                    onClick={() => {
                      if (!idToken) {
                        toast.error("Please sign in to report road hazards");
                        if (onRequireAuth) onRequireAuth();
                        return;
                      }
                      setStep(2);
                    }}
                  >
                    <span>Next: Capture Image</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* ── Step 2: Capture or Upload image ───────────────────────────── */}
              {step === 2 && (
                <div>
                  <p className="bottom-sheet__section-label">Photo Evidence</p>
                  <p className="step-hint">
                    Take a live photo using your camera or upload from your device. Gemini Vision AI will verify the hazard.
                  </p>

                  {/* Hidden camera input for fallback */}
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleImageChange}
                    style={{ display: "none" }}
                    id="hazard-camera-input"
                  />

                  {/* Hidden file upload input (opens gallery/device files) */}
                  <input
                    ref={fileUploadInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    style={{ display: "none" }}
                    id="hazard-file-upload-input"
                  />

                  {/* Live Camera Viewfinder Mode */}
                  {isCameraActive ? (
                    <div className="relative rounded-2xl overflow-hidden bg-black border border-slate-700/80 my-3 shadow-2xl flex flex-col items-center justify-center">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-64 object-cover"
                      />

                      {/* Viewfinder Alignment Crosshairs */}
                      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                        <div className="relative w-48 h-48 border-2 border-sky-400/40 rounded-2xl flex items-center justify-center">
                          <div className="w-4 h-4 border-t-2 border-l-2 border-sky-400 absolute -top-1 -left-1" />
                          <div className="w-4 h-4 border-t-2 border-r-2 border-sky-400 absolute -top-1 -right-1" />
                          <div className="w-4 h-4 border-b-2 border-l-2 border-sky-400 absolute -bottom-1 -left-1" />
                          <div className="w-4 h-4 border-b-2 border-r-2 border-sky-400 absolute -bottom-1 -right-1" />
                          <span className="text-[10px] font-mono tracking-wider font-semibold text-sky-400 bg-slate-900/80 px-2.5 py-0.5 rounded-full border border-sky-500/30 shadow">
                            ALIGN HAZARD
                          </span>
                        </div>
                      </div>

                      {/* Viewfinder Bottom Controls */}
                      <div className="absolute bottom-3 left-0 right-0 flex items-center justify-around px-4">
                        <button
                          type="button"
                          className="px-3 py-1.5 rounded-full bg-slate-900/80 backdrop-blur text-white hover:bg-slate-800 transition-colors text-xs flex items-center gap-1.5 border border-slate-700 cursor-pointer"
                          onClick={stopCamera}
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Close</span>
                        </button>

                        {/* Large Shutter Button */}
                        <button
                          type="button"
                          id="snap-photo-btn"
                          className="w-16 h-16 rounded-full bg-white p-1 shadow-xl shadow-sky-500/50 hover:scale-105 active:scale-95 transition-transform flex items-center justify-center cursor-pointer"
                          onClick={captureLivePhoto}
                          title="Capture Snapshot"
                        >
                          <div className="w-13 h-13 rounded-full border-2 border-slate-900 bg-gradient-to-tr from-sky-500 to-blue-600 flex items-center justify-center text-white">
                            <Camera className="w-6 h-6" />
                          </div>
                        </button>

                        <button
                          type="button"
                          className="px-3 py-1.5 rounded-full bg-slate-900/80 backdrop-blur text-white hover:bg-slate-800 transition-colors text-xs flex items-center gap-1.5 border border-slate-700 cursor-pointer"
                          onClick={switchCamera}
                          title="Flip Camera"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Flip</span>
                        </button>
                      </div>
                    </div>
                  ) : getSafeImageUrl(imagePreviewUrl) ? (
                    <div className="camera-preview">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={getSafeImageUrl(imagePreviewUrl)}
                        alt="Hazard preview"
                        className="camera-preview__img"
                      />
                      <div className="flex items-center justify-center gap-2 mt-3 w-full">
                        <button
                          type="button"
                          className="camera-preview__retake flex items-center justify-center gap-1.5 flex-1"
                          onClick={() => {
                            setImageFile(null);
                            setImagePreviewUrl(null);
                            startCamera();
                          }}
                        >
                          <Camera className="w-4 h-4" />
                          <span>Retake (Camera)</span>
                        </button>
                        <button
                          type="button"
                          className="camera-preview__retake flex items-center justify-center gap-1.5 flex-1"
                          style={{
                            background: "rgba(59, 130, 246, 0.15)",
                            borderColor: "rgba(59, 130, 246, 0.4)",
                            color: "#38bdf8",
                          }}
                          onClick={() => {
                            setImageFile(null);
                            setImagePreviewUrl(null);
                            fileUploadInputRef.current?.click();
                          }}
                        >
                          <Upload className="w-4 h-4" />
                          <span>Choose File</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3 my-3">
                      {/* Option 1: Live Camera (requests permission & opens viewfinder) */}
                      <button
                        type="button"
                        id="capture-camera-btn"
                        className="flex flex-col items-center justify-center gap-2.5 p-5 rounded-2xl border border-sky-500/30 bg-sky-500/10 hover:bg-sky-500/20 hover:border-sky-500/60 transition-all cursor-pointer text-center group"
                        onClick={() => startCamera()}
                      >
                        <div className="w-12 h-12 rounded-xl bg-sky-500/20 flex items-center justify-center text-sky-400 group-hover:scale-110 transition-transform">
                          <Camera className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-white">Capture Photo</p>
                          <p className="text-xs text-slate-400 mt-0.5">Open device camera</p>
                        </div>
                      </button>

                      {/* Option 2: Upload from Device File System */}
                      <button
                        type="button"
                        id="upload-file-btn"
                        className="flex flex-col items-center justify-center gap-2.5 p-5 rounded-2xl border border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 hover:border-purple-500/60 transition-all cursor-pointer text-center group"
                        onClick={() => fileUploadInputRef.current?.click()}
                      >
                        <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
                          <Upload className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-white">Upload Device</p>
                          <p className="text-xs text-slate-400 mt-0.5">Choose from gallery</p>
                        </div>
                      </button>
                    </div>
                  )}

                  <div className="step-nav flex items-center gap-2 mt-4">
                    <button className="step-nav__back flex items-center gap-1.5" onClick={() => setStep(1)}>
                      <ArrowLeft className="w-4 h-4" />
                      <span>Back</span>
                    </button>
                    <button
                      className="bottom-sheet__submit step-nav__next flex items-center justify-center gap-1.5"
                      onClick={() => {
                        if (!idToken) {
                          toast.error("Please sign in to report hazards");
                          if (onRequireAuth) onRequireAuth();
                          return;
                        }
                        if (!imageFile) {
                          setError("Please capture or upload a photo of the hazard.");
                          return;
                        }
                        setError(null);
                        setStep(3);
                      }}
                      disabled={!imageFile}
                    >
                      <span>Next: Confirm Location</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>

                  {error && <p className="bottom-sheet__error" role="alert">{error}</p>}
                </div>
              )}

              {/* ── Step 3: Confirm location ──────────────────────────────────── */}
              {step === 3 && (
                <div>
                  <p className="bottom-sheet__section-label">Hazard Location (100m Proximity Lock)</p>
                  <div className="location-confirm flex items-center gap-3">
                    <div className="location-confirm__map-pin flex items-center justify-center w-10 h-10 rounded-full bg-sky-500/15 text-sky-400">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="location-confirm__coords font-mono font-medium">
                        {userLat && userLng
                          ? `${userLat.toFixed(5)}, ${userLng.toFixed(5)}`
                          : "Acquiring live GPS..."}
                      </p>
                      <p className="location-confirm__note text-xs text-slate-400">
                        Locked to your device GPS location. You must be physically present within 100m of the hazard.
                      </p>
                    </div>
                  </div>

                  {/* Summary card */}
                  <div className="report-summary mt-3">
                    <div className="report-summary__row">
                      <span className="report-summary__label">Type</span>
                      <span className="report-summary__value flex items-center gap-1.5 capitalize font-medium">
                        <SelectedIcon className="w-4 h-4" style={{ color: selectedHazardConfig.color }} />
                        <span>{type}</span>
                      </span>
                    </div>
                    <div className="report-summary__row">
                      <span className="report-summary__label">Severity</span>
                      <span className="report-summary__value font-medium">
                        {SEVERITY_LEVELS.find((s) => s.value === severity)?.label}
                      </span>
                    </div>
                    <div className="report-summary__row">
                      <span className="report-summary__label">Photo</span>
                      <span className="report-summary__value flex items-center gap-1 text-emerald-400 font-medium">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Captured</span>
                      </span>
                    </div>
                    <div className="report-summary__row">
                      <span className="report-summary__label">GPS Lock</span>
                      <span className="report-summary__value flex items-center gap-1 text-emerald-400 font-medium">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Present (Live GPS)</span>
                      </span>
                    </div>
                  </div>

                  <div className="step-nav flex items-center gap-2 mt-4">
                    <button className="step-nav__back flex items-center gap-1.5" onClick={() => setStep(2)}>
                      <ArrowLeft className="w-4 h-4" />
                      <span>Back</span>
                    </button>
                    <button
                      className="bottom-sheet__submit step-nav__next flex items-center justify-center gap-1.5"
                      onClick={() => {
                        if (!idToken) {
                          toast.error("Please sign in to report hazards");
                          if (onRequireAuth) onRequireAuth();
                          return;
                        }
                        if (!userLat || !userLng) {
                          setError("Live GPS position is required to verify you are at the location.");
                          return;
                        }
                        setStep(4);
                      }}
                      disabled={!userLat}
                    >
                      <span>Review & Submit</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* ── Step 4: Submit ────────────────────────────────────────────── */}
              {step === 4 && (
                <div>
                  {submitStatus === "success" ? (
                    <div className="submit-success flex flex-col items-center justify-center p-6 text-center">
                      <div className="submit-success__icon flex items-center justify-center w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 mb-3">
                        <CheckCircle2 className="w-8 h-8" />
                      </div>
                      <p className="submit-success__title font-semibold text-lg">Hazard Reported!</p>
                      <p className="submit-success__sub text-sm text-slate-400">
                        Thank you for keeping roads safe. Your report is now live on the map.
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="bottom-sheet__section-label">Ready to submit</p>

                      {/* Thumbnail preview */}
                      {getSafeImageUrl(imagePreviewUrl) && (
                        <div className="final-preview relative rounded-xl overflow-hidden mb-3">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={getSafeImageUrl(imagePreviewUrl)} alt="Hazard" className="final-preview__img w-full h-36 object-cover" />
                          <div className="final-preview__badge flex items-center gap-1.5 absolute bottom-2 left-2 bg-slate-900/80 backdrop-blur-md px-2.5 py-1 rounded-lg text-xs font-medium border border-slate-700/60 capitalize">
                            <SelectedIcon className="w-3.5 h-3.5" style={{ color: selectedHazardConfig.color }} />
                            <span>{type}</span>
                          </div>
                        </div>
                      )}

                      {/* Loading state messaging */}
                      {isSubmitting && (
                        <div className="submit-status-msg flex items-center justify-center gap-2 p-3 bg-sky-500/10 rounded-lg text-sky-300 text-sm">
                          <div className="auth-btn-spinner" />
                          <span>
                            {submitStatus === "validating" ? "Verifying hazard with Gemini AI..." : "Submitting report..."}
                          </span>
                        </div>
                      )}

                      {error && (
                        <p className="bottom-sheet__error flex items-center gap-1.5 text-rose-400 text-sm mt-2" role="alert">
                          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                          <span>{error}</span>
                        </p>
                      )}

                      <div className="step-nav flex items-center gap-2 mt-4">
                        <button
                          className="step-nav__back flex items-center gap-1.5"
                          onClick={() => setStep(3)}
                          disabled={isSubmitting}
                        >
                          <ArrowLeft className="w-4 h-4" />
                          <span>Back</span>
                        </button>
                        <button
                          id="submit-hazard-btn"
                          className="bottom-sheet__submit step-nav__next flex items-center justify-center gap-2"
                          onClick={handleSubmit}
                          disabled={isSubmitting || !userLat || !idToken}
                          aria-busy={isSubmitting}
                        >
                          {isSubmitting ? (
                            <span>Processing...</span>
                          ) : (
                            <>
                              <Send className="w-4 h-4" />
                              <span>Submit Report</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
