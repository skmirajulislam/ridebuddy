/**
 * Navigation instruction formatting utilities
 * Converts maneuver data into natural-sounding voice instructions
 */

interface Maneuver {
	type: string;
	modifier?: string;
	location: [number, number];
}

interface RouteStep {
	maneuver: Maneuver;
	name?: string;
	distance: number;
	duration: number;
}

/**
 * Format distance in natural language
 */
export function formatDistance(meters: number): string {
	if (meters >= 1000) {
		const km = (meters / 1000).toFixed(1);
		return `${km} kilometer${km === "1.0" ? "" : "s"}`;
	}

	const roundedMeters = Math.round(meters / 10) * 10; // Round to nearest 10m
	return `${roundedMeters} meters`;
}

/**
 * Format short distance for immediate instructions
 */
export function formatShortDistance(meters: number): string {
	if (meters < 25) return "now";
	if (meters < 100) return `in ${Math.round(meters / 10) * 10} meters`;
	return `in ${Math.round(meters)}  meters`;
}

/**
 * Convert maneuver type and modifier to natural instruction
 */
export function getManeuverInstruction(maneuver: Maneuver): string {
	const { type, modifier } = maneuver;

	// Handle special maneuver types
	switch (type) {
		case "depart":
			return "Head";
		case "arrive":
			return "You have arrived";
		case "merge":
			return "Merge";
		case "on ramp":
			return "Take the ramp";
		case "off ramp":
			return "Take the exit";
		case "fork":
			return modifier ? `Keep ${modifier}` : "Stay";
		case "end of road":
			return "At the end of the road, turn";
		case "continue":
			return "Continue";
		case "roundabout":
		case "rotary":
			return "Enter the roundabout and take exit";
		case "roundabout turn":
			return "At the roundabout, turn";
		case "notification":
			return "Continue";
		case "new name":
			return "Continue onto";
		case "turn":
		case "ramp":
			if (modifier === "left") return "Turn left";
			if (modifier === "right") return "Turn right";
			if (modifier === "slight left") return "Bear left";
			if (modifier === "slight right") return "Bear right";
			if (modifier === "sharp left") return "Make a sharp left";
			if (modifier === "sharp right") return "Make a sharp right";
			if (modifier === "uturn") return "Make a U-turn";
			return "Turn";
		default:
			// Generic instruction based on modifier
			if (modifier === "left") return "Turn left";
			if (modifier === "right") return "Turn right";
			if (modifier === "straight") return "Go straight";
			return "Continue";
	}
}

/**
 * Format complete turn instruction for voice
 */
export function formatTurnInstruction(
	step: RouteStep,
	distanceToTurn: number,
	includeDistance: boolean = true,
): string {
	const instruction = getManeuverInstruction(step.maneuver);
	const streetName = step.name && step.name !== "unknown" ? step.name : "";

	// Arrival instruction
	if (step.maneuver.type === "arrive") {
		return "You have arrived at your destination";
	}

	// Build instruction parts
	const parts: string[] = [];

	// Add distance prefix for far announcements
	if (includeDistance && distanceToTurn > 50) {
		parts.push(`In ${formatDistance(distanceToTurn)},`);
	} else if (includeDistance && distanceToTurn > 0) {
		const shortDist = formatShortDistance(distanceToTurn);
		if (shortDist !== "now") {
			parts.push(shortDist + ",");
		}
	}

	// Add instruction
	parts.push(instruction.toLowerCase());

	// Add street name if available
	if (streetName) {
		if (
			instruction.toLowerCase().includes("onto") ||
			instruction.toLowerCase().includes("continue")
		) {
			parts.push(streetName);
		} else {
			parts.push(`onto ${streetName}`);
		}
	}

	return parts.join(" ").trim();
}

/**
 * Format hazard alert for voice
 */
export function formatHazardAlert(
	hazardType: string,
	distanceMeters: number,
): string {
	const formattedType =
		hazardType.charAt(0).toUpperCase() + hazardType.slice(1);
	const distance = formatDistance(distanceMeters);

	return `${formattedType} reported ahead in ${distance}`;
}

/**
 * Get distance thresholds for turn announcements (in meters)
 */
export const TURN_ALERT_DISTANCES = [500, 200, 100, 50] as const;

/**
 * Get the appropriate announcement distance based on current distance
 */
export function getNextAnnouncementDistance(
	currentDistance: number,
	announcedDistances: Set<number>,
): number | null {
	// Find the largest threshold that:
	// 1. Is less than current distance
	// 2. Hasn't been announced yet
	for (const threshold of TURN_ALERT_DISTANCES) {
		if (
			currentDistance >= threshold &&
			!announcedDistances.has(threshold)
		) {
			return threshold;
		}
	}

	// If we're close (< 50m) and haven't announced immediate turn
	if (
		currentDistance < 50 &&
		currentDistance > 10 &&
		!announcedDistances.has(0)
	) {
		return 0; // Immediate turn
	}

	return null;
}
