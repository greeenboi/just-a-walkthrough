/**
 * Pure, dependency-free layout for the dev-panel wireframe.
 *
 * Turns registered tours into a swimlane graph: one lane per tour (labeled by its
 * `match`), one node per step (left→right by step order), edges connecting consecutive
 * steps. The active step (from a live snapshot) is flagged so the canvas can highlight
 * it. Kept pure so it is trivially unit-testable and reusable by any renderer.
 */
import type { ActiveTourSnapshot } from "../active-registry";
import type { RegisteredTour } from "../orchestrator";

export interface GraphNode {
	/** `${tourId}:${index}` */
	id: string;
	tourId: string;
	index: number;
	selector: string;
	title?: string;
	x: number;
	y: number;
	active: boolean;
}

export interface GraphEdge {
	id: string;
	from: string;
	to: string;
}

export interface GraphLane {
	tourId: string;
	/** Human-readable match summary (string / RegExp source / "fn"). */
	label: string;
	y: number;
	height: number;
}

export interface GraphModel {
	nodes: GraphNode[];
	edges: GraphEdge[];
	lanes: GraphLane[];
	width: number;
	height: number;
}

export const NODE_W = 148;
export const NODE_H = 46;
const GAP_X = 40;
const GAP_Y = 30;
const LANE_LABEL_H = 22;
const PAD = 16;

/** Summarize a tour matcher for display. */
export function matchLabel(match: RegisteredTour["match"]): string {
	if (typeof match === "string") return match;
	if (match instanceof RegExp) return match.toString();
	return "fn";
}

/**
 * Build the wireframe graph model for the given tours. When `active` is provided and
 * points at one of these tours, the corresponding step node is marked `active`.
 */
export function buildTourGraph(
	tours: RegisteredTour[],
	active?: ActiveTourSnapshot | null,
): GraphModel {
	const nodes: GraphNode[] = [];
	const edges: GraphEdge[] = [];
	const lanes: GraphLane[] = [];
	let y = PAD;
	let maxCols = 0;

	for (const tour of tours) {
		const laneTop = y;
		const rowY = y + LANE_LABEL_H;
		const resolvedId = tour.options?.tourId || tour.id;
		tour.steps.forEach((step, i) => {
			const id = `${tour.id}:${i}`;
			const isActive =
				!!active &&
				active.active &&
				active.id === resolvedId &&
				active.index === i;
			nodes.push({
				id,
				tourId: tour.id,
				index: i,
				selector: step.selector,
				title: step.title,
				x: PAD + i * (NODE_W + GAP_X),
				y: rowY,
				active: isActive,
			});
			if (i > 0) {
				edges.push({
					id: `${tour.id}:${i - 1}->${i}`,
					from: `${tour.id}:${i - 1}`,
					to: id,
				});
			}
		});
		maxCols = Math.max(maxCols, tour.steps.length);
		const laneHeight = LANE_LABEL_H + NODE_H;
		lanes.push({
			tourId: tour.id,
			label: matchLabel(tour.match),
			y: laneTop,
			height: laneHeight,
		});
		y = laneTop + laneHeight + GAP_Y;
	}

	const cols = Math.max(1, maxCols);
	const width = PAD * 2 + cols * NODE_W + (cols - 1) * GAP_X;
	const height = Math.max(PAD * 2, y);
	return { nodes, edges, lanes, width, height };
}
