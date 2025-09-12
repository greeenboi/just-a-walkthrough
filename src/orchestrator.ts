import type { WalkthroughOptions, WalkthroughStep } from "./walkthrough";
import { startWalkthrough, WalkthroughChain } from "./walkthrough";
import { recordDebug } from "./debug";

/** Definition of a tour tied to a route (pathname pattern) or predicate. */
export interface RegisteredTour {
	id: string; // unique tour id (should match tourId if using persistence)
	/** Simple string exact match, prefix (ending with *), RegExp, or custom matcher function. */
	match: string | RegExp | ((pathname: string) => boolean);
	steps: WalkthroughStep[];
	options?: WalkthroughOptions; // passed to startWalkthrough
	trigger?: "auto" | "manual"; // auto: start when matched (default), manual: only programmatic
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

export function registerTour(tour: RegisteredTour) {
	const existingIdx = registry.findIndex((t) => t.id === tour.id);
	if (existingIdx >= 0) registry.splice(existingIdx, 1, tour);
	else registry.push(tour);
	recordDebug("orchestrator", "register", tour.id, { match: tour.match });
}

export function registerTours(tours: RegisteredTour[]) {
	tours.forEach(registerTour);
}

export function listTours() {
	return [...registry];
}

export function clearTours() {
	registry.splice(0, registry.length);
	recordDebug("orchestrator", "clear", "all");
}

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

export function clearTourProgress(tourId: string) {
	try {
		const key = progressKey(tourId);
		if (key) localStorage.removeItem(key);
	} catch {}
}

export interface StartMatchOptions {
	pathname: string;
	/** If true, start only the first auto match; else all auto matches sequentially via chaining. */
	firstOnly?: boolean;
}

/** Start matching auto tours for a given pathname. Returns started tour IDs. */
export async function startAutoMatches({
	pathname,
	firstOnly,
}: StartMatchOptions): Promise<string[]> {
	const matches = findMatchingTours(pathname).filter(
		(t) => (t.trigger ?? "auto") === "auto",
	);
	const started: string[] = [];
	for (const tour of matches) {
		const {
			id,
			condition,
			oncePerSession,
			options,
			steps,
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
			if (!(await condition())) {
				recordDebug("orchestrator", "condition-skip", id);
				continue;
			}
		}
		recordDebug("orchestrator", "start", id);
		startWalkthrough(steps, { tourId: id, ...options });
		sessionStorage.setItem(`__wt_session_started:${id}`, "1");
		started.push(id);
		if (firstOnly) break;
	}
	return started;
}

/** Chain and run all matching auto tours sequentially (respecting order). */
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
export function startTourById(id: string) {
	const t = registry.find((rt) => rt.id === id);
	if (!t) throw new Error(`Tour '${id}' not registered`);
	recordDebug("orchestrator", "manual-start", id);
	return startWalkthrough(t.steps, { tourId: t.id, ...t.options });
}

/** Utility to bulk reset all persisted tours (useful in a dev panel). */
export function resetAllTourProgress() {
	registry.forEach((t) => {
		if (t.options?.tourId || t.id) clearTourProgress(t.options?.tourId || t.id);
	});
	recordDebug("orchestrator", "reset-progress", "all");
}

/** Dynamically import a module that exports tours (default export or named 'tours'). */
export async function loadTours(moduleSpecifier: string) {
	const mod = (await import(/* @vite-ignore */ moduleSpecifier)) as Record<string, unknown>;
	const maybeTours =
		(mod as { tours?: unknown }).tours ??
		(mod as { default?: unknown }).default ??
		(mod as { toursDefault?: unknown }).toursDefault;
	if (Array.isArray(maybeTours)) registerTours(maybeTours as RegisteredTour[]);
	return maybeTours;
}

// Provide a lightweight global (opt-in) for debugging if desired
// (window as any).walkthroughRegistry = registry;
