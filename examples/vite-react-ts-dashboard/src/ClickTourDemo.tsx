import { registerTour, TourTrigger } from "../../../src";

// Register a small, on-demand tour that is only startable by clicking (trigger: 'click').
// It is excluded from auto/route matching, so it never fires on navigation.
registerTour({
	id: "quick-help",
	match: "*",
	trigger: "click",
	steps: [
		{
			selector: "body",
			title: "Quick help",
			content: "This tour was started by clicking a button, not by opening the page.",
		},
	],
});

/**
 * Demonstrates declarative click-to-start using <TourTrigger>. The button also carries
 * a `data-wt-start="quick-help"` attribute (set by TourTrigger), so it additionally
 * works via the delegated document listener when <RouteOrchestrator> is mounted.
 */
export function ClickTourDemo() {
	return (
		<TourTrigger
			tourId="quick-help"
			style={{
				position: "fixed",
				bottom: 16,
				left: 16,
				zIndex: 999998,
				padding: "8px 14px",
				borderRadius: 8,
				border: "1px solid #444",
				background: "#2563eb",
				color: "#fff",
				cursor: "pointer",
				fontSize: 13,
			}}
		>
			Take a quick tour
		</TourTrigger>
	);
}
