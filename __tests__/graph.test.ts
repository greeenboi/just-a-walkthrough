import { describe, expect, it } from "vitest";
import type { ActiveTourSnapshot } from "../src/active-registry";
import { buildTourGraph, matchLabel } from "../src/dev-panel/graph";
import type { RegisteredTour } from "../src/orchestrator";

const tours: RegisteredTour[] = [
	{
		id: "a",
		match: "/x*",
		steps: [{ selector: "#1" }, { selector: "#2" }, { selector: "#3" }],
	},
	{
		id: "b",
		match: /foo/,
		steps: [{ selector: "#4" }],
		options: { tourId: "b" },
	},
];

describe("buildTourGraph", () => {
	it("produces N nodes and N-1 edges per tour, one lane each", () => {
		const g = buildTourGraph(tours);
		expect(g.nodes.filter((n) => n.tourId === "a")).toHaveLength(3);
		expect(g.edges.filter((e) => e.from.startsWith("a:"))).toHaveLength(2);
		expect(g.nodes.filter((n) => n.tourId === "b")).toHaveLength(1);
		expect(g.edges.filter((e) => e.id.startsWith("b:"))).toHaveLength(0);
		expect(g.lanes).toHaveLength(2);
		expect(g.width).toBeGreaterThan(0);
		expect(g.height).toBeGreaterThan(0);
	});

	it("labels match types (string / RegExp / fn)", () => {
		expect(matchLabel("/x*")).toBe("/x*");
		expect(matchLabel(/foo/)).toBe("/foo/");
		expect(matchLabel(() => true)).toBe("fn");
	});

	it("marks the active node based on the snapshot", () => {
		const snapshot: ActiveTourSnapshot = {
			id: "b",
			index: 0,
			total: 1,
			active: true,
			options: {},
			steps: [{ selector: "#4" }],
		};
		const g = buildTourGraph(tours, snapshot);
		const active = g.nodes.filter((n) => n.active);
		expect(active).toHaveLength(1);
		expect(active[0].tourId).toBe("b");
		expect(active[0].index).toBe(0);
	});

	it("marks no active node when the snapshot is inactive", () => {
		const snapshot: ActiveTourSnapshot = {
			id: "b",
			index: 0,
			total: 1,
			active: false,
			options: {},
			steps: [{ selector: "#4" }],
		};
		const g = buildTourGraph(tours, snapshot);
		expect(g.nodes.some((n) => n.active)).toBe(false);
	});
});
