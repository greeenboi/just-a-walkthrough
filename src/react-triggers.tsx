/**
 * React helpers for starting tours from user interaction (clicks).
 *
 * Two complementary approaches:
 *  - {@link useTourTrigger} / {@link TourTrigger}: explicit React wiring that starts a
 *    tour through the orchestrator's trigger path (honoring gating unless the tour opts
 *    into `ignoreGatingOnClick`).
 *  - The `data-wt-start="<id>"` attribute + {@link bindTourTriggers} (called by
 *    `RouteOrchestrator`): fully declarative, works on any element without React wiring.
 *
 * Both funnel through {@link startTourByTrigger}, so dedupe and gating are consistent.
 */
import type React from "react";
import { useCallback } from "react";
import { startTourByTrigger } from "./orchestrator";

/**
 * Returns a memoized handler that starts the given registered tour by id via the
 * explicit-trigger path. Safe to attach to any element's `onClick`.
 *
 * ```tsx
 * const startTour = useTourTrigger('dash-intro');
 * <button onClick={startTour}>Take the tour</button>
 * ```
 */
export function useTourTrigger(tourId: string): () => void {
	return useCallback(() => {
		void startTourByTrigger(tourId);
	}, [tourId]);
}

/** Props for {@link TourTrigger}. */
export interface TourTriggerProps
	extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onClick"> {
	/** Id of a registered tour to start on click. */
	tourId: string;
	/**
	 * When true, renders no wrapper and instead expects a single child element,
	 * injecting `data-wt-start`/`onClick` onto it via cloning is intentionally NOT done
	 * here to keep the component dependency-free; prefer using the default button or
	 * `useTourTrigger` for custom elements.
	 */
	children?: React.ReactNode;
}

/**
 * Minimal button that starts a registered tour on click. Also sets `data-wt-start` so
 * it works even if React's synthetic handler is bypassed and only the delegated
 * document listener is active.
 *
 * ```tsx
 * <TourTrigger tourId="dash-intro">Take the tour</TourTrigger>
 * ```
 */
export function TourTrigger({ tourId, children, ...rest }: TourTriggerProps) {
	const start = useTourTrigger(tourId);
	return (
		<button type="button" data-wt-start={tourId} onClick={start} {...rest}>
			{children}
		</button>
	);
}
