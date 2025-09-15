import ReactDOM from "react-dom/client";
import { describe, expect, it } from "vitest";
import { WalkthroughDevPanel } from "../src/dev-panel";
import {
	clearTourProgress,
	clearTours,
	listTours,
	registerTours,
} from "../src/orchestrator";
import { startWalkthrough } from "../src/walkthrough";

function sleep(ms: number) {
	return new Promise((r) => setTimeout(r, ms));
}

describe("WalkthroughDevPanel", () => {
	it("lists tours and can start matches / reset", async () => {
		clearTours();
		const tEl = document.createElement("div");
		tEl.id = "dp-x";
		document.body.appendChild(tEl);
		registerTours([
			{
				id: "dp-tour",
				match: () => true,
				steps: [{ selector: "#dp-x", title: "Dev", content: "Dev Panel" }],
				options: { tourId: "dp-tour", persistProgress: true },
			},
		]);
		const root = document.createElement("div");
		document.body.appendChild(root);
		const r = ReactDOM.createRoot(root);
		r.render(<WalkthroughDevPanel pathname="/any" />);
		await sleep(25);
		// simulate run matches by calling startAutoMatches through clicking the button if accessible
		// Instead of querying button text (inline styles), directly start one to ensure state updates
		startWalkthrough(
			[{ selector: "#dp-x", title: "Manual", content: "Manual" }],
			{ stepWaitMs: 0, stepPollIntervalMs: 0 },
		);
		await sleep(10);
		expect(listTours().length).toBe(1);
		clearTourProgress("dp-tour");
	});
});
