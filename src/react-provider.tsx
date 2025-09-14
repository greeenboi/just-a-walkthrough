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
	start: (steps: WalkthroughStep[], options?: WalkthroughOptions) => Walkthrough;
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
  autoStart?: false | { steps: WalkthroughStep[]; options?: WalkthroughOptions };
}) {
	const [instance, setInstance] = useState<Walkthrough | null>(null);
	const [currentIndex, setCurrentIndex] = useState<number | null>(null);
	const active = !!instance;
	const instRef = useRef<Walkthrough | null>(null);

  const start = useCallback(
    (steps: WalkthroughStep[], options?: WalkthroughOptions) => {
      instRef.current?.destroy();
      const wt = startWalkthrough(steps, {
        ...(options || {}),
        onStepChange: (i) => {
          setCurrentIndex(i);
          options?.onStepChange?.(i);
        },
        onFinish: () => {
          options?.onFinish?.();
          instRef.current = null;
          setInstance(null);
          setCurrentIndex(null);
        },
        onSkip: (r) => {
          options?.onSkip?.(r);
          instRef.current = null;
          setInstance(null);
          setCurrentIndex(null);
        },
      });
      instRef.current = wt;
      setInstance(wt);
      return wt;
    },
    [],
  );

  const chain = useCallback((tours: ChainedTour[]) => {
    const c = new WalkthroughChain(
      tours.map((t) => ({
        ...t,
        options: {
          ...(t.options || {}),
          onStepChange: (i: number) => {
            setCurrentIndex(i);
            t.options?.onStepChange?.(i);
          },
          onFinish: () => {
            t.options?.onFinish?.();
            // chain advances automatically
          },
          onSkip: (r?: string) => {
            t.options?.onSkip?.(r);
          },
        },
      })),
    );
    c.start();
    return c;
  }, []);

	// biome-ignore lint/correctness/useExhaustiveDependencies: deps will cause hook to recursively call itself
	useEffect(() => {
		if (autoStart) {
			start(autoStart.steps, autoStart.options);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	return (
		<WalkthroughContext.Provider
			value={{ start, chain, active, currentIndex, instance: instRef.current }}
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
  if (!ctx) throw new Error("useWalkthrough must be used within WalkthroughProvider");
  return ctx;
}
