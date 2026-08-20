"use client";

import React from "react";
import { Mic, MicOff, Volume2, VolumeX, Sparkles } from "lucide-react";

interface VoiceAssistantHUDProps {
  isListening: boolean;
  isSpeaking: boolean;
  transcript: string;
  voiceEnabled: boolean;
  onToggleListening: () => void;
  onToggleMute: () => void;
}

export default function VoiceAssistantHUD({
  isListening,
  isSpeaking,
  transcript,
  voiceEnabled,
  onToggleListening,
  onToggleMute,
}: VoiceAssistantHUDProps) {
  return (
    <div className="flex items-center gap-2">
      {/* Listening Transcript Banner if active */}
      {isListening && transcript && (
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/90 border border-cyan-500/40 text-cyan-300 text-xs shadow-lg backdrop-blur-md animate-in fade-in">
          <Sparkles className="w-3.5 h-3.5 animate-pulse text-cyan-400" />
          <span className="max-w-[180px] truncate">&ldquo;{transcript}&rdquo;</span>
        </div>
      )}

      {/* Mic Toggle Button */}
      <button
        onClick={onToggleListening}
        className={`relative h-10 w-10 rounded-full flex items-center justify-center transition-all duration-200 shadow-lg ${
          isListening
            ? "bg-gradient-to-tr from-cyan-500 to-blue-600 text-white border-2 border-cyan-300 shadow-cyan-500/40 scale-105"
            : "bg-slate-900/80 text-slate-400 hover:text-white border border-slate-700/80 hover:border-slate-500"
        }`}
        title={isListening ? "Stop Voice Assistant" : "Activate Hands-Free Voice Assistant"}
        aria-label="Voice Assistant Toggle"
      >
        {isListening ? (
          <>
            <span className="absolute -inset-1 rounded-full bg-cyan-500/30 animate-ping" />
            <Mic className="w-4 h-4 relative z-10 animate-bounce" />
          </>
        ) : (
          <MicOff className="w-4 h-4" />
        )}
      </button>

      {/* TTS Mute/Unmute Button */}
      <button
        onClick={onToggleMute}
        className={`h-10 w-10 rounded-full flex items-center justify-center transition-all duration-200 shadow-lg ${
          voiceEnabled
            ? "bg-slate-900/80 text-cyan-400 border border-cyan-500/30 hover:border-cyan-400"
            : "bg-slate-900/80 text-slate-500 border border-slate-800 hover:border-slate-700"
        } ${isSpeaking ? "ring-2 ring-emerald-400" : ""}`}
        title={voiceEnabled ? "Mute Voice Co-Pilot" : "Unmute Voice Co-Pilot"}
        aria-label="Voice Co-Pilot Mute Toggle"
      >
        {voiceEnabled ? (
          <Volume2 className={`w-4 h-4 ${isSpeaking ? "animate-pulse text-emerald-400" : ""}`} />
        ) : (
          <VolumeX className="w-4 h-4" />
        )}
      </button>
    </div>
  );
}
