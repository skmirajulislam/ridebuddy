"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { Trophy, MapPin, X, Flame, Loader2 } from "lucide-react";

interface LeaderboardUser {
  rank: number;
  id: number;
  name: string;
  handle: string;
  city: string;
  karma: number;
  badges: string[];
  avatar_url?: string | null;
  total_reports: number;
}

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  userCity?: string;
  onSelectUser?: (handle: string) => void;
}

export default function LeaderboardModal({
  isOpen,
  onClose,
  userCity,
  onSelectUser,
}: LeaderboardModalProps) {
  const [selectedCity, setSelectedCity] = useState<string>(userCity || "Global");
  const [cities, setCities] = useState<string[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const fetchLeaderboard = async () => {
      setLoading(true);
      try {
        const query = selectedCity === "Global" ? "" : `?city=${encodeURIComponent(selectedCity)}`;
        const res = await fetch(`/api/leaderboard${query}`);
        if (res.ok) {
          const data = await res.json();
          setLeaderboard(data.leaderboard || []);
          if (data.cities && data.cities.length > 0) {
            setCities(["Global", ...data.cities.filter((c: string) => c !== "Global")]);
          }
        }
      } catch (err) {
        console.error("Failed to fetch leaderboard:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [isOpen, selectedCity]);

  if (!isOpen) return null;

  const topThree = leaderboard.slice(0, 3);
  const remaining = leaderboard.slice(3);

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl max-h-[85vh] flex flex-col rounded-3xl border border-slate-700 bg-slate-900/95 p-6 sm:p-8 text-slate-100 shadow-2xl shadow-amber-950/30 backdrop-blur-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 h-8 w-8 rounded-full bg-slate-800 border border-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors z-10"
          aria-label="Close Leaderboard"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center justify-between gap-4 mb-5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center text-slate-950 shadow-lg shadow-amber-500/30 font-black">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                City Safety Leaderboard
                <Flame className="w-4 h-4 text-orange-400 fill-orange-400" />
              </h3>
              <p className="text-xs text-slate-400">
                Top road safety guardians & verified karma champions
              </p>
            </div>
          </div>
        </div>

        {/* City Filter Pills */}
        <div className="flex gap-2 overflow-x-auto pb-3 mb-4 shrink-0 no-scrollbar">
          {cities.map((city) => (
            <button
              key={city}
              onClick={() => setSelectedCity(city)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                selectedCity === city
                  ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-bold"
                  : "bg-slate-800/80 text-slate-300 hover:bg-slate-700 border border-slate-700/60"
              }`}
            >
              <MapPin className="w-3 h-3" />
              <span>{city}</span>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="py-16 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-amber-400 mx-auto mb-3" />
            <p className="text-xs text-slate-400">Loading top contributors...</p>
          </div>
        ) : (
          <div className="overflow-y-auto space-y-4 pr-1">
            {/* Top 3 Podium Card */}
            {topThree.length > 0 && (
              <div className="grid grid-cols-3 gap-2 sm:gap-3 p-4 rounded-2xl bg-gradient-to-b from-slate-800/80 to-slate-950/80 border border-amber-500/30 text-center items-end">
                {/* 2nd Place */}
                {topThree[1] && (
                  <div
                    onClick={() => onSelectUser?.(topThree[1].handle)}
                    className="cursor-pointer space-y-1.5 transition-transform hover:scale-105"
                  >
                    <div className="relative mx-auto w-12 h-12 rounded-full border-2 border-slate-400 bg-slate-800 flex items-center justify-center font-bold text-sm text-slate-300">
                      {topThree[1].avatar_url ? (
                        <Image
                          src={topThree[1].avatar_url}
                          alt={topThree[1].name}
                          width={48}
                          height={48}
                          className="rounded-full object-cover"
                        />
                      ) : (
                        topThree[1].name.charAt(0).toUpperCase()
                      )}
                      <span className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-slate-400 text-slate-950 text-[10px] font-black flex items-center justify-center">
                        2
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-slate-200 truncate">{topThree[1].name}</h4>
                    <span className="text-[11px] font-black text-amber-400 block">{topThree[1].karma} Karma</span>
                    <span className="text-[10px] text-slate-400 block truncate">{topThree[1].city}</span>
                  </div>
                )}

                {/* 1st Place */}
                {topThree[0] && (
                  <div
                    onClick={() => onSelectUser?.(topThree[0].handle)}
                    className="cursor-pointer space-y-1.5 pb-2 transition-transform hover:scale-105"
                  >
                    <div className="relative mx-auto w-16 h-16 rounded-full border-2 border-amber-400 bg-amber-500/20 flex items-center justify-center font-black text-base text-amber-300 shadow-lg shadow-amber-500/30">
                      {topThree[0].avatar_url ? (
                        <Image
                          src={topThree[0].avatar_url}
                          alt={topThree[0].name}
                          width={64}
                          height={64}
                          className="rounded-full object-cover"
                        />
                      ) : (
                        topThree[0].name.charAt(0).toUpperCase()
                      )}
                      <span className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-amber-400 text-slate-950 text-xs font-black flex items-center justify-center shadow">
                        👑
                      </span>
                    </div>
                    <h4 className="text-sm font-extrabold text-amber-300 truncate">{topThree[0].name}</h4>
                    <span className="text-xs font-black text-amber-400 block">{topThree[0].karma} Karma</span>
                    <span className="text-[10px] text-emerald-400 font-semibold block truncate">
                      📍 {topThree[0].city}
                    </span>
                  </div>
                )}

                {/* 3rd Place */}
                {topThree[2] && (
                  <div
                    onClick={() => onSelectUser?.(topThree[2].handle)}
                    className="cursor-pointer space-y-1.5 transition-transform hover:scale-105"
                  >
                    <div className="relative mx-auto w-12 h-12 rounded-full border-2 border-amber-700 bg-slate-800 flex items-center justify-center font-bold text-sm text-amber-600">
                      {topThree[2].avatar_url ? (
                        <Image
                          src={topThree[2].avatar_url}
                          alt={topThree[2].name}
                          width={48}
                          height={48}
                          className="rounded-full object-cover"
                        />
                      ) : (
                        topThree[2].name.charAt(0).toUpperCase()
                      )}
                      <span className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-amber-700 text-amber-100 text-[10px] font-black flex items-center justify-center">
                        3
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-slate-200 truncate">{topThree[2].name}</h4>
                    <span className="text-[11px] font-black text-amber-400 block">{topThree[2].karma} Karma</span>
                    <span className="text-[10px] text-slate-400 block truncate">{topThree[2].city}</span>
                  </div>
                )}
              </div>
            )}

            {/* List for Rank 4+ */}
            <div className="space-y-2">
              {remaining.map((user) => (
                <div
                  key={user.id}
                  onClick={() => onSelectUser?.(user.handle)}
                  className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-5 text-center font-mono font-bold text-xs text-slate-400">
                      #{user.rank}
                    </span>
                    <div className="h-9 w-9 rounded-full bg-slate-700 flex items-center justify-center font-bold text-xs text-cyan-300 overflow-hidden">
                      {user.avatar_url ? (
                        <Image
                          src={user.avatar_url}
                          alt={user.name}
                          width={36}
                          height={36}
                          className="object-cover"
                        />
                      ) : (
                        user.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-100">{user.name}</span>
                        <span className="text-[11px] font-semibold text-emerald-400">
                          📍 {user.city}
                        </span>
                      </div>
                      <span className="text-xs text-slate-400 font-mono">
                        @{user.handle.replace(/^@/, "")}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-sm font-black text-amber-400 block">
                      {user.karma} pts
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {user.total_reports} reports
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
