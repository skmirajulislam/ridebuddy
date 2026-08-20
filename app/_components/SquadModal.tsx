"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import {
  Users,
  Plus,
  ArrowRight,
  Copy,
  CheckCheck,
  X,
  Gauge,
  LogOut,
  Radio,
  Loader2,
} from "lucide-react";
import { useAuth } from "../_hooks/useAuth";
import type { SquadDetails } from "@/lib/services/squad.service";

interface SquadModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeSquad: SquadDetails | null;
  onSquadUpdated: (squad: SquadDetails | null) => void;
}

export default function SquadModal({
  isOpen,
  onClose,
  activeSquad,
  onSquadUpdated,
}: SquadModalProps) {
  const { idToken, user } = useAuth();
  const [squadName, setSquadName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCreateSquad = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idToken) {
      toast.error("Please sign in to start a Rider Squad");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/squads", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ name: squadName || `${user?.name || "Rider"}'s Convoy` }),
      });

      if (!res.ok) {
        throw new Error("Failed to create squad room");
      }

      const squad = await res.json();
      onSquadUpdated(squad);
      toast.success(`Squad "${squad.name}" active! Share code ${squad.code} with your convoy.`, { icon: "🏍️" });
    } catch (err: unknown) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinSquad = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) {
      toast.error("Please enter a 6-digit squad code");
      return;
    }
    if (!idToken) {
      toast.error("Please sign in to join a squad");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/squads/join", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ code: joinCode.trim().toUpperCase() }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to join squad");
      }

      const squad = await res.json();
      onSquadUpdated(squad);
      toast.success(`Joined "${squad.name}" convoy radar!`, { icon: "🏍️" });
    } catch (err: unknown) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveSquad = async () => {
    if (!activeSquad || !idToken) return;

    setLoading(true);
    try {
      await fetch(`/api/squads/${activeSquad.code}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${idToken}` },
      });

      onSquadUpdated(null);
      toast.info("Left squad convoy.");
      onClose();
    } catch {
      toast.error("Failed to leave squad");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = () => {
    if (!activeSquad) return;
    navigator.clipboard.writeText(activeSquad.code);
    setCopied(true);
    toast.success(`Copied room code: ${activeSquad.code}`);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-3xl border border-slate-700 bg-slate-900/95 p-6 sm:p-8 text-slate-100 shadow-2xl shadow-cyan-950/40 backdrop-blur-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 h-8 w-8 rounded-full bg-slate-800 border border-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          aria-label="Close Squad Modal"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/30">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-100">Rider Squads & Convoy</h3>
            <p className="text-xs text-slate-400">
              Live group GPS radar, lead hazard broadcasts, and convoy sync
            </p>
          </div>
        </div>

        {activeSquad ? (
          /* Active Squad View */
          <div className="space-y-5">
            {/* Squad Info Card */}
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-cyan-500/30 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                  <Radio className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
                  Active Convoy Room
                </span>
                <h4 className="text-lg font-bold text-white">{activeSquad.name}</h4>
              </div>

              {/* Room Code Badge */}
              <div
                onClick={handleCopyCode}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 cursor-pointer hover:bg-cyan-500/20 transition-all"
                title="Click to copy squad code"
              >
                <span className="text-base font-black tracking-widest text-cyan-400 font-mono">
                  {activeSquad.code}
                </span>
                {copied ? (
                  <CheckCheck className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Copy className="w-4 h-4 text-cyan-400 opacity-80" />
                )}
              </div>
            </div>

            {/* Active Members Roster */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Convoy Members ({activeSquad.members?.length || 1})
                </span>
                <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                  Live GPS Radar
                </span>
              </div>

              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {activeSquad.members?.map((member) => (
                  <div
                    key={member.id}
                    className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-slate-700 flex items-center justify-center font-bold text-xs text-cyan-300">
                        {member.user_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-white">
                            {member.user_name}
                          </span>
                          {member.user_id === activeSquad.leader_id && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                              Lead
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-slate-400 font-mono">
                          @{member.handle || `rider_${member.user_id}`}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 text-xs font-semibold text-slate-300">
                      <Gauge className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{Math.round(member.speed || 0)} km/h</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Leave Squad Action */}
            <button
              onClick={handleLeaveSquad}
              disabled={loading}
              className="w-full h-11 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 font-semibold text-xs flex items-center justify-center gap-2 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Leave Squad Convoy</span>
            </button>
          </div>
        ) : (
          /* Join or Create Tabs */
          <div className="space-y-6">
            {/* Create Room Form */}
            <form onSubmit={handleCreateSquad} className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                Create a New Convoy
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={squadName}
                  onChange={(e) => setSquadName(e.target.value)}
                  placeholder="Convoy Name (e.g. Highway Cruisers)"
                  className="flex-1 h-11 px-4 rounded-xl border border-slate-700 bg-slate-900 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="h-11 px-5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-cyan-500/20 transition-all shrink-0"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  <span>Create</span>
                </button>
              </div>
            </form>

            <div className="flex items-center gap-4 text-xs font-bold text-slate-500 uppercase tracking-widest">
              <div className="h-[1px] flex-1 bg-slate-800" />
              <span>OR JOIN ROOM</span>
              <div className="h-[1px] flex-1 bg-slate-800" />
            </div>

            {/* Join Room Form */}
            <form onSubmit={handleJoinSquad} className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                Enter 6-Digit Squad Code
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  maxLength={6}
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="e.g. 7K2M9X"
                  className="flex-1 h-11 px-4 rounded-xl border border-slate-700 bg-slate-900 text-base text-white tracking-widest font-mono uppercase placeholder:tracking-normal placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 text-center font-bold"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="h-11 px-5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-blue-600/30 transition-all shrink-0"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ArrowRight className="w-4 h-4" />
                  )}
                  <span>Join Convoy</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
