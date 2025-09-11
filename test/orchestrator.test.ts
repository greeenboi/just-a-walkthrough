import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	chainAutoMatches,
	clearTourProgress,
	clearTours,
	isTourCompleted,
	listTours,
	registerTour,
	registerTours,
	resetAllTourProgress,
	startAutoMatches,
	startTourById,
} from "../src/orchestrator";

beforeEach(() => {
	clearTours();
	localStorage.clear();
	sessionStorage.clear();
	document.body.innerHTML = "";
});

afterEach(() => {
	// Try to gracefully finish/skip any active tours so MutationObservers & listeners detach.
	// Click any Done or Skip buttons that remain.
	document.querySelectorAll(".wt-tooltip .wt-nav button").forEach((b) => {
		const label = b.textContent?.toLowerCase();
		if (label === "done" || label === "skip") (b as HTMLButtonElement).click();
	});
	// Fallback: remove leftover roots (defensive only; primary cleanup above calls finish/skip).
	document
		.querySelectorAll(".wt-root")
		.forEach((n) => n.parentElement?.removeChild(n));
});

function addTarget(id: string) {
	const el = document.createElement("div");
	el.id = id;
	el.textContent = id;
	document.body.appendChild(el);
}

describe("orchestrator registry", () => {
	it("registers and lists tours", () => {
		registerTour({ id: "t1", match: "/home", steps: [{ selector: "#x" }] });
		registerTours([{ id: "t2", match: "/home", steps: [{ selector: "#x" }] }]);
		const ids = listTours()
			.map((t) => t.id)
			.sort();
		expect(ids).toEqual(["t1", "t2"]);
		clearTours();
		expect(listTours()).toHaveLength(0);
	});
});

describe("startAutoMatches", () => {
	it("starts only auto tours and respects firstOnly", async () => {
		addTarget("t");
		registerTours([
			{ id: "auto1", match: "/dash", steps: [{ selector: "#t" }] },
			{ id: "auto2", match: "/dash", steps: [{ selector: "#t" }] },
			{
				id: "manual1",
				match: "/dash",
				trigger: "manual",
				steps: [{ selector: "#t" }],
			},
		]);
		const all = await startAutoMatches({ pathname: "/dash" });
		expect(all.sort()).toEqual(["auto1", "auto2"]);
		const firstOnly = await startAutoMatches({
			pathname: "/dash",
			firstOnly: true,
		});
		// firstOnly should start the first auto tour again (no oncePerSession flag)
		expect(firstOnly).toEqual(["auto1"]);
	});

	it("respects condition, oncePerSession and skipIfCompleted", async () => {
		addTarget("t");
		// Pre-mark completion for tour c
		localStorage.setItem(
			"__walkthrough:c",
			JSON.stringify({ completed: true }),
		);
		registerTours([
			{
				id: "a",
				match: "/p",
				steps: [{ selector: "#t" }],
				oncePerSession: true,
			},
			{
				id: "b",
				match: "/p",
				steps: [{ selector: "#t" }],
				condition: () => false,
			},
			{
				id: "c",
				match: "/p",
				steps: [{ selector: "#t" }],
				options: { persistProgress: true, tourId: "c" },
				skipIfCompleted: true,
			},
		]);
		const started = await startAutoMatches({ pathname: "/p" });
		expect(started).toEqual(["a"]);
		// second attempt should not start a again due to oncePerSession
		const second = await startAutoMatches({ pathname: "/p" });
		expect(second).toEqual([]);
	});
});

describe("chainAutoMatches", () => {
	it("chains in order and sets session flags", async () => {
		addTarget("el");
		registerTours([
			{ id: "second", order: 2, match: "/c", steps: [{ selector: "#el" }] },
			{ id: "first", order: 1, match: "/c", steps: [{ selector: "#el" }] },
		]);
		const { ids, chain } = await chainAutoMatches("/c");
		expect(ids).toEqual(["first", "second"]);
		expect(chain).toBeTruthy();
		// session flags set
		expect(sessionStorage.getItem("__wt_session_started:first")).toBe("1");
		expect(sessionStorage.getItem("__wt_session_started:second")).toBe("1");
		// Stop the chain so it doesn't keep observers alive.
		chain?.stop();
	});
});

describe("manual start and progress utilities", () => {
	it("startTourById and progress clear/reset", () => {
		addTarget("d");
		registerTour({
			id: "manual",
			match: "/m",
			steps: [{ selector: "#d" }],
			options: { persistProgress: true, tourId: "manual" },
			trigger: "manual",
		});
		const inst = startTourById("manual");
		expect(inst).toBeTruthy();
		inst.finish();
		expect(isTourCompleted("manual")).toBe(true);
		clearTourProgress("manual");
		expect(isTourCompleted("manual")).toBe(false);
		// mark again then bulk reset
		inst.start();
		inst.finish();
		resetAllTourProgress();
		expect(isTourCompleted("manual")).toBe(false);
	});
});
