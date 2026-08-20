"use client";

// app/_components/BottomSheet.tsx
// Enhanced from original — 4-step reporting flow with Gemini image validation.
// Props interface extended with idToken; all original props preserved (backward-compatible).

import { useState, useRef } from "react";
import { uploadFiles } from "@/lib/uploadthing";
import { toast } from "sonner";

const HAZARD_TYPES = [
  { value: "pothole", label: "Pothole", icon: "🕳️" },
  { value: "flood", label: "Flood", icon: "🌊" },
  { value: "accident", label: "Accident", icon: "🚗" },
  { value: "roadblock", label: "Road Block", icon: "🚧" },
  { value: "debris", label: "Debris", icon: "🪨" },
  { value: "speed braker", label: "Un Marked Speed Braker", icon: "❌" },
  { value: "patch", label: "Patch work in road", icon: "⛔️" },
  { value: "low light", label: "Low Light", icon: "💡" },
  { value: "others", label: "Others", icon: "📍" },
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
  idToken?: string | null; // NEW — auth token; undefined = unauthenticated
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

  const handleSubmit = async () => {
    console.log("[BottomSheet] handleSubmit called");
    console.log("[BottomSheet] userLat:", userLat, "userLng:", userLng);
    console.log("[BottomSheet] idToken:", idToken ? "present" : "missing");

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
      console.log("[BottomSheet] Encoding image...");
      const imageBase64 = await fileToBase64(imageFile);
      const imageMimeType = imageFile.type || "image/jpeg";
      console.log("[BottomSheet] Image encoded, size:", imageBase64.length, "type:", imageMimeType);

      // Step 2: Upload to UploadThing storage
      let uploadedImageUrl: string | null = null;
      try {
        console.log("[BottomSheet] Uploading to UploadThing storage...");
        const uploadRes = await uploadFiles("hazardImageUploader", {
          files: [imageFile],
        });
        if (uploadRes && uploadRes.length > 0) {
          uploadedImageUrl = uploadRes[0].url || uploadRes[0].appUrl || null;
          console.log("[BottomSheet] ✅ UploadThing upload success:", uploadedImageUrl);
        }
      } catch (uploadErr) {
        console.warn("[BottomSheet] UploadThing upload warning (continuing with AI validation):", uploadErr);
      }

      // Step 3: submit to backend (Gemini validation happens server-side)
      setSubmitStatus("submitting");
      const endpoint = apiUrl ? `${apiUrl}/api/hazards` : "/api/hazards";
      console.log("[BottomSheet] Submitting to:", endpoint);

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (idToken) {
        headers["Authorization"] = `Bearer ${idToken}`;
        console.log("[BottomSheet] Auth header added");
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

      console.log("[BottomSheet] Response status:", res.status);
      const responseData = await res.json();
      console.log("[BottomSheet] Response data:", responseData);

      if (!res.ok) {
        // Surface meaningful backend error messages
        const errorMsg = responseData.error || `Server error: ${res.status}`;
        console.error("[BottomSheet] Request failed:", responseData);
        toast.error(errorMsg, { id: "hazard-submit" });
        throw new Error(errorMsg);
      }

      console.log("[BottomSheet] ✅ Hazard submitted successfully!");
      toast.success("✅ Hazard verified & reported to live radar!", { id: "hazard-submit" });
      setSubmitStatus("success");
      setTimeout(() => {
        reset();
        onSuccess();
        onClose();
      }, 1500);
    } catch (err: unknown) {
      console.error("[BottomSheet] ❌ Submit error:", err);
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
        <div className="bottom-sheet__header">
          <h2 className="bottom-sheet__title">Report a Hazard</h2>
          <button
            className="bottom-sheet__close"
            onClick={handleClose}
            aria-label="Close report form"
          >
            ✕
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
                <div className="step-indicator__dot">
                  {step > n ? "✓" : n}
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
                {HAZARD_TYPES.map((t) => (
                  <button
                    key={t.value}
                    className={`bottom-sheet__type-btn${type === t.value ? " bottom-sheet__type-btn--active" : ""}`}
                    onClick={() => setType(t.value)}
                    aria-pressed={type === t.value}
                  >
                    <span className="bottom-sheet__type-icon">{t.icon}</span>
                    <span className="bottom-sheet__type-label">{t.label}</span>
                  </button>
                ))}
              </div>

              <p className="bottom-sheet__section-label">Severity</p>
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
                className="bottom-sheet__submit"
                onClick={() => setStep(2)}
              >
                Next: Capture Image →
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

              {/* Hidden file input — camera only on mobile */}
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
                    className="camera-preview__retake"
                    onClick={() => {
                      setImageFile(null);
                      setImagePreviewUrl(null);
                      fileInputRef.current?.click();
                    }}
                  >
                    📷 Retake
                  </button>
                </div>
              ) : (
                <button
                  id="capture-photo-btn"
                  className="camera-capture-btn"
                  onClick={() => fileInputRef.current?.click()}
                >
                  📷 Capture Photo
                </button>
              )}

              <div className="step-nav">
                <button className="step-nav__back" onClick={() => setStep(1)}>
                  ← Back
                </button>
                <button
                  className="bottom-sheet__submit step-nav__next"
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
                  Next: Confirm Location →
                </button>
              </div>

              {error && <p className="bottom-sheet__error" role="alert">{error}</p>}
            </>
          )}

          {/* ── Step 3: Confirm location ──────────────────────────────────── */}
          {step === 3 && (
            <>
              <p className="bottom-sheet__section-label">Hazard Location</p>
              <div className="location-confirm">
                <div className="location-confirm__map-pin">📍</div>
                <div>
                  <p className="location-confirm__coords">
                    {userLat && userLng
                      ? `${userLat.toFixed(5)}, ${userLng.toFixed(5)}`
                      : "Waiting for GPS..."}
                  </p>
                  <p className="location-confirm__note">
                    Your current position will be recorded as the hazard location.
                  </p>
                </div>
              </div>

              {/* Summary card */}
              <div className="report-summary">
                <div className="report-summary__row">
                  <span className="report-summary__label">Type</span>
                  <span className="report-summary__value" style={{ textTransform: "capitalize" }}>
                    {HAZARD_TYPES.find(t => t.value === type)?.icon} {type}
                  </span>
                </div>
                <div className="report-summary__row">
                  <span className="report-summary__label">Severity</span>
                  <span className="report-summary__value">
                    {SEVERITY_LEVELS.find(s => s.value === severity)?.label}
                  </span>
                </div>
                <div className="report-summary__row">
                  <span className="report-summary__label">Photo</span>
                  <span className="report-summary__value">✅ Captured</span>
                </div>
              </div>

              <div className="step-nav">
                <button className="step-nav__back" onClick={() => setStep(2)}>
                  ← Back
                </button>
                <button
                  className="bottom-sheet__submit step-nav__next"
                  onClick={() => {
                    if (!userLat || !userLng) {
                      setError("GPS not available yet.");
                      return;
                    }
                    setStep(4);
                  }}
                  disabled={!userLat}
                >
                  Review & Submit →
                </button>
              </div>
            </>
          )}

          {/* ── Step 4: Submit ────────────────────────────────────────────── */}
          {step === 4 && (
            <>
              {submitStatus === "success" ? (
                <div className="submit-success">
                  <div className="submit-success__icon">✅</div>
                  <p className="submit-success__title">Hazard Reported!</p>
                  <p className="submit-success__sub">
                    Thank you for keeping roads safe.
                  </p>
                </div>
              ) : (
                <>
                  <p className="bottom-sheet__section-label">Ready to submit</p>

                  {/* Thumbnail preview */}
                  {imagePreviewUrl && (
                    <div className="final-preview">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={imagePreviewUrl} alt="Hazard" className="final-preview__img" />
                      <div className="final-preview__badge">
                        {HAZARD_TYPES.find(t => t.value === type)?.icon} {type}
                      </div>
                    </div>
                  )}

                  {/* Loading state messaging */}
                  {isSubmitting && (
                    <div className="submit-status-msg">
                      {submitStatus === "validating" && (
                        <><div className="auth-btn-spinner" /> Verifying hazard with AI...</>
                      )}
                      {submitStatus === "submitting" && (
                        <><div className="auth-btn-spinner" /> Submitting report...</>
                      )}
                    </div>
                  )}

                  {error && (
                    <p className="bottom-sheet__error" role="alert">
                      {error}
                    </p>
                  )}

                  {!idToken && (
                    <p className="auth-required-warning">
                      ⚠️ You are not signed in. Please{" "}
                      <a href="/login" className="auth-required-link">sign in</a>{" "}
                      to submit reports.
                    </p>
                  )}

                  <div className="step-nav">
                    <button
                      className="step-nav__back"
                      onClick={() => setStep(3)}
                      disabled={isSubmitting}
                    >
                      ← Back
                    </button>
                    <button
                      id="submit-hazard-btn"
                      className="bottom-sheet__submit step-nav__next"
                      onClick={handleSubmit}
                      disabled={isSubmitting || !userLat || !idToken}
                      aria-busy={isSubmitting}
                    >
                      {isSubmitting ? "Processing..." : "🚨 Submit Report"}
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
