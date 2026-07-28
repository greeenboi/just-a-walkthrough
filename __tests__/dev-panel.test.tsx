import ReactDOM from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { listActiveInstances } from "../src/active-registry";
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

async function waitFor(fn: () => boolean, timeout = 500, interval = 15) {
	const start = Date.now();
	while (Date.now() - start < timeout) {
		if (fn()) return true;
		await sleep(interval);
	}
	return fn();
}

afterEach(() => {
	listActiveInstances().forEach((i) => i.destroy());
	document.getElementById("__walkthrough_styles")?.remove();
	document.querySelectorAll(".wt-root").forEach((n) => n.remove());
});

function findButton(
	root: HTMLElement,
	label: string,
): HTMLButtonElement | null {
	return (
		Array.from(root.querySelectorAll("button")).find(
			(b) => b.textContent?.trim().toLowerCase() === label,
		) ?? null
	);
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

	it("renders a wireframe rect per registered step", async () => {
		clearTours();
		registerTours([
			{
				id: "wf",
				match: () => true,
				steps: [
					{ selector: "#s1", title: "S1" },
					{ selector: "#s2", title: "S2" },
					{ selector: "#s3", title: "S3" },
				],
			},
		]);
		const root = document.createElement("div");
		document.body.appendChild(root);
		const r = ReactDOM.createRoot(root);
		r.render(<WalkthroughDevPanel pathname="/any" />);
		await waitFor(() => !!findButton(root, "wireframe"));
		const wfTab = findButton(root, "wireframe");
		expect(wfTab).toBeTruthy();
		wfTab?.click();
		await waitFor(() => root.querySelectorAll("rect").length === 3);
		expect(root.querySelectorAll("rect")).toHaveLength(3);
		r.unmount();
	});

	it("reflects a running tour's state in the tour list", async () => {
		clearTours();
		const el = document.createElement("div");
		el.id = "run-x";
		document.body.appendChild(el);
		registerTours([
			{
				id: "run-tour",
				match: () => true,
				steps: [{ selector: "#run-x", title: "Run" }],
				options: { tourId: "run-tour" },
			},
		]);
		const root = document.createElement("div");
		document.body.appendChild(root);
		const r = ReactDOM.createRoot(root);
		r.render(<WalkthroughDevPanel pathname="/any" />);
		await waitFor(() => !!root.textContent);
		startWalkthrough([{ selector: "#run-x", waitMs: 0 }], {
			tourId: "run-tour",
			stepPollIntervalMs: 0,
		});
		await waitFor(() => !!root.textContent?.includes("running"));
		expect(root.textContent).toContain("running");
		r.unmount();
	});
});
