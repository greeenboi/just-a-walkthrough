import React from "react";
import ReactDOM from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { listActiveInstances } from "../src/active-registry";
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
		return () => {
			host.remove();
		};
	}, [start]);
	return null;
};

// Track the last created React root so we can unmount after each test to avoid
// React trying to operate on a torn-down JSDOM environment.
let lastRoot: ReactDOM.Root | null = null;

afterEach(() => {
	lastRoot?.unmount();
	lastRoot = null;
	// Destroy any still-active instances so their MutationObservers / listeners detach
	// (removing only the DOM node leaves the observer live, which can resurrect the root).
	listActiveInstances().forEach((i) => i.destroy());
	// Remove any walkthrough roots left if a test exited before finish/skip.
	document.querySelectorAll(".wt-root").forEach((n) => n.remove());
	document.getElementById("__walkthrough_styles")?.remove();
	// Also remove any stray host elements (defensive cleanup)
	document.querySelectorAll("#host-el").forEach((n) => n.remove());
});

describe("WalkthroughProvider integration", () => {
	it("starts a walkthrough via context and focuses element", async () => {
		clearTours();
		const root = document.createElement("div");
		document.body.appendChild(root);
		// Manual lightweight render (avoid bringing full react testing lib)
		lastRoot = ReactDOM.createRoot(root);
		lastRoot.render(
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
		lastRoot = ReactDOM.createRoot(root);
		lastRoot.render(
			<WalkthroughProvider>
				<TestComponent />
			</WalkthroughProvider>,
		);
		await waitFor(() => !!document.querySelector(".wt-ring"));
		const ring = document.querySelector(".wt-ring");
		expect(ring, "ring should render for first chained tour").toBeTruthy();
	});

	it("chain helper syncs active/instance/currentIndex via context", async () => {
		clearTours();
		for (const id of ["cc1", "cc2"]) {
			const el = document.createElement("div");
			el.id = id;
			document.body.appendChild(el);
		}
		const seen = {
			active: false,
			index: null as number | null,
			hasInstance: false,
		};
		const Reader: React.FC = () => {
			const ctx = useWalkthrough();
			seen.active = ctx.active;
			seen.index = ctx.currentIndex;
			seen.hasInstance = !!ctx.instance;
			const started = React.useRef(false);
			React.useEffect(() => {
				if (started.current) return;
				started.current = true;
				ctx.chain([
					{
						id: "ct1",
						steps: [{ selector: "#cc1", waitMs: 0 }],
						options: { tourId: "ct1", stepPollIntervalMs: 0 },
					},
					{
						id: "ct2",
						steps: [{ selector: "#cc2", waitMs: 0 }],
						options: { tourId: "ct2", stepPollIntervalMs: 0 },
					},
				]);
			}, [ctx]);
			return null;
		};
		const root = document.createElement("div");
		document.body.appendChild(root);
		lastRoot = ReactDOM.createRoot(root);
		lastRoot.render(
			<WalkthroughProvider>
				<Reader />
			</WalkthroughProvider>,
		);
		await waitFor(() => seen.active);
		expect(seen.active).toBe(true);
		expect(seen.hasInstance).toBe(true);
		expect(seen.index).toBe(0);
	});

	it("resets active/instance when a standalone tour finishes", async () => {
		clearTours();
		const el = document.createElement("div");
		el.id = "fin-x";
		document.body.appendChild(el);
		const seen = { active: false, instance: null as ReturnType<typeof Object> };
		const Reader: React.FC = () => {
			const ctx = useWalkthrough();
			seen.active = ctx.active;
			seen.instance = ctx.instance;
			const started = React.useRef(false);
			React.useEffect(() => {
				if (started.current) return;
				started.current = true;
				ctx.start([{ selector: "#fin-x", waitMs: 0 }], {
					stepPollIntervalMs: 0,
				});
			}, [ctx]);
			return null;
		};
		const root = document.createElement("div");
		document.body.appendChild(root);
		lastRoot = ReactDOM.createRoot(root);
		lastRoot.render(
			<WalkthroughProvider>
				<Reader />
			</WalkthroughProvider>,
		);
		await waitFor(() => seen.active);
		expect(seen.active).toBe(true);
		(seen.instance as { finish: () => void }).finish();
		await waitFor(() => !seen.active);
		expect(seen.active).toBe(false);
		expect(seen.instance).toBeNull();
	});
});
