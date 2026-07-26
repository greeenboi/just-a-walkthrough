/**
 * Route / predicate based tour registration and auto‑execution utilities.
 *
 * This module lets applications declare *tours* (arrays of walkthrough steps) tied to
 * pathname patterns or arbitrary predicates. At runtime you can:
 *  - Register tours up‑front or dynamically (code‑splitting friendly)
 *  - Auto start all (or first) matching tours for the current route
 *  - Chain multiple matching tours sequentially with persistence-aware skipping
 *  - Manually start tours by id and reset persisted progress
 *
 * Persistence: if a tour uses `persistProgress + tourId` in its options, completion state
 * is stored in `localStorage` under `__walkthrough:<tourId>`. By default, `skipIfCompleted`
 * is true so previously completed tours won't auto start again. Session gating is
 * also supported via `oncePerSession` which uses `sessionStorage` to avoid repeating a tour
 * within the same tab session.
 */

import { listActiveInstances } from "./active-registry";
import { recordDebug } from "./debug";
import type { WalkthroughOptions, WalkthroughStep } from "./walkthrough";
import { startWalkthrough, WalkthroughChain } from "./walkthrough";

// Runtime guard for SSR / non-DOM environments (matches src/walkthrough.ts).
const hasDOM = typeof window !== "undefined" && typeof document !== "undefined";

/** Definition of a tour tied to a route (pathname pattern) or predicate. */
/**
 * Declarative description of a tour bound to a route match or custom matcher.
 */
export interface RegisteredTour {
	id: string; // unique tour id (should match tourId if using persistence)
	/** Simple string exact match, prefix (ending with *), RegExp, or custom matcher function. */
	match: string | RegExp | ((pathname: string) => boolean);
	steps: WalkthroughStep[];
	options?: WalkthroughOptions; // passed to startWalkthrough
	/**
	 * When the tour is eligible to start:
	 *  - `auto` (default): starts when its `match` matches during auto/chain runs.
	 *  - `manual`: only started programmatically via {@link startTourById}.
	 *  - `click`: started when a matching trigger element is clicked (see
	 *    `triggerSelector` / the `data-wt-start` attribute) once {@link bindTourTriggers}
	 *    is active. Excluded from auto/chain runs.
	 */
	trigger?: "auto" | "manual" | "click";
	/**
	 * CSS selector of the element(s) that start this tour when the `triggerEvent` fires
	 * (only relevant for `trigger: 'click'`). Matching uses `element.closest(selector)`
	 * so clicks on descendants of the trigger also count. If omitted, the tour is still
	 * reachable via a `data-wt-start="<id>"` attribute.
	 */
	triggerSelector?: string;
	/** Event that starts a `click` tour. Default `'click'`. */
	triggerEvent?: keyof HTMLElementEventMap;
	/**
	 * For `trigger: 'click'` (and explicit trigger starts): when true, an explicit
	 * click always starts the tour, ignoring `oncePerSession` / `skipIfCompleted` /
	 * `condition`. Default false (gating is honored, consistent with auto starts).
	 */
	ignoreGatingOnClick?: boolean;
	/** Only start if this returns truthy (async allowed). */
	condition?: () => boolean | Promise<boolean>;
	/** If true, only start once per browser session (sessionStorage). */
	oncePerSession?: boolean;
	/** If true and tour already completed (persistProgress), skip automatically. Default true. */
	skipIfCompleted?: boolean;
	/** Optional order for chaining; lower runs first. Defaults to declaration order. */
	order?: number;
}

interface InternalRegisteredTour extends RegisteredTour {}

const registry: InternalRegisteredTour[] = [];

/**
 * Register (or replace) a single tour. Replaces existing definition if ids collide.
 *
 * @param tour - The tour definition to add.
 */
export function registerTour(tour: RegisteredTour) {
	const existingIdx = registry.findIndex((t) => t.id === tour.id);
	if (existingIdx >= 0) registry.splice(existingIdx, 1, tour);
	else registry.push(tour);
	recordDebug("orchestrator", "register", tour.id, { match: tour.match });
}

