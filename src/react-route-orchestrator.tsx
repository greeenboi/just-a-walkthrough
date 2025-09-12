import { useEffect } from "react";
import { chainAutoMatches, loadTours, startAutoMatches } from "./orchestrator";
import { recordDebug } from "./debug";

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
			recordDebug("react", "route-effect", pathname, { chain, firstOnly });
			if (dynamicModule) {
				try {
					await loadTours(dynamicModule);
				} catch (e) {
					recordDebug("react", "dyn-load-fail", dynamicModule, { error: (e as Error).message });
				}
			}
			if (chain) {
				const { ids } = await chainAutoMatches(pathname);
				if (!cancelled && ids.length && onStartIds) onStartIds(ids);
				recordDebug("react", "chain-result", pathname, { ids });
			} else {
				const started = await startAutoMatches({ pathname, firstOnly });
				if (!cancelled && started.length && onStartIds) onStartIds(started);
				recordDebug("react", "start-result", pathname, { ids: started });
			}
		})();
		return () => {
			cancelled = true;
			recordDebug("react", "route-effect-cleanup", pathname);
		};
	}, [pathname, firstOnly, chain, dynamicModule, onStartIds]);
	return null;
}
