/**
 * React convenience wrapper around the core walkthrough primitives.
 *
 * Provides:
 *  - `WalkthroughProvider` to supply context with start / chain helpers.
 *  - `useWalkthrough()` hook exposing active state, current step index, and the raw instance.
 *  - Thin wrappers that forward lifecycle callbacks while updating internal state.
 *
 * This layer deliberately keeps API surface minimal so the underlying `Walkthrough`
 * class is still directly accessible when advanced customization is required.
 */
import type React from "react";
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useRef,
	useState,
} from "react";
import { getActiveInstance, subscribeActive } from "./active-registry";
import type {
	ChainedTour,
	WalkthroughOptions,
	WalkthroughStep,
} from "./walkthrough";
import {
	startWalkthrough,
	type Walkthrough,
	WalkthroughChain,
} from "./walkthrough";

/**
 * Shape of the React context value exposed by the provider + hook.
 */
interface WalkthroughContextValue {
	/** Start (or restart) a standalone walkthrough instance. Destroys any existing instance. */
	start: (
		steps: WalkthroughStep[],
		options?: WalkthroughOptions,
	) => Walkthrough;
	/** Start a chain of tours (sequential). Returns the chain controller. */
	chain: (tours: ChainedTour[]) => WalkthroughChain;
	/** True if a walkthrough instance is currently active. */
	active: boolean;
	/** The current step index of the active walkthrough, else null. */
	currentIndex: number | null;
	/** Direct reference to the underlying `Walkthrough` instance (nullable). */
	instance: Walkthrough | null;
}

const WalkthroughContext = createContext<WalkthroughContextValue | undefined>(
	undefined,
);

/**
 * Provider component that manages a single active walkthrough instance in React state.
 *
 * Usage:
 * ```tsx
 * <WalkthroughProvider>
 *   <App />
 * </WalkthroughProvider>
 * ```
 *
 * To auto start on mount:
 * ```tsx
 * <WalkthroughProvider autoStart={{ steps, options }} />
 * ```
 */
export function WalkthroughProvider({
	children,
	autoStart,
}: {
	children: React.ReactNode;
	autoStart?:
		| false
		| { steps: WalkthroughStep[]; options?: WalkthroughOptions };
}) {
	const [instance, setInstance] = useState<Walkthrough | null>(null);
	const [currentIndex, setCurrentIndex] = useState<number | null>(null);
	const instRef = useRef<Walkthrough | null>(null);

	// Derive active state from the core active-instances registry. This keeps the
	// context correct for BOTH standalone tours (start) and chained tours (chain) —
	// the chain's internally-created instances register/unregister and emit step
	// changes just like any other tour, so no manual callback wiring is needed here.
	useEffect(() => {
		const sync = () => {
			const inst = getActiveInstance();
			setInstance(inst);
			setCurrentIndex(inst?.isActive() ? inst.getCurrentIndex() : null);
		};
		sync();
		return subscribeActive(sync);
	}, []);

	const start = useCallback(
		(steps: WalkthroughStep[], options?: WalkthroughOptions) => {
			instRef.current?.destroy();
			const wt = startWalkthrough(steps, options || {});
			instRef.current = wt;
			return wt;
		},
		[],
	);

	const chain = useCallback((tours: ChainedTour[]) => {
		const c = new WalkthroughChain(tours);
		c.start();
		return c;
	}, []);

	// biome-ignore lint/correctness/useExhaustiveDependencies: run once on mount only
	useEffect(() => {
		if (autoStart) {
			start(autoStart.steps, autoStart.options);
		}
	}, []);

	const active = !!instance && instance.isActive();

	return (
		<WalkthroughContext.Provider
			value={{ start, chain, active, currentIndex, instance }}
		>
			{children}
		</WalkthroughContext.Provider>
	);
}

/**
 * Access the walkthrough context. Must be called within a `WalkthroughProvider`.
 *
 * Provides convenience booleans / references so consuming components do not have
 * to track lifecycle events manually.
 */
export function useWalkthrough() {
	const ctx = useContext(WalkthroughContext);
	if (!ctx)
		throw new Error("useWalkthrough must be used within WalkthroughProvider");
	return ctx;
}
