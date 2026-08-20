"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface VoiceSettings {
	enabled: boolean;
	rate: number;
	pitch: number;
	volume: number;
}

export function useVoiceNavigation() {
	const [voiceEnabled, setVoiceEnabled] = useState(true);
	const [isSupported, setIsSupported] = useState(false);
	const [isSpeaking, setIsSpeaking] = useState(false);
	const speechQueueRef = useRef<string[]>([]);
	const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

	// Check browser support on mount
	useEffect(() => {
		if (typeof window !== "undefined" && "speechSynthesis" in window) {
			setIsSupported(true);

			// Load saved preference
			const saved = localStorage.getItem("voiceNavigationEnabled");
			if (saved !== null) {
				setVoiceEnabled(saved === "true");
			}
		}
	}, []);

	// Save preference when changed
	useEffect(() => {
		if (typeof window !== "undefined") {
			localStorage.setItem(
				"voiceNavigationEnabled",
				String(voiceEnabled),
			);
		}
	}, [voiceEnabled]);

	// Process speech queue
	const processQueue = useCallback(() => {
		if (
			!isSupported ||
			!voiceEnabled ||
			speechQueueRef.current.length === 0
		) {
			setIsSpeaking(false);
			return;
		}

		// Cancel any ongoing speech
		if (window.speechSynthesis.speaking) {
			window.speechSynthesis.cancel();
		}

		const text = speechQueueRef.current.shift()!;
		const utterance = new SpeechSynthesisUtterance(text);

		// Voice settings
		utterance.rate = 1.0; // Normal speed
		utterance.pitch = 1.0; // Normal pitch
		utterance.volume = 1.0; // Full volume
		utterance.lang = "en-US";

		// Event handlers
		utterance.onstart = () => {
			setIsSpeaking(true);
			currentUtteranceRef.current = utterance;
		};

		utterance.onend = () => {
			currentUtteranceRef.current = null;
			// Process next item in queue
			if (speechQueueRef.current.length > 0) {
				setTimeout(processQueue, 300); // Small delay between utterances
			} else {
				setIsSpeaking(false);
			}
		};

		utterance.onerror = (event) => {
			console.error("Speech synthesis error:", event);
			currentUtteranceRef.current = null;
			setIsSpeaking(false);
			// Try next in queue
			if (speechQueueRef.current.length > 0) {
				setTimeout(processQueue, 500);
			}
		};

		window.speechSynthesis.speak(utterance);
	}, [isSupported, voiceEnabled]);

	// Speak text (add to queue)
	const speak = useCallback(
		(text: string, priority: boolean = false) => {
			if (!isSupported || !voiceEnabled || !text) return;

			// Priority messages go to front of queue
			if (priority) {
				speechQueueRef.current.unshift(text);
			} else {
				speechQueueRef.current.push(text);
			}

			// Start processing if not already speaking
			if (!isSpeaking && !window.speechSynthesis.speaking) {
				processQueue();
			}
		},
		[isSupported, voiceEnabled, isSpeaking, processQueue],
	);

	// Stop all speech
	const stopSpeaking = useCallback(() => {
		if (!isSupported) return;

		// Clear queue
		speechQueueRef.current = [];

		// Cancel current utterance
		if (window.speechSynthesis.speaking) {
			window.speechSynthesis.cancel();
		}

		currentUtteranceRef.current = null;
		setIsSpeaking(false);
	}, [isSupported]);

	// Toggle voice on/off
	const toggleVoice = useCallback(() => {
		const newState = !voiceEnabled;
		setVoiceEnabled(newState);

		// Stop speaking if disabling
		if (!newState) {
			stopSpeaking();
		}
	}, [voiceEnabled, stopSpeaking]);

	return {
		speak,
		stopSpeaking,
		toggleVoice,
		voiceEnabled,
		setVoiceEnabled,
		isSupported,
		isSpeaking,
	};
}
