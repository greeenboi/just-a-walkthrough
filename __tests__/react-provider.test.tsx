import React from "react";
import ReactDOM from "react-dom/client";
import { describe, expect, it } from "vitest";
import { clearTours, registerTours } from "../src/orchestrator";
import { useWalkthrough, WalkthroughProvider } from "../src/react-provider";

async function waitFor(fn: () => boolean, timeout = 300, interval = 15) {
	const start = Date.now();
	while (Date.now() - start < timeout) {
		if (fn()) return true;
		await new Promise((r) => setTimeout(r, interval));
	}
	return fn();
}

const TestComponent: React.FC = () => {
	const { start } = useWalkthrough();
	React.useEffect(() => {
		const host = document.createElement("div");
		host.id = "host-el";
		document.body.appendChild(host);
		start(
			[
				{
					selector: "#host-el",
					title: "Host",
					content: "Host content",
					focus: true,
				},
			],
			{ stepWaitMs: 0, stepPollIntervalMs: 0 },
		);
	}, [start]);
	return null;
};

describe("WalkthroughProvider integration", () => {
	it("starts a walkthrough via context and focuses element", async () => {
		clearTours();
		const root = document.createElement("div");
		document.body.appendChild(root);
		// Manual lightweight render (avoid bringing full react testing lib)
		const r = ReactDOM.createRoot(root);
		r.render(
			<WalkthroughProvider>
				<TestComponent />
			</WalkthroughProvider>,
		);
		await waitFor(() => !!document.querySelector(".wt-tooltip"));
		const tooltip = document.querySelector(".wt-tooltip");
		expect(tooltip, "tooltip should render after provider start").toBeTruthy();
	});

	it("chains tours using orchestrator and provider chain helper (registration)", async () => {
		clearTours();
		const target1 = document.createElement("div");
		target1.id = "c1";
		document.body.appendChild(target1);
		const target2 = document.createElement("div");
		target2.id = "c2";
		document.body.appendChild(target2);
		registerTours([
			{
				id: "t1",
				match: () => true,
				steps: [{ selector: "#c1", title: "A", content: "A" }],
				options: { tourId: "t1", persistProgress: false },
			},
			{
				id: "t2",
				match: () => true,
				steps: [{ selector: "#c2", title: "B", content: "B" }],
				options: { tourId: "t2", persistProgress: false },
			},
		]);
		const root = document.createElement("div");
		document.body.appendChild(root);
		const r = ReactDOM.createRoot(root);
		r.render(
			<WalkthroughProvider>
				<TestComponent />
			</WalkthroughProvider>,
		);
		await waitFor(() => !!document.querySelector(".wt-ring"));
		const ring = document.querySelector(".wt-ring");
		expect(ring, "ring should render for first chained tour").toBeTruthy();
	});
});
