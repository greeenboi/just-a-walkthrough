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

interface WalkthroughContextValue {
	start: (
		steps: WalkthroughStep[],
		options?: WalkthroughOptions,
	) => Walkthrough;
	chain: (tours: ChainedTour[]) => WalkthroughChain;
	active: boolean;
	currentIndex: number | null;
	instance: Walkthrough | null;
}

const WalkthroughContext = createContext<WalkthroughContextValue | undefined>(
	undefined,
);

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
						// chain will internally start next
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

export function useWalkthrough() {
	const ctx = useContext(WalkthroughContext);
	if (!ctx)
		throw new Error("useWalkthrough must be used within WalkthroughProvider");
	return ctx;
}
