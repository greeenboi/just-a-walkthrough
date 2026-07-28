import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { listActiveInstances } from "../src/active-registry";
import {
	bindTourTriggers,
	clearTours,
	registerTour,
	startAutoMatches,
	startTourByTrigger,
	unbindTourTriggers,
} from "../src/orchestrator";

beforeEach(() => {
	clearTours();
	localStorage.clear();
	sessionStorage.clear();
	document.body.innerHTML = "";
	unbindTourTriggers();
});

afterEach(() => {
	unbindTourTriggers();
	// Finish/skip any active tours so listeners/observers detach between tests.
	document.querySelectorAll(".wt-tooltip .wt-nav button").forEach((b) => {
		const label = b.textContent?.toLowerCase();
		if (label === "done" || label === "skip") (b as HTMLButtonElement).click();
	});
	document
		.querySelectorAll(".wt-root")
		.forEach((n) => n.parentElement?.removeChild(n));
});

function addTarget(id: string) {
	const el = document.createElement("div");
	el.id = id;
	el.textContent = id;
	document.body.appendChild(el);
	return el;
}

function activeIds() {
	return listActiveInstances().map((i) => i.getSnapshot().id);
}

describe("click triggers", () => {
	it("starts a tour when a triggerSelector element is clicked", () => {
		addTarget("t");
		const btn = document.createElement("button");
		btn.id = "start-btn";
		document.body.appendChild(btn);
		registerTour({
			id: "clicky",
			match: "/x",
			trigger: "click",
			triggerSelector: "#start-btn",
			steps: [{ selector: "#t", waitMs: 0 }],
		});
		bindTourTriggers();
		expect(activeIds()).not.toContain("clicky");
		btn.click();
		expect(activeIds()).toContain("clicky");
	});

	it("starts via data-wt-start attribute, including clicks on descendants", () => {
		addTarget("t");
		const btn = document.createElement("button");
		btn.setAttribute("data-wt-start", "attr-tour");
		const inner = document.createElement("span");
		inner.textContent = "go";
		btn.appendChild(inner);
		document.body.appendChild(btn);
		registerTour({
			id: "attr-tour",
			match: "/x",
			trigger: "click",
			steps: [{ selector: "#t", waitMs: 0 }],
		});
		bindTourTriggers();
		inner.click(); // click a descendant -> resolves via closest()
		expect(activeIds()).toContain("attr-tour");
	});

	it("dedupes: a second click while running does not start a second instance", async () => {
		addTarget("t");
		const btn = document.createElement("button");
		btn.setAttribute("data-wt-start", "dedupe");
		document.body.appendChild(btn);
		registerTour({
			id: "dedupe",
			match: "/x",
			trigger: "click",
			steps: [{ selector: "#t", waitMs: 0 }],
		});
		bindTourTriggers();
		btn.click();
		btn.click();
		// allow any microtasks from startTourByTrigger to settle
		await Promise.resolve();
		expect(activeIds().filter((id) => id === "dedupe")).toHaveLength(1);
	});

	it("unbindTourTriggers detaches the listener", () => {
		addTarget("t");
		const btn = document.createElement("button");
		btn.setAttribute("data-wt-start", "gone");
		document.body.appendChild(btn);
		registerTour({
			id: "gone",
			match: "/x",
			trigger: "click",
			steps: [{ selector: "#t", waitMs: 0 }],
		});
		bindTourTriggers();
		unbindTourTriggers();
		btn.click();
		expect(activeIds()).not.toContain("gone");
	});

	it("click tours are excluded from auto matches", async () => {
		addTarget("t");
		registerTour({
			id: "clicky2",
			match: "/dash",
			trigger: "click",
			triggerSelector: "#nope",
			steps: [{ selector: "#t", waitMs: 0 }],
		});
		const started = await startAutoMatches({ pathname: "/dash" });
		expect(started).toEqual([]);
	});

	it("startTourByTrigger honors gating by default but ignoreGatingOnClick overrides", async () => {
		addTarget("t");
		localStorage.setItem(
			"__walkthrough:done-tour",
			JSON.stringify({ completed: true }),
		);
		registerTour({
			id: "done-tour",
			match: "/x",
			trigger: "click",
			options: { persistProgress: true, tourId: "done-tour" },
			steps: [{ selector: "#t", waitMs: 0 }],
		});
		// completed + skipIfCompleted default -> gated out
		const gated = await startTourByTrigger("done-tour");
		expect(gated).toBeNull();

		localStorage.setItem(
			"__walkthrough:force-tour",
			JSON.stringify({ completed: true }),
		);
		registerTour({
			id: "force-tour",
			match: "/x",
			trigger: "click",
			ignoreGatingOnClick: true,
			options: { persistProgress: true, tourId: "force-tour" },
			steps: [{ selector: "#t", waitMs: 0 }],
		});
		const forced = await startTourByTrigger("force-tour");
		expect(forced).toBe("force-tour");
		expect(activeIds()).toContain("force-tour");
	});
});
