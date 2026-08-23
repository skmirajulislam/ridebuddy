"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { ShieldCheck, ThumbsUp, AlertTriangle, X, Award, Loader2, Camera } from "lucide-react";
import { useAuth } from "../_hooks/useAuth";

interface RepairVerificationPromptProps {
  hazard: {
    id: number;
    type: string;
    repair_image_url?: string | null;
  };
  distanceMeters: number;
  onDismiss: () => void;
  onVerified: (hazardId: number, revertedToActive: boolean) => void;
  onRequireAuth?: () => void;
}

export default function RepairVerificationPrompt({
  hazard,
  distanceMeters,
  onDismiss,
  onVerified,
  onRequireAuth,
}: RepairVerificationPromptProps) {
  const { idToken } = useAuth();
  const [submitting, setSubmitting] = useState<"confirmed" | "still_broken" | null>(null);

  // Auto-dismiss after 20s if no interaction
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss();
    }, 20000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const handleVote = async (vote: "confirmed" | "still_broken") => {
    if (!idToken) {
      toast.info("Please sign in to verify repairs & earn +50 Karma!");
      onRequireAuth?.();
      onDismiss();
      return;
    }

    setSubmitting(vote);
    try {
      const res = await fetch(`/api/hazards/${hazard.id}/repair-verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ vote }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(data.message, { icon: "🏆" });
        onVerified(hazard.id, data.revertedToActive);
      } else {
        toast.info(data.message || "Already verified this repair");
        onDismiss();
      }
    } catch {
      toast.error("Failed to submit repair verification");
      onDismiss();
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <aside
      aria-label="Repair Verification Prompt"
      className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[45] w-[92%] max-w-sm rounded-2xl bg-slate-900/95 border border-emerald-500/40 p-4 text-slate-100 shadow-2xl shadow-emerald-950/40 backdrop-blur-xl animate-in slide-in-from-bottom-5 duration-200"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              Repair Check ({Math.round(distanceMeters)}m away)
            </h4>
            <p className="text-sm font-semibold text-slate-100">
              PWD marked this{" "}
              <span className="capitalize">{hazard.type}</span> as repaired
            </p>
          </div>
        </div>
        <button
          onClick={onDismiss}
          className="h-6 w-6 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          aria-label="Dismiss repair verification"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Repair proof thumbnail */}
      {hazard.repair_image_url && (
        <div
          style={{
            width: "100%",
            height: "80px",
            borderRadius: "10px",
            overflow: "hidden",
            border: "1px solid rgba(34, 197, 94, 0.3)",
            marginBottom: "10px",
            position: "relative",
          }}
        >
          <Image
            src={hazard.repair_image_url}
            alt="Repair proof"
            fill
            unoptimized
            sizes="(max-width: 400px) 100vw, 350px"
            style={{ objectFit: "cover" }}
          />
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              background: "linear-gradient(transparent, rgba(0,0,0,0.7))",
              padding: "4px 8px",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              fontSize: "10px",
              fontWeight: 600,
              color: "#22c55e",
            }}
          >
            <Camera className="w-3 h-3" />
            <span>Official Repair Photo</span>
          </div>
        </div>
      )}

      <p className="text-xs text-slate-300 mb-3">
        Has this road been properly repaired? Confirm to earn{" "}
        <span className="text-emerald-400 font-bold inline-flex items-center gap-0.5">
          <Award className="h-3 w-3 inline" /> +50 Karma
        </span>
        .
      </p>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => handleVote("confirmed")}
          disabled={submitting !== null}
          className="h-10 px-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30 font-semibold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all"
        >
          {submitting === "confirmed" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <ThumbsUp className="h-3.5 w-3.5" />
          )}
          <span>Yes, Fixed 👍</span>
        </button>

        <button
          onClick={() => handleVote("still_broken")}
          disabled={submitting !== null}
          className="h-10 px-3 rounded-xl bg-red-500/20 border border-red-500/40 text-red-300 hover:bg-red-500/30 font-semibold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all"
        >
          {submitting === "still_broken" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <AlertTriangle className="h-3.5 w-3.5" />
          )}
          <span>Still Broken ⚠️</span>
        </button>
      </div>
    </aside>
  );
}
