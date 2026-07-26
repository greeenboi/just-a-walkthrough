/**
 * Developer inspector panel for walkthrough tours — a Vue-devtools-style tool for local
 * development / staging (do not ship to production UI).
 *
 * Tabs:
 *  - **Tours**: list registered tours, start/restart/reset, jump to any step of the
 *    running tour, and select a tour to configure.
 *  - **Wireframe**: an SVG graph of every tour's step flow (grouped by match); the live
 *    step is highlighted and nodes of a running tour are clickable to jump.
 *  - **Config**: live-edit the selected tour's options (theme, colors, behavior). Edits
 *    apply immediately to a running instance and persist across restarts/reloads.
 *
 * It reads live state from the core active-instances registry, so it reflects tours
 * started by any means (provider, orchestrator, click trigger, or direct call).
 */
import { useEffect, useState } from "react";
import {
	chainAutoMatches,
	clearTourProgress,
	listTours,
	resetAllTourProgress,
	startAutoMatches,
	startTourById,
	updateTourOptions,
} from "../orchestrator";
import type { WalkthroughOptions } from "../walkthrough";
import { ConfigEditor } from "./ConfigEditor";
import { buildTourGraph } from "./graph";
import { TourList } from "./TourList";
import { useActiveInstance } from "./useActiveInstance";
import { WireframeCanvas } from "./WireframeCanvas";

/** Props for {@link WalkthroughDevPanel}. */
export interface DevPanelProps {
	/** Current path used when executing auto match logic (defaults to `window.location.pathname`). */
	pathname?: string;
	/** Extra class names for outer wrapper (use to override theme). */
	className?: string;
	/** Inline style overrides. */
	style?: React.CSSProperties;
	/** If true, the run button chains matches sequentially instead of starting them concurrently. */
	chainMatches?: boolean;
}

type Tab = "tours" | "wireframe" | "config";

const TWEAK_PREFIX = "__wt_devpanel_tweaks:";

const smallBtn: React.CSSProperties = {
	background: "#222",
	color: "#fff",
	border: "1px solid #444",
	borderRadius: 4,
	padding: "2px 6px",
	cursor: "pointer",
	fontSize: 12,
};

