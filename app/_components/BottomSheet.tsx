"use client";

// app/_components/BottomSheet.tsx
// Enhanced 4-step reporting flow with Gemini image validation and premium Lucide icons.

import React, { useState, useRef } from "react";
import { uploadFiles } from "@/lib/uploadthing";
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

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  userLat: number | null;
  userLng: number | null;
  apiUrl: string;
  onSuccess: () => void;
  idToken?: string | null;
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
}: BottomSheetProps) {
  const [step, setStep] = useState(1); // 1-4
  const [type, setType] = useState<string>("pothole");
  const [severity, setSeverity] = useState<number>(1);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "validating" | "submitting" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
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
    reset();
    onClose();
  };

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
    if (!userLat || !userLng) {
      setError("Unable to get your location. Please enable GPS and try again.");
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

      // Step 2: Upload to UploadThing storage
      let uploadedImageUrl: string | null = null;
      try {
        const uploadRes = await uploadFiles("hazardImageUploader", {
          files: [imageFile],
        });
        if (uploadRes && uploadRes.length > 0) {
          uploadedImageUrl = uploadRes[0].url || uploadRes[0].appUrl || null;
        }
      } catch (uploadErr) {
        console.warn("[BottomSheet] UploadThing upload warning:", uploadErr);
      }

      // Step 3: submit to backend (Gemini validation happens server-side)
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
        imageUrl: uploadedImageUrl,
        image_url: uploadedImageUrl,
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

      toast.success("Hazard verified and reported to live radar!", { id: "hazard-submit" });
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

          {/* ── Step 1: Hazard type ───────────────────────────────────────── */}
          {step === 1 && (
            <>
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
                onClick={() => setStep(2)}
              >
                <span>Next: Capture Image</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </>
          )}

          {/* ── Step 2: Capture image ─────────────────────────────────────── */}
          {step === 2 && (
            <>
              <p className="bottom-sheet__section-label">Photo Evidence</p>
              <p className="step-hint">
                Take a clear photo of the hazard. Our AI will verify it&apos;s a real road hazard.
              </p>

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleImageChange}
                style={{ display: "none" }}
                id="hazard-camera-input"
              />

              {imagePreviewUrl ? (
                <div className="camera-preview">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imagePreviewUrl}
                    alt="Hazard preview"
                    className="camera-preview__img"
                  />
                  <button
                    className="camera-preview__retake flex items-center gap-1.5"
                    onClick={() => {
                      setImageFile(null);
                      setImagePreviewUrl(null);
                      fileInputRef.current?.click();
                    }}
                  >
                    <Camera className="w-4 h-4" />
                    <span>Retake</span>
                  </button>
                </div>
              ) : (
                <button
                  id="capture-photo-btn"
                  className="camera-capture-btn flex items-center justify-center gap-2"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Camera className="w-5 h-5" />
                  <span>Capture Photo</span>
                </button>
              )}

              <div className="step-nav flex items-center gap-2 mt-4">
                <button className="step-nav__back flex items-center gap-1.5" onClick={() => setStep(1)}>
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
                <button
                  className="bottom-sheet__submit step-nav__next flex items-center justify-center gap-1.5"
                  onClick={() => {
                    if (!imageFile) {
                      setError("Please capture a photo first.");
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
            </>
          )}

          {/* ── Step 3: Confirm location ──────────────────────────────────── */}
          {step === 3 && (
            <>
              <p className="bottom-sheet__section-label">Hazard Location</p>
              <div className="location-confirm flex items-center gap-3">
                <div className="location-confirm__map-pin flex items-center justify-center w-10 h-10 rounded-full bg-sky-500/15 text-sky-400">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <p className="location-confirm__coords font-mono font-medium">
                    {userLat && userLng
                      ? `${userLat.toFixed(5)}, ${userLng.toFixed(5)}`
                      : "Waiting for GPS..."}
                  </p>
                  <p className="location-confirm__note text-xs text-slate-400">
                    Your current position will be recorded as the hazard location.
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
              </div>

              <div className="step-nav flex items-center gap-2 mt-4">
                <button className="step-nav__back flex items-center gap-1.5" onClick={() => setStep(2)}>
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
                <button
                  className="bottom-sheet__submit step-nav__next flex items-center justify-center gap-1.5"
                  onClick={() => {
                    if (!userLat || !userLng) {
                      setError("GPS not available yet.");
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
            </>
          )}

          {/* ── Step 4: Submit ────────────────────────────────────────────── */}
          {step === 4 && (
            <>
              {submitStatus === "success" ? (
                <div className="submit-success flex flex-col items-center justify-center p-6 text-center">
                  <div className="submit-success__icon flex items-center justify-center w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 mb-3">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <p className="submit-success__title font-semibold text-lg">Hazard Reported!</p>
                  <p className="submit-success__sub text-sm text-slate-400">
                    Thank you for keeping roads safe.
                  </p>
                </div>
              ) : (
                <>
                  <p className="bottom-sheet__section-label">Ready to submit</p>

                  {/* Thumbnail preview */}
                  {imagePreviewUrl && (
                    <div className="final-preview relative rounded-xl overflow-hidden mb-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={imagePreviewUrl} alt="Hazard" className="final-preview__img w-full h-36 object-cover" />
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
                        {submitStatus === "validating" ? "Verifying hazard with AI..." : "Submitting report..."}
                      </span>
                    </div>
                  )}

                  {error && (
                    <p className="bottom-sheet__error flex items-center gap-1.5 text-rose-400 text-sm mt-2" role="alert">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                      <span>{error}</span>
                    </p>
                  )}

                  {!idToken && (
                    <p className="auth-required-warning flex items-center gap-1.5 text-amber-400 text-xs mt-2">
                      <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                      <span>
                        You are not signed in. Please{" "}
                        <a href="/login" className="auth-required-link underline font-medium">sign in</a>{" "}
                        to submit reports.
                      </span>
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
                </>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