/** Register multiple tours in order. */
export function registerTours(tours: RegisteredTour[]) {
	tours.forEach(registerTour);
}

/** Return a shallow copy of all registered tours (in insertion order). */
export function listTours() {
	return [...registry];
}

/** Remove all registered tours (no effect on persisted progress). */
export function clearTours() {
	registry.splice(0, registry.length);
	recordDebug("orchestrator", "clear", "all");
}

/**
 * Compute all tours whose matcher matches the provided pathname.
 * Simple string exact, prefix (`/app/*`) or RegExp / function matchers supported.
 */
export function findMatchingTours(pathname: string) {
	const matches = registry.filter((t) => matchPath(t.match, pathname));
	recordDebug("orchestrator", "match", pathname, { count: matches.length });
	return matches;
}

function matchPath(
	pattern: RegisteredTour["match"],
	pathname: string,
): boolean {
	if (typeof pattern === "string") {
		if (pattern.endsWith("*")) return pathname.startsWith(pattern.slice(0, -1));
		return pathname === pattern;
	}
	if (pattern instanceof RegExp) return pattern.test(pathname);
	return pattern(pathname);
}

function progressKey(tourId?: string) {
	return tourId ? `__walkthrough:${tourId}` : undefined;
}

/**
 * Check if a persisted tour id is marked completed in localStorage.
 * @param tourId - The `tourId` used when persisting progress.
 */
export function isTourCompleted(tourId: string): boolean {
	try {
		const key = progressKey(tourId);
		if (!key) return false;
		const raw = localStorage.getItem(key);
		if (!raw) return false;
		const data = JSON.parse(raw);
		return !!data?.completed;
	} catch {
		return false;
	}
}

/** Clear persisted progress for a single tour id. */
export function clearTourProgress(tourId: string) {
	try {
		const key = progressKey(tourId);
		if (key) localStorage.removeItem(key);
	} catch {}
}

/** Options controlling auto start behaviour for a pathname match. */
export interface StartMatchOptions {
	pathname: string;
	/** If true, start only the first auto match; else all auto matches sequentially via chaining. */
	firstOnly?: boolean;
}

/** Start matching auto tours for a given pathname. Returns started tour IDs. */
/**
 * Start matching auto tours for a given pathname.
 *
 * Applies filtering: trigger=auto, condition(), oncePerSession, skipIfCompleted.
 * Tours start immediately (unordered) unless `firstOnly` is true.
 *
 * @returns array of started tour ids (in the order they were begun).
 */
export async function startAutoMatches({
	pathname,
	firstOnly,
}: StartMatchOptions): Promise<string[]> {
	const matches = findMatchingTours(pathname).filter(
		(t) => (t.trigger ?? "auto") === "auto",
	);
	const started: string[] = [];
	for (const tour of matches) {
		const id = await maybeStartTour(tour);
		if (id) {
			started.push(id);
			if (firstOnly) break;
		}
	}
	return started;
}

/**
 * Shared gating + start path used by auto matches and explicit trigger starts.
 * Applies `oncePerSession`, `skipIfCompleted`, and `condition` (unless `ignoreGating`),
 * then starts the tour via {@link startWalkthrough}. Returns the started tour id, or
 * `null` if it was gated out.
 */
async function maybeStartTour(
	tour: RegisteredTour,
	{ ignoreGating = false }: { ignoreGating?: boolean } = {},
): Promise<string | null> {
	const {
		id,
		condition,
		oncePerSession,
		options,
		skipIfCompleted = true,
	} = tour;
	const tourId = options?.tourId || id;
	if (!ignoreGating) {
		if (oncePerSession && sessionStorage.getItem(`__wt_session_started:${id}`))
			return null;
		// Only skip previously completed tours when skipIfCompleted is true (default).
		if (skipIfCompleted && options?.persistProgress && isTourCompleted(tourId))
			return null;
		if (condition && !(await condition())) {
			recordDebug("orchestrator", "condition-skip", id);
			return null;
		}
	}
	recordDebug("orchestrator", "start", id, { skipIfCompleted, ignoreGating });
	// Preserve existing tourId override if provided, else default to id for persistence.
	startWalkthrough(tour.steps, { tourId, ...options });
	try {
		sessionStorage.setItem(`__wt_session_started:${id}`, "1");
	} catch {}
	return id;
}

