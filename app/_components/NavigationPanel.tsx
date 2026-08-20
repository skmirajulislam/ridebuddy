"use client";

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

function getManeuverIcon(type: string, modifier?: string): string {
	if (type === "depart") return "🚀";
	if (type === "arrive") return "🏁";
	if (type === "turn") {
		if (modifier === "left") return "⬅️";
		if (modifier === "right") return "➡️";
		if (modifier === "sharp left") return "↙️";
		if (modifier === "sharp right") return "↘️";
		if (modifier === "slight left") return "↖️";
		if (modifier === "slight right") return "↗️";
	}
	if (type === "roundabout" || type === "rotary") return "↪️";
	if (type === "continue" || type === "merge") return "⬆️";
	if (type === "fork") return "↗️";
	return "➡️";
}

function getManeuverText(type: string, modifier?: string): string {
	if (type === "depart") return "Start";
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
	if (type === "continue") return "Continue";
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

	const maneuverIcon = getManeuverIcon(
		currentStep.maneuver.type,
		currentStep.maneuver.modifier,
	);
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
			<div className="navigation-panel__header">
				<div className="navigation-panel__eta">
					<span className="navigation-panel__eta-value">
						{formatDuration(totalDuration)}
					</span>
					<span className="navigation-panel__eta-label">
						· {formatDistance(totalDistance)}
					</span>
					{originalTotalDuration !== totalDuration && (
						<span className="navigation-panel__eta-label">
							(base {formatDuration(originalTotalDuration)})
						</span>
					)}
				</div>
				<button
					className="navigation-panel__exit"
					onClick={onExit}
					aria-label="Exit navigation"
				>
					✕
				</button>
			</div>

			{/* Main instruction */}
			<div className="navigation-panel__instruction">
				<div className="navigation-panel__maneuver">
					<div className="navigation-panel__maneuver-icon">
						{maneuverIcon}
					</div>
					<div className="navigation-panel__maneuver-distance">
						{formatDistance(distanceToTurn)}
					</div>
				</div>
				<div className="navigation-panel__details">
					<div className="navigation-panel__action">
						{maneuverText}
					</div>
					{currentStep.name && currentStep.name !== "" && (
						<div className="navigation-panel__street">
							onto {currentStep.name}
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
