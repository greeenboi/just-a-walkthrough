/**
 * @packageDocumentation
 * Zero-dependency registry + event bus tracking currently *active* walkthrough
 * instances.
 *
 * The core {@link Walkthrough} class registers itself here on `start()` and removes
 * itself on teardown (`finish` / `skip` / `destroy`). Step changes also notify
 * subscribers so external tooling (e.g. the dev panel) can reflect live state without
 * being coupled to the React provider or to how a tour was started (provider,
 * orchestrator, or a direct `startWalkthrough` call).
 *
 * This mirrors the design of {@link module:debug} — a small module-level store with a
 * subscribe/emit surface — and adds no runtime dependencies.
 *
 * Example:
 * ```ts
 * import { subscribeActive, getActiveInstance } from 'just-a-walkthrough';
 * const unsub = subscribeActive((instances) => {
 *   console.log('active tours', instances.length);
 * });
 * // ... later
 * unsub();
 * ```
 */
import type { Walkthrough, WalkthroughOptions } from "./walkthrough";

/**
 * A lightweight, serialisable-ish snapshot of a running (or last-known) walkthrough.
 * `options` is a shallow readonly copy of the instance's resolved options and is safe
 * to read for seeding UI controls; do not mutate it (use `Walkthrough.updateOptions`).
 */
export interface ActiveTourSnapshot {
	/** The tour id (from `options.tourId`) if persistence / identification is enabled. */
	id?: string;
	/** Current 0-based step index (-1 before the first step is shown). */
	index: number;
	/** Total number of steps in the tour. */
	total: number;
	/** Whether the instance is currently active (overlay mounted). */
	active: boolean;
	/** Shallow readonly copy of the instance's resolved options. */
	options: Readonly<WalkthroughOptions>;
	/** Lightweight per-step descriptors (selector + optional title). */
	steps: Array<{ selector: string; title?: string }>;
}

/** Listener invoked with the current ordered list of active instances (most recent last). */
export type ActiveListener = (instances: Walkthrough[]) => void;

// Ordered list (most recently started is last) so `getActiveInstance()` is deterministic.
const active: Walkthrough[] = [];
const listeners = new Set<ActiveListener>();

/** Return a shallow copy of all currently active instances (most recent last). */
export function listActiveInstances(): Walkthrough[] {
	return [...active];
}

/** Return the most recently started active instance, or null if none. */
export function getActiveInstance(): Walkthrough | null {
	return active.length ? active[active.length - 1] : null;
}

/**
 * Subscribe to active-instance changes (start / step change / teardown).
 * @returns an unsubscribe function.
 */
export function subscribeActive(cb: ActiveListener): () => void {
	listeners.add(cb);
	return () => {
		listeners.delete(cb);
	};
}

function emit() {
	const snapshot = [...active];
	listeners.forEach((l) => {
		try {
			l(snapshot);
		} catch {
			/* subscriber errors must not break the tour */
		}
	});
}

/** @internal Register an instance as active. Called by `Walkthrough.start()`. */
export function __registerActive(w: Walkthrough) {
	if (!active.includes(w)) active.push(w);
	emit();
}

/** @internal Remove an instance. Called by `Walkthrough` teardown. */
export function __unregisterActive(w: Walkthrough) {
	const i = active.indexOf(w);
	if (i >= 0) active.splice(i, 1);
	emit();
}

/** @internal Notify subscribers without changing membership (e.g. on step change). */
export function __emitActive() {
	emit();
}