export function WalkthroughDevPanel({
	pathname,
	className = "",
	style,
	chainMatches,
}: DevPanelProps) {
	const [version, setVersion] = useState(0);
	const [tab, setTab] = useState<Tab>("tours");
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [collapsed, setCollapsed] = useState<boolean>(() => {
		try {
			return localStorage.getItem("__wt_devpanel_collapsed") === "1";
		} catch {
			return false;
		}
	});

	const { instance, snapshot } = useActiveInstance();

	useEffect(() => {
		try {
			localStorage.setItem("__wt_devpanel_collapsed", collapsed ? "1" : "0");
		} catch {}
	}, [collapsed]);

	// Re-apply any persisted config tweaks to the registered tours on mount so restarts
	// pick them up even after a page reload.
	useEffect(() => {
		for (const t of listTours()) {
			try {
				const raw = localStorage.getItem(`${TWEAK_PREFIX}${t.id}`);
				if (raw) updateTourOptions(t.id, JSON.parse(raw) as WalkthroughOptions);
			} catch {}
		}
		setVersion((v) => v + 1);
	}, []);

	const forceRefresh = () => setVersion((v) => v + 1);

	// Recomputed each render (cheap): forceRefresh / snapshot changes trigger re-render.
	const tours = listTours();

	// Default selection: the running tour's registered id, else the first tour.
	const pickSelected = () => {
		if (selectedId && tours.some((t) => t.id === selectedId)) return selectedId;
		if (snapshot?.id) {
			const match = tours.find(
				(t) => (t.options?.tourId || t.id) === snapshot.id,
			);
			if (match) return match.id;
		}
		return tours[0]?.id ?? null;
	};
	const effectiveSelected = pickSelected();

	const effectivePathname =
		pathname ||
		(typeof window !== "undefined" ? window.location.pathname : "/");

	const runMatches = async () => {
		if (chainMatches) await chainAutoMatches(effectivePathname);
		else await startAutoMatches({ pathname: effectivePathname });
		forceRefresh();
	};

	const handleStart = (id: string) => {
		try {
			startTourById(id);
		} catch {}
		forceRefresh();
	};

	const resetTour = (id: string) => {
		clearTourProgress(id);
		forceRefresh();
	};

	const resetAll = () => {
		resetAllTourProgress();
		forceRefresh();
	};

	const graph = buildTourGraph(tours, snapshot);
	const runningTourIds = snapshot?.active
		? tours
				.filter((t) => (t.options?.tourId || t.id) === snapshot.id)
				.map((t) => t.id)
		: [];

	if (collapsed) {
		return (
			<button
				type="button"
				onClick={() => setCollapsed(false)}
				className={`walkthrough-dev-panel-collapsed ${className}`}
				style={{
					position: "fixed",
					bottom: 16,
					right: 16,
					zIndex: 999999,
					background: "#111",
					color: "#fff",
					border: "1px solid #333",
					borderRadius: 20,
					padding: "6px 12px",
					fontSize: 12,
					fontFamily: "ui-sans-serif, system-ui, sans-serif",
					cursor: "pointer",
					boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
					...style,
				}}
				title="Expand walkthrough dev panel"
			>
				Tours ({tours.length}){snapshot?.active ? " ●" : ""} ▴
			</button>
		);
	}

	return (
		<div
			className={`walkthrough-dev-panel ${className}`}
			style={{
				position: "fixed",
				bottom: 16,
				right: 16,
				width: tab === "wireframe" ? 520 : 340,
				maxHeight: "70vh",
				overflow: "auto",
				background: "#111",
				color: "#fff",
				fontFamily: "ui-sans-serif, system-ui, sans-serif",
				fontSize: 12,
				border: "1px solid #333",
				borderRadius: 8,
				padding: 12,
				boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
				zIndex: 999999,
				...style,
			}}
			data-refresh={version}
		>
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					marginBottom: 8,
				}}
			>
				<strong style={{ fontSize: 13 }}>Walkthrough Dev Panel</strong>
				<div style={{ display: "flex", gap: 6 }}>
					<button
						type="button"
						onClick={() => setCollapsed(true)}
						style={smallBtn}
						title="Minimize"
					>
						_
					</button>
					<button type="button" onClick={resetAll} style={smallBtn}>
						Reset all
					</button>
				</div>
			</div>

			{/* Tabs */}
			<div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
				{(["tours", "wireframe", "config"] as Tab[]).map((t) => (
					<button
						key={t}
						type="button"
						onClick={() => setTab(t)}
						style={{
							...smallBtn,
							flex: 1,
							background: tab === t ? "#2563eb" : "#222",
							textTransform: "capitalize",
						}}
					>
						{t}
					</button>
				))}
			</div>

			{/* Actions */}
			<div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
				<button
					type="button"
					onClick={runMatches}
					style={{
						flex: 1,
						background: "#2563eb",
						color: "#fff",
						border: "none",
						borderRadius: 4,
						padding: "4px 6px",
						cursor: "pointer",
						fontSize: 12,
					}}
				>
					{chainMatches ? "Chain Matches" : "Run Matches"}
				</button>
				<button type="button" onClick={forceRefresh} style={smallBtn}>
					Refresh
				</button>
			</div>

			{tab === "tours" && (
				<TourList
					tours={tours}
					snapshot={snapshot}
					instance={instance}
					selectedId={effectiveSelected}
					onSelect={setSelectedId}
					onStart={handleStart}
					onReset={resetTour}
				/>
			)}

			{tab === "wireframe" &&
				(tours.length ? (
					<div style={{ overflow: "auto", maxWidth: "100%" }}>
						<WireframeCanvas
							model={graph}
							runningTourIds={runningTourIds}
							onNodeClick={(n) => instance?.go(n.index)}
						/>
					</div>
				) : (
					<div style={{ opacity: 0.7 }}>No tours registered.</div>
				))}

			{tab === "config" && (
				<ConfigEditor
					tours={tours}
					tourId={effectiveSelected}
					instance={instance}
					snapshot={snapshot}
					onChange={forceRefresh}
				/>
			)}
		</div>
	);
}

export default WalkthroughDevPanel;