/** True if a tour with the given (resolved) tourId currently has an active instance. */
function isTourRunning(tourId: string): boolean {
	return listActiveInstances().some((i) => i.getSnapshot().id === tourId);
}

// --- Click / DOM trigger binding -------------------------------------------
let triggersBound = false;
let delegatedHandler: EventListener | null = null;
const boundEvents: string[] = [];

/**
 * Start a tour by id via the explicit-trigger path (used by click triggers and
 * `data-wt-start`). Honors gating unless the tour opts into `ignoreGatingOnClick`.
 * No-ops (with a debug marker) if the id is unknown or the tour is already running.
 */
export async function startTourByTrigger(id: string): Promise<string | null> {
	const tour = registry.find((t) => t.id === id);
	if (!tour) {
		recordDebug("orchestrator", "trigger-miss", id);
		return null;
	}
	const tourId = tour.options?.tourId || tour.id;
	if (isTourRunning(tourId)) {
		recordDebug("orchestrator", "trigger-dupe", id);
		return null;
	}
	return maybeStartTour(tour, {
		ignoreGating: tour.ignoreGatingOnClick ?? false,
	});
}

function handleTriggerEvent(e: Event): void {
	const target = e.target as Element | null;
	if (!target || typeof target.closest !== "function") return;
	// 1. Explicit attribute binding: data-wt-start="<tourId>"
	const attrEl = target.closest("[data-wt-start]");
	if (attrEl) {
		const id = attrEl.getAttribute("data-wt-start");
		if (id) {
			void startTourByTrigger(id);
			return;
		}
	}
	// 2. Registered click tours whose triggerSelector matches this event/target.
	for (const t of registry) {
		if (t.trigger !== "click" || !t.triggerSelector) continue;
		if ((t.triggerEvent ?? "click") !== e.type) continue;
		if (target.closest(t.triggerSelector)) {
			void startTourByTrigger(t.id);
			return;
		}
	}
}

/**
 * Install a single delegated document-level listener that starts tours on click (or a
 * tour's custom `triggerEvent`) and on `data-wt-start` attribute clicks. Idempotent and
 * SSR-guarded. Call once (e.g. from `RouteOrchestrator`); pair with
 * {@link unbindTourTriggers} on teardown.
 */
export function bindTourTriggers(): void {
	if (!hasDOM || triggersBound) return;
	const events = new Set<string>(["click"]);
	for (const t of registry) {
		if (t.trigger === "click" && t.triggerEvent) events.add(t.triggerEvent);
	}
	delegatedHandler = handleTriggerEvent as EventListener;
	events.forEach((ev) =>
		document.addEventListener(ev, delegatedHandler as EventListener, true),
	);
	boundEvents.splice(0, boundEvents.length, ...events);
	triggersBound = true;
	recordDebug("orchestrator", "triggers-bound", undefined, {
		events: [...events],
	});
}

/** Remove the delegated trigger listener installed by {@link bindTourTriggers}. */
export function unbindTourTriggers(): void {
	if (delegatedHandler) {
		boundEvents.forEach((ev) =>
			document.removeEventListener(ev, delegatedHandler as EventListener, true),
		);
	}
	delegatedHandler = null;
	boundEvents.splice(0, boundEvents.length);
	triggersBound = false;
	recordDebug("orchestrator", "triggers-unbound");
}

/** Chain and run all matching auto tours sequentially (respecting order). */
/**
 * Chain and run all matching auto tours sequentially (sorted by `order` then insertion).
 * Each tour starts only after the previous finishes / skips. Persistence rules are applied.
 *
 * @returns ids list and a {@link WalkthroughChain} instance (or null if none matched).
 */
