"use client";

interface Route {
	distance: number;
	duration: number;
}

interface RouteAnalysis {
	adjustedDuration?: number;
}

interface RouteSelectorProps {
	routes: Route[];
	routeAnalyses?: RouteAnalysis[];
	selectedIndex: number;
	onSelect: (index: number) => void;
	onClose: () => void;
}

function formatDistance(meters: number): string {
	if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
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

export default function RouteSelector({
	routes,
	routeAnalyses,
	selectedIndex,
	onSelect,
	onClose,
}: RouteSelectorProps) {
	if (!routes || routes.length === 0) return null;

	return (
		<div
			className="route-selector"
			role="region"
			aria-label="Route options"
		>
			<div className="route-selector__header">
				<span className="route-selector__title">
					{routes.length} Route{routes.length > 1 ? "s" : ""}{" "}
					Available
				</span>
				<button
					className="route-selector__close"
					onClick={onClose}
					aria-label="Close route selector"
				>
					✕
				</button>
			</div>

			<div className="route-selector__list">
				{routes.map((route, index) => {
					const isBest = index === 0;
					const isSelected = index === selectedIndex;

					return (
						<button
							key={index}
							className={`route-selector__item ${isSelected ? "selected" : ""} ${isBest ? "best" : ""}`}
							onClick={() => onSelect(index)}
							aria-label={`Route ${index + 1}${isBest ? " (recommended)" : ""}${isSelected ? " (selected)" : ""}`}
						>
							<div className="route-selector__item-header">
								<span className="route-selector__item-number">
									Route {index + 1}
								</span>
								{isBest && (
									<span className="route-selector__badge">
										Recommended
									</span>
								)}
								{isSelected && !isBest && (
									<span className="route-selector__badge route-selector__badge--selected">
										Selected
									</span>
								)}
							</div>

							<div className="route-selector__item-stats">
								<div className="route-selector__stat">
									<span className="route-selector__stat-icon">
										🕐
									</span>
									<div>
										<div>{formatDuration(routeAnalyses?.[index]?.adjustedDuration ?? route.duration)}</div>
										{routeAnalyses?.[index]?.adjustedDuration !== undefined &&
											routeAnalyses[index].adjustedDuration !== route.duration && (
												<div className="route-selector__subtime">
													Base: {formatDuration(route.duration)}
												</div>
											)}
									</div>
								</div>
								<div className="route-selector__stat">
									<span className="route-selector__stat-icon">
										📏
									</span>
									<span>
										{formatDistance(route.distance)}
									</span>
								</div>
							</div>
						</button>
					);
				})}
			</div>
		</div>
	);
}
