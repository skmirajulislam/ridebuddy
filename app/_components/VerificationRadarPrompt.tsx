"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { AlertTriangle, ThumbsUp, CheckCircle, X, Award, Loader2 } from "lucide-react";
import type { CachedHazard } from "../_hooks/useHazardCache";
import { useAuth } from "../_hooks/useAuth";

interface VerificationRadarPromptProps {
  hazard: CachedHazard;
  distanceMeters: number;
  onDismiss: () => void;
  onVerified: (hazardId: number, isResolved: boolean) => void;
}

export default function VerificationRadarPrompt({
  hazard,
  distanceMeters,
  onDismiss,
  onVerified,
}: VerificationRadarPromptProps) {
  const { idToken } = useAuth();
  const [submitting, setSubmitting] = useState<"still_there" | "fixed" | null>(null);

  // Auto-dismiss after 15s if no interaction to not distract driver
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss();
    }, 15000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const handleVote = async (vote: "still_there" | "fixed") => {
    if (!idToken) {
      toast.info("Sign in to earn Karma for verifying road hazards!");
      onDismiss();
      return;
    }

    setSubmitting(vote);
    try {
      const res = await fetch(`/api/hazards/${hazard.id}/verify`, {
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
        onVerified(hazard.id, data.isResolved);
      } else {
        toast.info(data.message || "Already verified");
        onDismiss();
      }
    } catch {
      toast.error("Failed to submit verification");
      onDismiss();
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <aside
      aria-label="Road Hazard Verification Prompt"
      className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[45] w-[92%] max-w-sm rounded-2xl bg-slate-900/95 border border-amber-500/40 p-4 text-slate-100 shadow-2xl shadow-amber-950/40 backdrop-blur-xl animate-in slide-in-from-bottom-5 duration-200"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400">
              Community Radar Check ({Math.round(distanceMeters)}m away)
            </h4>
            <p className="text-sm font-semibold capitalize text-slate-100">
              {hazard.type} Reported Ahead
            </p>
          </div>
        </div>
        <button
          onClick={onDismiss}
          className="h-6 w-6 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          aria-label="Dismiss verification prompt"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <p className="text-xs text-slate-300 mb-3">
        Is this hazard still on the road? Confirm to keep our maps accurate & earn{" "}
        <span className="text-amber-400 font-bold inline-flex items-center gap-0.5">
          <Award className="h-3 w-3 inline" /> +10 Karma
        </span>
        .
      </p>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => handleVote("still_there")}
          disabled={submitting !== null}
          className="h-10 px-3 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500/30 font-semibold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all"
        >
          {submitting === "still_there" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <ThumbsUp className="h-3.5 w-3.5" />
          )}
          <span>Still Here</span>
        </button>

        <button
          onClick={() => handleVote("fixed")}
          disabled={submitting !== null}
          className="h-10 px-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30 font-semibold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all"
        >
          {submitting === "fixed" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <CheckCircle className="h-3.5 w-3.5" />
          )}
          <span>Fixed / Gone</span>
        </button>
      </div>
    </aside>
  );
}
