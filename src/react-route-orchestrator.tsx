import { useEffect } from "react";
import { chainAutoMatches, loadTours, startAutoMatches } from "./orchestrator";

export interface RouteOrchestratorProps {
	pathname: string; // supply current route path
	firstOnly?: boolean; // only start first matched auto tour (ignored if chain=true)
	chain?: boolean; // chain all matches sequentially
	dynamicModule?: string; // optional module specifier to lazy-load tours before matching
	onStartIds?: (ids: string[]) => void;
}

/** React helper component for auto-starting registered tours when pathname changes. */
export function RouteOrchestrator({
	pathname,
	firstOnly,
	chain,
	dynamicModule,
	onStartIds,
}: RouteOrchestratorProps) {
	useEffect(() => {
		let cancelled = false;
		(async () => {
			if (dynamicModule) {
				try {
					await loadTours(dynamicModule);
				} catch (e) {
					console.warn("[walkthrough] failed to load dynamic module", e);
				}
			}
			if (chain) {
				const { ids } = await chainAutoMatches(pathname);
				if (!cancelled && ids.length && onStartIds) onStartIds(ids);
			} else {
				const started = await startAutoMatches({ pathname, firstOnly });
				if (!cancelled && started.length && onStartIds) onStartIds(started);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [pathname, firstOnly, chain, dynamicModule, onStartIds]);
	return null;
}
