/**
 * Developer utility panel for inspecting and manually triggering registered tours.
 *
 * This component is intended strictly for development / staging environments and
 * should not be shipped to production UI. It offers:
 *  - Listing of all registered tours (`listTours`) with matcher summary.
 *  - Manual start buttons per tour.
 *  - Reset (per tour & all) persistence helpers.
 *  - Quick execution of auto matches (either simultaneously or chained).
 *  - Collapsible floating panel UI (collapsed state stored in localStorage).
 *
 * Styling: Inline styles are applied for isolation; override using `className` / `style`.
 */
import { useEffect, useState } from "react";
import {
	chainAutoMatches,
	clearTourProgress,
	isTourCompleted,
	listTours,
	resetAllTourProgress,
	startAutoMatches,
} from "./orchestrator";
import { startWalkthrough } from "./walkthrough";

/** Props for {@link WalkthroughDevPanel}. */
export interface DevPanelProps {
	/** Current path used when executing auto match logic (defaults to `window.location.pathname`). */
	pathname?: string;
	/** Extra class names for outer wrapper (use to override theme). */
	className?: string;
	/** Inline style overrides. */
	style?: React.CSSProperties;
	/** If true, clicking the run button chains matches sequentially instead of starting them concurrently. */
	chainMatches?: boolean;
}

/**
 * Lightweight developer panel to inspect registered tours, run them manually, and reset progress.
 * Intended only for local development / staging environments.
 */
/**
 * Floating development aid component.
 *
 * Example:
 * ```tsx
 * {process.env.NODE_ENV !== 'production' && <WalkthroughDevPanel />}
 * ```
 */
export function WalkthroughDevPanel({
  pathname = window.location.pathname,
  className = "",
  style,
  chainMatches,
}: DevPanelProps) {
	const [version, setVersion] = useState(0);
	const [collapsed, setCollapsed] = useState<boolean>(() => {
		try {
			return localStorage.getItem("__wt_devpanel_collapsed") === "1";
		} catch {
			return false;
		}
	});

	useEffect(() => {
		try {
			localStorage.setItem("__wt_devpanel_collapsed", collapsed ? "1" : "0");
		} catch {}
	}, [collapsed]);

	const tours = listTours();

	const forceRefresh = () => setVersion((v) => v + 1);

	const runMatches = async () => {
		if (chainMatches) {
			await chainAutoMatches(pathname);
		} else {
			await startAutoMatches({ pathname });
		}
		forceRefresh();
	};

	const handleStart = (id: string) => {
		const t = tours.find((t) => t.id === id);
		if (t) {
			startWalkthrough(t.steps, { tourId: t.id, ...t.options });
		}
	};

	const resetTour = (id: string) => {
		clearTourProgress(id);
		forceRefresh();
	};

	const resetAll = () => {
		resetAllTourProgress();
		forceRefresh();
	};

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
				Tours ({tours.length}) ▴
			</button>
		);
	}

	return (
		<div
			className={"walkthrough-dev-panel " + className}
			style={{
				position: "fixed",
				bottom: 16,
				right: 16,
				width: 320,
				maxHeight: "60vh",
				overflowY: "auto",
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
						style={{
							background: "#222",
							color: "#fff",
							border: "1px solid #444",
							borderRadius: 4,
							padding: "2px 6px",
							cursor: "pointer",
						}}
						title="Minimize"
					>
						_
					</button>
					<button
						type="button"
						onClick={resetAll}
						style={{
							background: "#222",
							color: "#fff",
							border: "1px solid #444",
							borderRadius: 4,
							padding: "2px 6px",
							cursor: "pointer",
						}}
					>
						Reset
					</button>
				</div>
			</div>
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
					}}
				>
					{chainMatches ? "Chain Matches" : "Run Matches"}
				</button>
				<button
					type="button"
					onClick={forceRefresh}
					style={{
						background: "#222",
						color: "#fff",
						border: "1px solid #444",
						borderRadius: 4,
						padding: "4px 6px",
						cursor: "pointer",
					}}
				>
					Refresh
				</button>
			</div>
			{tours.length === 0 && (
				<div style={{ opacity: 0.7 }}>No tours registered.</div>
			)}
			<ul
				style={{
					listStyle: "none",
					margin: 0,
					padding: 0,
					display: "flex",
					flexDirection: "column",
					gap: 8,
				}}
			>
				{tours.map((t) => {
					const completed = isTourCompleted(t.id);
					return (
						<li
							key={t.id}
							style={{
								border: "1px solid #333",
								borderRadius: 6,
								padding: 8,
								background: "#1c1c1c",
							}}
						>
							<div
								style={{
									display: "flex",
									justifyContent: "space-between",
									alignItems: "center",
									marginBottom: 4,
								}}
							>
								<span style={{ fontWeight: 600 }}>{t.id}</span>
								<span style={{ fontSize: 10, opacity: 0.7 }}>
									{completed ? "completed" : "pending"}
								</span>
							</div>
							<div style={{ fontSize: 10, opacity: 0.7, marginBottom: 4 }}>
								match:{" "}
								{typeof t.match === "string"
									? t.match
									: t.match instanceof RegExp
										? t.match.toString()
										: "fn"}
							</div>
							<div style={{ display: "flex", gap: 6 }}>
								<button
									type="button"
									onClick={() => handleStart(t.id)}
									style={{
										flex: 1,
										background: "#10b981",
										color: "#fff",
										border: "none",
										borderRadius: 4,
										padding: "4px 6px",
										cursor: "pointer",
									}}
								>
									Start
								</button>
								<button
									type="button"
									onClick={() => resetTour(t.id)}
									style={{
										background: "#dc2626",
										color: "#fff",
										border: "none",
										borderRadius: 4,
										padding: "4px 6px",
										cursor: "pointer",
									}}
								>
									Reset
								</button>
							</div>
						</li>
					);
				})}
			</ul>
		</div>
	);
}

export default WalkthroughDevPanel;
