"use client";

import React from "react";
import { Clock, Milestone, Sparkles, X, Check, Route as RouteIcon } from "lucide-react";

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
			<div className="route-selector__header flex items-center justify-between">
				<div className="flex items-center gap-2">
					<RouteIcon className="w-4 h-4 text-sky-400" />
					<span className="route-selector__title font-semibold text-sm">
						{routes.length} Route{routes.length > 1 ? "s" : ""}{" "}
						Available
					</span>
				</div>
				<button
					className="route-selector__close flex items-center justify-center w-6 h-6 rounded-full hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
					onClick={onClose}
					aria-label="Close route selector"
				>
					<X className="w-4 h-4" />
				</button>
			</div>

			<div className="route-selector__list flex flex-col gap-2 mt-2">
				{routes.map((route, index) => {
					const isBest = index === 0;
					const isSelected = index === selectedIndex;

					return (
						<button
							key={index}
							className={`route-selector__item ${isSelected ? "selected" : ""} ${isBest ? "best" : ""} p-3 rounded-xl transition-all text-left`}
							onClick={() => onSelect(index)}
							aria-label={`Route ${index + 1}${isBest ? " (recommended)" : ""}${isSelected ? " (selected)" : ""}`}
						>
							<div className="route-selector__item-header flex items-center justify-between">
								<span className="route-selector__item-number font-semibold text-xs text-slate-200">
									Route {index + 1}
								</span>
								{isBest && (
									<span className="route-selector__badge flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
										<Sparkles className="w-3 h-3" />
										Recommended
									</span>
								)}
								{isSelected && !isBest && (
									<span className="route-selector__badge route-selector__badge--selected flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-400 border border-sky-500/30">
										<Check className="w-3 h-3" />
										Selected
									</span>
								)}
							</div>

							<div className="route-selector__item-stats flex items-center gap-4 mt-2">
								<div className="route-selector__stat flex items-center gap-1.5 text-xs text-slate-300">
									<Clock className="w-3.5 h-3.5 text-sky-400" />
									<div>
										<div className="font-semibold text-slate-100">{formatDuration(routeAnalyses?.[index]?.adjustedDuration ?? route.duration)}</div>
										{routeAnalyses?.[index]?.adjustedDuration !== undefined &&
											routeAnalyses[index].adjustedDuration !== route.duration && (
												<div className="route-selector__subtime text-[10px] text-slate-500">
													Base: {formatDuration(route.duration)}
												</div>
											)}
									</div>
								</div>
								<div className="route-selector__stat flex items-center gap-1.5 text-xs text-slate-300">
									<Milestone className="w-3.5 h-3.5 text-emerald-400" />
									<span className="font-semibold text-slate-100">
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
