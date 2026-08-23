"use client";

// Shared singleton AudioContext for ultra-low latency & reliable mobile playback
let sharedAudioContext: AudioContext | null = null;
let isAudioUnlocked = false;

export function getSharedAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;

  if (!sharedAudioContext) {
    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        sharedAudioContext = new AudioContextClass();
      }
    } catch {
      // AudioContext not supported
    }
  }

  if (sharedAudioContext && sharedAudioContext.state === "suspended") {
    sharedAudioContext.resume().catch(() => {});
  }

  return sharedAudioContext;
}

/**
 * Unlocks Web Audio API and SpeechSynthesis on first user touch/click.
 * Mandatory on iOS Safari, Android Chrome, and PWA standalone mode due to mobile autoplay restrictions.
 */
export function unlockMobileAudioAndSpeech(): void {
  if (typeof window === "undefined" || isAudioUnlocked) return;

  const unlockHandler = () => {
    isAudioUnlocked = true;

    // 1. Unlock Web Audio Context
    try {
      const ctx = getSharedAudioContext();
      if (ctx) {
        if (ctx.state === "suspended") {
          ctx.resume().catch(() => {});
        }
        // Play a zero-volume buffer to permanently clear iOS/Android gesture lock
        const buffer = ctx.createBuffer(1, 1, 22050);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start(0);
      }
    } catch {
      // ignore
    }

    // 2. Unlock SpeechSynthesis on iOS / Android
    try {
      if ("speechSynthesis" in window) {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
        // Silent utterance to unlock speech queue
        const silentUtterance = new SpeechSynthesisUtterance("");
        silentUtterance.volume = 0;
        window.speechSynthesis.speak(silentUtterance);
      }
    } catch {
      // ignore
    }

    // Remove listeners once unlocked
    window.removeEventListener("touchstart", unlockHandler);
    window.removeEventListener("touchend", unlockHandler);
    window.removeEventListener("click", unlockHandler);
    window.removeEventListener("keydown", unlockHandler);
  };

  window.addEventListener("touchstart", unlockHandler, { once: true, passive: true });
  window.addEventListener("touchend", unlockHandler, { once: true, passive: true });
  window.addEventListener("click", unlockHandler, { once: true, passive: true });
  window.addEventListener("keydown", unlockHandler, { once: true, passive: true });
}

// Retain active utterances in memory to prevent WebKit garbage-collection bug
const globalUtterances = new Set<SpeechSynthesisUtterance>();

/**
 * Universal Mobile-Ready Text-To-Speech with automatic voice selection,
 * WebKit unpause, and audio chime fallback.
 */
export function speakText(
  text: string,
  options?: { rate?: number; pitch?: number; priority?: boolean }
): void {
  if (typeof window === "undefined") return;

  // Always play the melodic alert chime so riders hear it even if TTS is muted
  playHazardChime();

  if (!("speechSynthesis" in window)) return;

  try {
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }

    if (options?.priority) {
      window.speechSynthesis.cancel();
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = options?.rate ?? 1.0;
    utterance.pitch = options?.pitch ?? 1.0;
    utterance.volume = 1.0;

    // Pick natural English voice if available
    const voices = window.speechSynthesis.getVoices();
    if (voices && voices.length > 0) {
      const preferred =
        voices.find(
          (v) =>
            v.lang.startsWith("en") &&
            (v.name.includes("Natural") ||
              v.name.includes("Google") ||
              v.name.includes("Samantha") ||
              v.name.includes("Daniel") ||
              v.name.includes("Karen") ||
              v.name.includes("Siri"))
        ) ||
        voices.find((v) => v.lang.startsWith("en")) ||
        voices[0];

      if (preferred) utterance.voice = preferred;
    }

    globalUtterances.add(utterance);

    utterance.onend = () => {
      globalUtterances.delete(utterance);
    };
    utterance.onerror = () => {
      globalUtterances.delete(utterance);
    };

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn("[Speech] Synthesis speak error:", err);
  }
}

/**
 * High-visibility 2-tone melodic hazard chime synthesized via Web Audio API.
 * Works reliably on all smartphones, tablets, and desktop browsers.
 */
export function playHazardChime(): void {
  try {
    const ctx = getSharedAudioContext();
    if (!ctx) return;

    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(587.33, now); // D5
    osc.frequency.setValueAtTime(880.0, now + 0.1); // A5

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.3, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.38);
  } catch {
    // audio context blocked
  }
}
