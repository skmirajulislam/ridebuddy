"use client";

import React from "react";
import {
  Navigation,
  CornerUpLeft,
  CornerUpRight,
  ArrowUpLeft,
  ArrowUpRight,
  ArrowUp,
  RotateCw,
  Flag,
  X,
  Compass,
  Milestone,
  Clock,
} from "lucide-react";

interface NavigationPanelProps {
	currentStep: {
		maneuver: {
			type: string;
			modifier?: string;
		};
		name: string;
		distance: number;
	} | null;
	distanceToTurn: number;
	totalDistance: number;
	totalDuration: number;
	originalTotalDuration: number;
	onExit: () => void;
}

function renderManeuverIcon(type: string, modifier?: string): React.ReactNode {
	if (type === "depart") return <Compass className="w-7 h-7 text-sky-400 animate-pulse" />;
	if (type === "arrive") return <Flag className="w-7 h-7 text-emerald-400" />;
	if (type === "turn") {
		if (modifier === "left" || modifier === "sharp left") return <CornerUpLeft className="w-7 h-7 text-sky-400" />;
		if (modifier === "right" || modifier === "sharp right") return <CornerUpRight className="w-7 h-7 text-sky-400" />;
		if (modifier === "slight left") return <ArrowUpLeft className="w-7 h-7 text-sky-400" />;
		if (modifier === "slight right") return <ArrowUpRight className="w-7 h-7 text-sky-400" />;
	}
	if (type === "roundabout" || type === "rotary") return <RotateCw className="w-7 h-7 text-amber-400" />;
	if (type === "continue" || type === "merge") return <ArrowUp className="w-7 h-7 text-sky-400" />;
	if (type === "fork") return <ArrowUpRight className="w-7 h-7 text-sky-400" />;
	return <Navigation className="w-7 h-7 text-sky-400" />;
}

function getManeuverText(type: string, modifier?: string): string {
	if (type === "depart") return "Start route";
	if (type === "arrive") return "Arrive at destination";
	if (type === "turn") {
		if (modifier === "left") return "Turn left";
		if (modifier === "right") return "Turn right";
		if (modifier === "sharp left") return "Sharp left";
		if (modifier === "sharp right") return "Sharp right";
		if (modifier === "slight left") return "Slight left";
		if (modifier === "slight right") return "Slight right";
	}
	if (type === "roundabout" || type === "rotary") return "Enter roundabout";
	if (type === "continue") return "Continue straight";
	if (type === "merge") return "Merge";
	if (type === "fork") return "Take fork";
	return "Continue";
}

function formatDistance(meters: number): string {
	if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
	if (meters >= 100) return `${Math.round(meters / 10) * 10} m`;
	return `${Math.round(meters)} m`;
}

function formatDuration(seconds: number): string {
	const mins = Math.round(seconds / 60);
	if (mins >= 60) {
		const h = Math.floor(mins / 60);
		const m = mins % 60;
		return `${h}h ${m}m`;
	}
	return `${mins} min`;
}

export default function NavigationPanel({
	currentStep,
	distanceToTurn,
	totalDistance,
	totalDuration,
	originalTotalDuration,
	onExit,
}: NavigationPanelProps) {
	if (!currentStep) return null;

	const maneuverText = getManeuverText(
		currentStep.maneuver.type,
		currentStep.maneuver.modifier,
	);

	return (
		<div
			className="navigation-panel"
			role="region"
			aria-label="Turn-by-turn navigation"
		>
			{/* Top bar with ETA and exit button */}
			<div className="navigation-panel__header flex items-center justify-between">
				<div className="navigation-panel__eta flex items-center gap-2">
					<span className="navigation-panel__eta-value flex items-center gap-1 font-semibold text-emerald-400">
						<Clock className="w-4 h-4" />
						{formatDuration(totalDuration)}
					</span>
					<span className="navigation-panel__eta-label flex items-center gap-1 text-slate-400">
						<Milestone className="w-3.5 h-3.5" />
						{formatDistance(totalDistance)}
					</span>
					{originalTotalDuration !== totalDuration && (
						<span className="navigation-panel__eta-label text-xs text-slate-500">
							(base {formatDuration(originalTotalDuration)})
						</span>
					)}
				</div>
				<button
					className="navigation-panel__exit flex items-center justify-center w-7 h-7 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors"
					onClick={onExit}
					aria-label="Exit navigation"
				>
					<X className="w-4 h-4" />
				</button>
			</div>

			{/* Main instruction */}
			<div className="navigation-panel__instruction flex items-center gap-4 mt-2">
				<div className="navigation-panel__maneuver flex flex-col items-center">
					<div className="navigation-panel__maneuver-icon flex items-center justify-center w-12 h-12 rounded-2xl bg-sky-500/15 border border-sky-500/30">
						{renderManeuverIcon(currentStep.maneuver.type, currentStep.maneuver.modifier)}
					</div>
					<div className="navigation-panel__maneuver-distance text-xs font-mono font-bold text-sky-400 mt-1">
						{formatDistance(distanceToTurn)}
					</div>
				</div>
				<div className="navigation-panel__details flex-1">
					<div className="navigation-panel__action font-semibold text-base text-slate-100">
						{maneuverText}
					</div>
					{currentStep.name && currentStep.name !== "" && (
						<div className="navigation-panel__street text-xs text-slate-400">
							onto <span className="text-slate-200 font-medium">{currentStep.name}</span>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
