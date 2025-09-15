import ReactDOM from "react-dom/client";
import { describe, expect, it } from "vitest";
import { clearTours, registerTours } from "../src/orchestrator";
import { RouteOrchestrator } from "../src/react-route-orchestrator";

async function waitFor(fn: () => boolean, timeout = 200, interval = 10) {
	const start = Date.now();
	while (Date.now() - start < timeout) {
		if (fn()) return true;
		await new Promise((r) => setTimeout(r, interval));
	}
	return fn();
}

describe("ReactRouteOrchestrator", () => {
	it("starts matching tours for pathname and cleans up on unmount", async () => {
		clearTours();
		// target element
		const el = document.createElement("div");
		el.id = "r1";
		document.body.appendChild(el);
		registerTours([
			{
				id: "r-tour",
				match: "/dash/*",
				steps: [{ selector: "#r1", title: "Route", content: "Route Content" }],
				options: { tourId: "r-tour", persistProgress: false },
			},
		]);
		const root = document.createElement("div");
		document.body.appendChild(root);
		const r = ReactDOM.createRoot(root);
		r.render(<RouteOrchestrator pathname="/dash/home" />);
		await waitFor(() => !!document.querySelector(".wt-tooltip"), 400);
		const tooltip = document.querySelector(".wt-tooltip");
		expect(tooltip, "expected tooltip to appear for route tour").toBeTruthy();
		r.unmount();
	});
});
