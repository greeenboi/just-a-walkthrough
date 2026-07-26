/**
 * Hand-rolled SVG renderer for the tour wireframe (no charting deps). Draws swimlanes,
 * step nodes (selector text + title tooltip), and directed edges between steps. Clicking
 * a node whose tour is the running instance jumps the tour to that step.
 */
import { type GraphModel, type GraphNode, NODE_H, NODE_W } from "./graph";

export interface WireframeCanvasProps {
	model: GraphModel;
	/** Called when a node is clicked (only wired when the node's tour is running). */
	onNodeClick?: (node: GraphNode) => void;
	/** Ids of tours that are currently running (nodes become interactive). */
	runningTourIds?: string[];
}

function truncate(s: string, max = 20): string {
	return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

export function WireframeCanvas({
	model,
	onNodeClick,
	runningTourIds = [],
}: WireframeCanvasProps) {
	const nodeById = new Map(model.nodes.map((n) => [n.id, n]));
	const running = new Set(runningTourIds);

	return (
		<svg
			width={model.width}
			height={model.height}
			viewBox={`0 0 ${model.width} ${model.height}`}
			style={{
				display: "block",
				fontFamily: "ui-sans-serif, system-ui, sans-serif",
			}}
			role="img"
			aria-label="Tour flow wireframe"
		>
			<defs>
				{/* biome-ignore lint/correctness/useUniqueElementIds: fixed id referenced by markerEnd; one canvas per dev panel */}
				<marker
					id="wt-arrow"
					viewBox="0 0 8 8"
					refX="7"
					refY="4"
					markerWidth="7"
					markerHeight="7"
					orient="auto-start-reverse"
				>
					<path d="M0,0 L8,4 L0,8 z" fill="#6b7280" />
				</marker>
			</defs>

			{/* Lane labels */}
			{model.lanes.map((lane) => (
				<text
					key={`lane-${lane.tourId}`}
					x={4}
					y={lane.y + 14}
					fontSize={11}
					fill="#9ca3af"
				>
					{truncate(`${lane.tourId} — ${lane.label}`, 48)}
				</text>
			))}

			{/* Edges */}
			{model.edges.map((e) => {
				const from = nodeById.get(e.from);
				const to = nodeById.get(e.to);
				if (!from || !to) return null;
				const x1 = from.x + NODE_W;
				const y1 = from.y + NODE_H / 2;
				const x2 = to.x;
				const y2 = to.y + NODE_H / 2;
				return (
					<line
						key={e.id}
						x1={x1}
						y1={y1}
						x2={x2}
						y2={y2}
						stroke="#6b7280"
						strokeWidth={1.5}
						markerEnd="url(#wt-arrow)"
					/>
				);
			})}

			{/* Nodes */}
			{model.nodes.map((n) => {
				const interactive = running.has(n.tourId);
				return (
					// biome-ignore lint/a11y/noStaticElementInteractions: dev-only SVG node; jump-to-step convenience
					<g
						key={n.id}
						transform={`translate(${n.x},${n.y})`}
						style={{ cursor: interactive ? "pointer" : "default" }}
						onClick={interactive ? () => onNodeClick?.(n) : undefined}
					>
						<title>{`#${n.index + 1} ${n.title || ""}\n${n.selector}`}</title>
						<rect
							width={NODE_W}
							height={NODE_H}
							rx={7}
							fill={n.active ? "#1d4ed8" : "#1c1c1c"}
							stroke={n.active ? "#60a5fa" : "#374151"}
							strokeWidth={n.active ? 2 : 1}
						/>
						<text x={8} y={18} fontSize={11} fontWeight={600} fill="#f9fafb">
							{truncate(n.title || `Step ${n.index + 1}`, 18)}
						</text>
						<text x={8} y={34} fontSize={10} fill="#9ca3af">
							{truncate(n.selector, 20)}
						</text>
					</g>
				);
			})}
		</svg>
	);
}

export default WireframeCanvas;
