import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { listActiveInstances } from "../src/active-registry";
import { startWalkthrough } from "../src/walkthrough";

beforeEach(() => {
	document.body.innerHTML = "";
	document.getElementById("__walkthrough_styles")?.remove();
});

afterEach(() => {
	listActiveInstances().forEach((i) => i.destroy());
	document.getElementById("__walkthrough_styles")?.remove();
	document.querySelectorAll(".wt-root").forEach((n) => n.remove());
});

function addTarget(id: string) {
	const el = document.createElement("div");
	el.id = id;
	document.body.appendChild(el);
	return el;
}

const overlayBg = () =>
	(document.querySelector(".wt-overlay") as HTMLElement | null)?.style
		.background;

describe("Walkthrough.updateOptions", () => {
	it("updates the backdrop opacity live", () => {
		addTarget("a");
		const wt = startWalkthrough([{ selector: "#a", waitMs: 0 }], {
			stepPollIntervalMs: 0,
			backdropOpacity: 0.5,
		});
		expect(overlayBg()).toContain("0.5");
		wt.updateOptions({ backdropOpacity: 0.9 });
		expect(overlayBg()).toContain("0.9");
	});

	it("preserves the active step index across a rebuild", () => {
		addTarget("a");
		addTarget("b");
		const wt = startWalkthrough(
			[
				{ selector: "#a", waitMs: 0 },
				{ selector: "#b", waitMs: 0 },
			],
			{ stepPollIntervalMs: 0 },
		);
		wt.next();
		expect(wt.getCurrentIndex()).toBe(1);
		wt.updateOptions({ backdropOpacity: 0.7 });
		expect(wt.getCurrentIndex()).toBe(1);
		expect(wt.isActive()).toBe(true);
	});

	it("removes injected default styles when switching to unstyled", () => {
		addTarget("a");
		const wt = startWalkthrough([{ selector: "#a", waitMs: 0 }], {
			stepPollIntervalMs: 0,
		});
		expect(document.getElementById("__walkthrough_styles")).toBeTruthy();
		wt.updateOptions({ theme: "unstyled" });
		expect(document.getElementById("__walkthrough_styles")).toBeNull();
	});

	it("injects shadcn token styles when switching to shadcn (raw format)", () => {
		addTarget("a");
		const wt = startWalkthrough([{ selector: "#a", waitMs: 0 }], {
			stepPollIntervalMs: 0,
			theme: "unstyled",
		});
		expect(document.getElementById("__walkthrough_styles")).toBeNull();
		wt.updateOptions({ theme: "shadcn" });
		const styleEl = document.getElementById("__walkthrough_styles");
		expect(styleEl).toBeTruthy();
		expect(styleEl?.textContent).toContain("var(--popover)");
	});

	it("wraps tokens with hsl() when tokenColorFormat is hsl", () => {
		addTarget("a");
		startWalkthrough([{ selector: "#a", waitMs: 0 }], {
			stepPollIntervalMs: 0,
			theme: "shadcn",
			tokenColorFormat: "hsl",
		});
		const styleEl = document.getElementById("__walkthrough_styles");
		expect(styleEl?.textContent).toContain("hsl(var(--popover))");
	});

	it("getSnapshot reflects id, index, total and options", () => {
		addTarget("a");
		const wt = startWalkthrough(
			[
				{ selector: "#a", title: "One", waitMs: 0 },
				{ selector: "#a", title: "Two", waitMs: 0 },
			],
			{ stepPollIntervalMs: 0, tourId: "snap", backdropOpacity: 0.42 },
		);
		const s = wt.getSnapshot();
		expect(s.id).toBe("snap");
		expect(s.total).toBe(2);
		expect(s.index).toBe(0);
		expect(s.active).toBe(true);
		expect(s.options.backdropOpacity).toBe(0.42);
		expect(s.steps.map((x) => x.title)).toEqual(["One", "Two"]);
	});
});