export async function chainAutoMatches(
	pathname: string,
): Promise<{ ids: string[]; chain: WalkthroughChain | null }> {
	const matches = findMatchingTours(pathname).filter(
		(t) => (t.trigger ?? "auto") === "auto",
	);
	const prepared: RegisteredTour[] = [];
	for (const tour of matches) {
		const {
			id,
			condition,
			oncePerSession,
			options,
			skipIfCompleted = true,
		} = tour;
		if (oncePerSession && sessionStorage.getItem(`__wt_session_started:${id}`))
			continue;
		if (
			skipIfCompleted &&
			options?.persistProgress &&
			options.tourId &&
			isTourCompleted(options.tourId)
		)
			continue;
		if (condition) {
			if (!(await condition())) continue;
		}
		prepared.push(tour);
	}
	if (!prepared.length) {
		recordDebug("orchestrator", "chain-none", pathname);
		return { ids: [], chain: null };
	}
	const sorted = [...prepared].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
	const ids = sorted.map((s) => s.id);
	// biome-ignore lint/suspicious/useIterableCallbackReturn: bruh
	sorted.forEach((t) =>
		sessionStorage.setItem(`__wt_session_started:${t.id}`, "1"),
	);
	const chain = new WalkthroughChain(
		sorted.map((t) => ({
			id: t.id,
			steps: t.steps,
			options: { tourId: t.id, ...t.options },
		})),
	);
	recordDebug("orchestrator", "chain-start", pathname, { ids });
	chain.start();
	return { ids, chain };
}

/** Manually start a tour by id (regardless of trigger type). */
/** Manually start a tour by id regardless of trigger type. */
export function startTourById(id: string) {
	const t = registry.find((rt) => rt.id === id);
	if (!t) throw new Error(`Tour '${id}' not registered`);
	recordDebug("orchestrator", "manual-start", id);
	return startWalkthrough(t.steps, { tourId: t.id, ...t.options });
}

/**
 * Merge option overrides into a registered tour's `options` so they persist across
 * restarts (used by the dev panel's live config editor). Does not affect an already
 * running instance — call `Walkthrough.updateOptions` for that.
 *
 * @param id - Registered tour id.
 * @param partial - Option fields to merge (undefined values are ignored).
 * @returns true if the tour existed and was updated.
 */
export function updateTourOptions(
	id: string,
	partial: Partial<WalkthroughOptions>,
): boolean {
	const tour = registry.find((t) => t.id === id);
	if (!tour) return false;
	const clean: Record<string, unknown> = {};
	for (const [k, v] of Object.entries(partial)) {
		if (v !== undefined) clean[k] = v;
	}
	tour.options = {
		...(tour.options || {}),
		...(clean as Partial<WalkthroughOptions>),
	};
	recordDebug("orchestrator", "update-tour-options", id, {
		keys: Object.keys(clean),
	});
	return true;
}

/** Utility to bulk reset all persisted tours (useful in a dev panel). */
/** Reset persisted progress for every registered tour (utility for dev tools). */
export function resetAllTourProgress() {
	registry.forEach((t) => {
		if (t.options?.tourId || t.id) clearTourProgress(t.options?.tourId || t.id);
	});
	recordDebug("orchestrator", "reset-progress", "all");
}

/** Dynamically import a module that exports tours (default export or named 'tours'). */
/**
 * Dynamically import a module expected to export an array of tours (default / named export).
 * If an array is found it is registered and also returned. Non-array exports pass through.
 */
export async function loadTours(moduleSpecifier: string) {
	const mod = (await import(/* @vite-ignore */ moduleSpecifier)) as Record<
		string,
		unknown
	>;
	const maybeTours =
		(mod as { tours?: unknown }).tours ??
		(mod as { default?: unknown }).default ??
		(mod as { toursDefault?: unknown }).toursDefault;
	if (Array.isArray(maybeTours)) registerTours(maybeTours as RegisteredTour[]);
	return maybeTours;
}

// Provide a lightweight global (opt-in) for debugging if desired
// (window as any).walkthroughRegistry = registry;
