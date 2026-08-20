"use client";

import React, { useState, useEffect, useRef } from "react";
import { AlertOctagon, PhoneCall, MessageSquare, Volume2, VolumeX, X, Share2, MapPin, Copy, CheckCheck } from "lucide-react";
import { toast } from "sonner";

interface EmergencySOSModalProps {
  isOpen: boolean;
  onClose: () => void;
  lat: number | null;
  lng: number | null;
  emergencyContact?: string | null;
}

export default function EmergencySOSModal({
  isOpen,
  onClose,
  lat,
  lng,
  emergencyContact,
}: EmergencySOSModalProps) {
  const [isSirenActive, setIsSirenActive] = useState(false);
  const [copied, setCopied] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);

  const targetContact = emergencyContact?.trim() || "112";
  const mapsLink = lat && lng ? `https://maps.google.com/?q=${lat.toFixed(6)},${lng.toFixed(6)}` : "GPS unavailable";
  const sosMessage = `🚨 EMERGENCY SOS! I need immediate road assistance. My current GPS Location: ${mapsLink}`;

  // Start / stop emergency siren alarm using Web Audio API
  const toggleSiren = () => {
    if (isSirenActive) {
      oscillatorRef.current?.stop();
      audioContextRef.current?.close();
      audioContextRef.current = null;
      setIsSirenActive(false);
    } else {
      try {
        const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        // Siren oscillation
        osc.frequency.linearRampToValueAtTime(1400, ctx.currentTime + 0.4);
        osc.frequency.linearRampToValueAtTime(800, ctx.currentTime + 0.8);

        gain.gain.setValueAtTime(0.3, ctx.currentTime);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();

        audioContextRef.current = ctx;
        oscillatorRef.current = osc;
        setIsSirenActive(true);
        toast.error("Emergency Siren Alarm Activated!", { icon: "🚨" });
      } catch {
        toast.error("Could not start audio siren");
      }
    }
  };

  useEffect(() => {
    return () => {
      oscillatorRef.current?.stop();
      audioContextRef.current?.close();
    };
  }, []);

  if (!isOpen) return null;

  const handleCopyLocation = () => {
    navigator.clipboard.writeText(sosMessage);
    setCopied(true);
    toast.success("SOS Message & GPS coordinates copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendSMS = () => {
    const smsUrl = `sms:${targetContact}?body=${encodeURIComponent(sosMessage)}`;
    window.open(smsUrl, "_self");
  };

  const handleShareWhatsApp = () => {
    const waUrl = `https://wa.me/?text=${encodeURIComponent(sosMessage)}`;
    window.open(waUrl, "_blank");
  };

  const handleCallEmergency = () => {
    window.open(`tel:${targetContact}`, "_self");
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-red-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-3xl border-2 border-red-500/80 bg-slate-950/95 p-6 sm:p-8 text-slate-100 shadow-2xl shadow-red-950/80 backdrop-blur-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 h-8 w-8 rounded-full bg-slate-800 border border-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          aria-label="Close SOS"
        >
          <X className="w-4 h-4" />
        </button>

        {/* SOS Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="h-14 w-14 rounded-2xl bg-red-600 border-2 border-red-400 flex items-center justify-center text-white shadow-xl shadow-red-600/40 animate-pulse">
            <AlertOctagon className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-2xl font-black text-red-500 tracking-wider">
              EMERGENCY SOS
            </h3>
            <p className="text-xs text-slate-300">
              Instant coordinates dispatch & hazard alarm
            </p>
          </div>
        </div>

        {/* GPS Coordinates Box */}
        <div className="p-4 rounded-2xl bg-red-950/40 border border-red-500/30 mb-5 space-y-2">
          <div className="flex items-center justify-between text-xs text-red-300 font-bold uppercase">
            <span className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-red-400" />
              Live Emergency Location
            </span>
            <button
              onClick={handleCopyLocation}
              className="text-slate-300 hover:text-white flex items-center gap-1"
            >
              {copied ? <CheckCheck className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? "Copied" : "Copy"}</span>
            </button>
          </div>
          <p className="text-xs text-slate-300 font-mono break-all bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
            {sosMessage}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5">
          {/* Direct Call */}
          <button
            onClick={handleCallEmergency}
            className="w-full h-12 rounded-xl bg-red-600 hover:bg-red-500 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-red-600/40 active:scale-98 transition-all"
          >
            <PhoneCall className="w-5 h-5" />
            <span>Call Emergency Contact ({targetContact})</span>
          </button>

          {/* Quick SMS */}
          <button
            onClick={handleSendSMS}
            className="w-full h-11 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 font-bold text-xs flex items-center justify-center gap-2 transition-all"
          >
            <MessageSquare className="w-4 h-4 text-cyan-400" />
            <span>Send Live SOS SMS</span>
          </button>

          {/* WhatsApp Share */}
          <button
            onClick={handleShareWhatsApp}
            className="w-full h-11 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/40 font-bold text-xs flex items-center justify-center gap-2 transition-all"
          >
            <Share2 className="w-4 h-4" />
            <span>Share Live Location on WhatsApp</span>
          </button>

          {/* Audio Siren Toggle */}
          <button
            onClick={toggleSiren}
            className={`w-full h-11 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border transition-all ${
              isSirenActive
                ? "bg-amber-500 text-slate-950 border-amber-400 animate-pulse"
                : "bg-slate-900/80 text-amber-400 border-amber-500/30 hover:bg-slate-800"
            }`}
          >
            {isSirenActive ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            <span>{isSirenActive ? "Stop Siren Alarm" : "Sound Loud Siren Horn"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
