/**
 * React integration for automatic / chained tour execution on route changes.
 *
 * This component watches the provided `pathname` and triggers registered tours
 * (those with `trigger: 'auto'`) using the orchestrator utilities. It supports
 * either starting them concurrently (`startAutoMatches`) or chaining them
 * sequentially (`chainAutoMatches`). It can also lazily import a module of tour
 * registrations prior to matching (code splitting friendly).
 *
 * Debug events: emits `react:route-effect`, `react:chain-result`, `react:start-result`,
 * `react:dyn-load-fail`, and `react:route-effect-cleanup` via the debug subsystem.
 */
import { useEffect } from "react";
import { chainAutoMatches, loadTours, startAutoMatches } from "./orchestrator";
import { recordDebug } from "./debug";

/** Props for {@link RouteOrchestrator}. */
export interface RouteOrchestratorProps {
	/** Current route path (e.g. from react-router / nextjs). */
	pathname: string;
	/** If true only the first matching auto tour starts (ignored when `chain` is true). */
	firstOnly?: boolean;
	/** If true, chain all matching tours sequentially (ordering: `order` then insertion). */
	chain?: boolean;
	/** Optional dynamic module specifier to `import()` before matching (should register tours). */
	dynamicModule?: string;
	/** Callback with the started or chained tour id list (only when at least one started). */
	onStartIds?: (ids: string[]) => void;
}

/**
 * React helper component that starts auto tours when `pathname` changes.
 *
 * Usage:
 * ```tsx
 * <RouteOrchestrator pathname={location.pathname} />
 * ```
 *
 * With chaining:
 * ```tsx
 * <RouteOrchestrator pathname={location.pathname} chain onStartIds={ids => console.log(ids)} />
 * ```
 *
 * Lazy load definitions first:
 * ```tsx
 * <RouteOrchestrator pathname={location.pathname} dynamicModule={() => import('./tours'))} />
 * ```
 */
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
