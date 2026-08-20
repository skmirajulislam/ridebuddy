"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";

interface SpeechRecognitionEvent {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: {
      [index: number]: {
        transcript: string;
      };
    };
  };
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  }
}

interface UseVoiceAssistantParams {
  onVoiceReport?: (hazardType: string) => Promise<void> | void;
  onVoiceCommand?: (command: string, arg?: string) => void;
}

export function useVoiceAssistant({
  onVoiceReport,
  onVoiceCommand,
}: UseVoiceAssistantParams = {}) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported] = useState(() => {
    if (typeof window === "undefined") return false;
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  });
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [voiceEnabled, setVoiceEnabled] = useState(true);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const shouldListenRef = useRef(false);

  // Text-To-Speech Co-Pilot
  const speak = useCallback(
    (text: string, priority = false) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window) || !voiceEnabled) {
        return;
      }

      try {
        if (priority) {
          window.speechSynthesis.cancel();
        }

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.05;
        utterance.pitch = 1.0;

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);

        window.speechSynthesis.speak(utterance);
      } catch {
        setIsSpeaking(false);
      }
    },
    [voiceEnabled]
  );

  // Parse voice text intent
  const parseVoiceIntent = useCallback(
    (text: string) => {
      if (!text) return;

      // 1. Hazard Reporting Keywords
      if (text.includes("pothole") || text.includes("crater") || text.includes("hole in road")) {
        speak("Pothole reported on radar. Safe riding!", true);
        toast.success("Voice Report: Pothole detected", { icon: "🎙️" });
        onVoiceReport?.("pothole");
        return;
      }

      if (text.includes("flood") || text.includes("water") || text.includes("waterlog")) {
        speak("Waterlogging reported on radar.", true);
        toast.success("Voice Report: Flood/Waterlogging detected", { icon: "🎙️" });
        onVoiceReport?.("flood");
        return;
      }

      if (text.includes("accident") || text.includes("crash") || text.includes("collision")) {
        speak("Accident hazard reported on radar.", true);
        toast.success("Voice Report: Accident detected", { icon: "🎙️" });
        onVoiceReport?.("accident");
        return;
      }

      if (text.includes("roadblock") || text.includes("barricade") || text.includes("road closed")) {
        speak("Road block reported on radar.", true);
        toast.success("Voice Report: Road Block detected", { icon: "🎙️" });
        onVoiceReport?.("roadblock");
        return;
      }

      if (text.includes("speed breaker") || text.includes("speed bump") || text.includes("bump")) {
        speak("Unmarked speed bump reported on radar.", true);
        toast.success("Voice Report: Speed Bump detected", { icon: "🎙️" });
        onVoiceReport?.("speed braker");
        return;
      }

      if (text.includes("debris") || text.includes("stone") || text.includes("rock")) {
        speak("Debris reported on radar.", true);
        toast.success("Voice Report: Debris detected", { icon: "🎙️" });
        onVoiceReport?.("debris");
        return;
      }

      if (text.includes("dark") || text.includes("no light") || text.includes("light")) {
        speak("Low visibility zone reported.", true);
        toast.success("Voice Report: Low light detected", { icon: "🎙️" });
        onVoiceReport?.("low light");
        return;
      }

      // 2. Navigation Commands
      if (text.includes("stop navigation") || text.includes("cancel navigation") || text.includes("exit navigation")) {
        speak("Navigation ended.");
        onVoiceCommand?.("stop_navigation");
        return;
      }

      if (text.includes("mute")) {
        setVoiceEnabled(false);
        speak("Voice co-pilot muted.");
        return;
      }

      if (text.includes("unmute")) {
        setVoiceEnabled(true);
        speak("Voice co-pilot unmuted.");
        return;
      }
    },
    [speak, onVoiceReport, onVoiceCommand]
  );

  // Initialize Speech Recognition & Synthesis support
  useEffect(() => {
    if (typeof window === "undefined") return;

    const SpeechRecognitionAPI =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (SpeechRecognitionAPI) {
      const recognition = new SpeechRecognitionAPI();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onend = () => {
        setIsListening(false);
        // Auto-restart if user kept voice assistant enabled
        if (shouldListenRef.current) {
          try {
            recognition.start();
          } catch {
            // ignore
          }
        }
      };

      recognition.onerror = (e) => {
        if (e.error !== "no-speech" && e.error !== "aborted") {
          console.warn("[Voice Assistant] Recognition notice:", e.error);
        }
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const lastIndex = event.results.length - 1;
        const rawText = event.results[lastIndex][0]?.transcript?.trim().toLowerCase() || "";
        setTranscript(rawText);

        parseVoiceIntent(rawText);
      };

      recognitionRef.current = recognition;
    }
  }, [parseVoiceIntent]);

  const startListening = useCallback(() => {
    if (!recognitionRef.current) return;
    shouldListenRef.current = true;
    try {
      recognitionRef.current.start();
      speak("RideBuddy Voice Assistant active. Say report pothole or accident anytime.");
    } catch {
      // already active
    }
  }, [speak]);

  const stopListening = useCallback(() => {
    shouldListenRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }
    setIsListening(false);
  }, []);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  return {
    isListening,
    isSpeaking,
    isSupported,
    transcript,
    voiceEnabled,
    setVoiceEnabled,
    startListening,
    stopListening,
    toggleListening,
    speak,
  };
}
