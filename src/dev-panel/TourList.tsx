/**
 * Registered-tour list for the dev panel: per-tour Start / Reset, completed/pending and
 * running badges, selection (drives the Config tab), and jump-to-step chips for the
 * currently running tour.
 */
import type { ActiveTourSnapshot } from "../active-registry";
import { isTourCompleted, type RegisteredTour } from "../orchestrator";
import type { Walkthrough } from "../walkthrough";
import { matchLabel } from "./graph";

export interface TourListProps {
	tours: RegisteredTour[];
	snapshot: ActiveTourSnapshot | null;
	instance: Walkthrough | null;
	selectedId: string | null;
	onSelect: (id: string) => void;
	onStart: (id: string) => void;
	onReset: (id: string) => void;
}

const btn = (bg: string): React.CSSProperties => ({
	background: bg,
	color: "#fff",
	border: "none",
	borderRadius: 4,
	padding: "4px 6px",
	cursor: "pointer",
	fontSize: 12,
});

export function TourList({
	tours,
	snapshot,
	instance,
	selectedId,
	onSelect,
	onStart,
	onReset,
}: TourListProps) {
	if (!tours.length) {
		return <div style={{ opacity: 0.7 }}>No tours registered.</div>;
	}
	return (
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
				const resolvedId = t.options?.tourId || t.id;
				const completed = isTourCompleted(resolvedId);
				const running = !!snapshot?.active && snapshot.id === resolvedId;
				const selected = selectedId === t.id;
				return (
					<li
						key={t.id}
						style={{
							border: `1px solid ${selected ? "#2563eb" : "#333"}`,
							borderRadius: 6,
							padding: 8,
							background: "#1c1c1c",
						}}
					>
						<button
							type="button"
							onClick={() => onSelect(t.id)}
							style={{
								all: "unset",
								display: "flex",
								justifyContent: "space-between",
								alignItems: "center",
								width: "100%",
								marginBottom: 4,
								cursor: "pointer",
								boxSizing: "border-box",
							}}
						>
							<span style={{ fontWeight: 600 }}>{t.id}</span>
							<span style={{ fontSize: 10, opacity: 0.8 }}>
								{running ? "● running" : completed ? "completed" : "pending"}
							</span>
						</button>
						<div style={{ fontSize: 10, opacity: 0.7, marginBottom: 4 }}>
							{t.trigger ?? "auto"} · match: {matchLabel(t.match)}
						</div>
						{running && snapshot && (
							<div
								style={{
									display: "flex",
									gap: 4,
									flexWrap: "wrap",
									marginBottom: 6,
								}}
							>
								{snapshot.steps.map((s, i) => (
									<button
										key={`${t.id}-step-${i}-${s.selector}`}
										type="button"
										title={s.title || s.selector}
										onClick={() => instance?.go(i)}
										style={{
											...btn(i === snapshot.index ? "#2563eb" : "#374151"),
											padding: "2px 7px",
											borderRadius: 10,
										}}
									>
										{i + 1}
									</button>
								))}
							</div>
						)}
						<div style={{ display: "flex", gap: 6 }}>
							<button
								type="button"
								onClick={() => onStart(t.id)}
								style={{ ...btn("#10b981"), flex: 1 }}
							>
								{running ? "Restart" : "Start"}
							</button>
							<button
								type="button"
								onClick={() => onReset(t.id)}
								style={btn("#dc2626")}
							>
								Reset
							</button>
						</div>
					</li>
				);
			})}
		</ul>
	);
}

export default TourList;
