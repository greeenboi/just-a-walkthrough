import { describe, expect, it } from "vitest";
import {
	chainAutoMatches,
	clearTours,
	registerTours,
	startAutoMatches,
} from "../src/orchestrator";

function el(id: string) {
	const d = document.createElement("div");
	d.id = id;
	document.body.appendChild(d);
	return d;
}

describe("orchestrator branches", () => {
	it("skips tour when condition returns false", async () => {
		clearTours();
		el("cond");
		registerTours([
			{
				id: "cond-tour",
				match: () => true,
				steps: [{ selector: "#cond", title: "C", content: "C" }],
				condition: () => false,
			},
		]);
		const started = await startAutoMatches({ pathname: "/any" });
		expect(started).toEqual([]);
	});

	it("oncePerSession prevents second start", async () => {
		clearTours();
		el("s1");
		registerTours([
			{
				id: "session-tour",
				match: () => true,
				steps: [{ selector: "#s1", title: "S", content: "S" }],
				oncePerSession: true,
			},
		]);
		const first = await startAutoMatches({ pathname: "/any" });
		const second = await startAutoMatches({ pathname: "/any" });
		expect(first.length).toBe(1);
		expect(second.length).toBe(0);
	});

	it("skipIfCompleted=false still starts completed tour", async () => {
		clearTours();
		el("p1");
		registerTours([
			{
				id: "persist-tour",
				match: () => true,
				steps: [{ selector: "#p1", title: "P", content: "P" }],
				options: { tourId: "persist-tour", persistProgress: true },
				skipIfCompleted: false,
			},
		]);
		// Mark as completed manually
		localStorage.setItem(
			"__walkthrough:persist-tour",
			JSON.stringify({ index: 0, completed: true }),
		);
		const started = await startAutoMatches({ pathname: "/any" });
		expect(started).toContain("persist-tour");
	});

	it("chainAutoMatches returns none when no matches", async () => {
		clearTours();
		const { ids, chain } = await chainAutoMatches("/route");
		expect(ids).toEqual([]);
		expect(chain).toBeNull();
	});
});
