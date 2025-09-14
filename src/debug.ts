/**
 * @packageDocumentation
 * Internal debug / diagnostics facility for the walkthrough library.
 *
 * This module purposefully produces **no runtime console output** unless a caller
 * explicitly opts-in to debug mode. The aim is to allow deep instrumentation and
 * post‑hoc inspection (a "flight recorder") while keeping production bundles silent
 * and free of accidental information leakage.
 *
 * Debug mode can be enabled through one of three mechanisms (checked in this order):
 * 1. Build‑time environment variable replacement via bundler: `process.env.JUST_A_WALKTHROUGH_DEBUG === 'true'`
 * 2. Runtime global flag assignment: `window.__JUST_A_WALKTHROUGH_DEBUG = true`
 * 3. Programmatic API call: {@link enableDebug}(`true`)
 *
 * Once enabled, calls to {@link recordDebug} append structured events to an in‑memory
 * ring buffer (capped at {@link MAX_EVENTS}). Consumers (e.g. a dev panel) can export
 * the current buffer with {@link dumpWalkthroughDebug}. A convenience printer
 * {@link printWalkthroughDebug} logs the dump (still gated by the active flag).
 *
 * Events are intentionally lightweight (timestamp + category + type + optional message/data)
 * to minimize overhead. Arbitrary nested objects should be avoided; only shallow serialisable
 * metadata is recommended.
 *
 * Categories currently used by the library:
 * - `walkthrough`  – core step / lifecycle events (added when integrating in class)
 * - `orchestrator` – registration & auto‑match events
 * - `react`        – React helper side‑effects
 *
 * Example usage (application code):
 * ```ts
 * import { enableDebug, dumpWalkthroughDebug } from 'just-a-walkthrough/core';
 * enableDebug(true); // turn on instrumentation
 * // ... run some tours ...
 * const snapshot = dumpWalkthroughDebug();
 * console.log('Collected WT events', snapshot);
 * ```
 */

/**
 * A single immutable diagnostic record captured while debug mode is enabled.
 */
export interface DebugEvent {
  t: number;           // timestamp ms
  cat: string;         // category (walkthrough/orchestrator/react)
  type: string;        // event type
  msg?: string;        // optional message
  // Use unknown to avoid implicit any while allowing structured data
  data?: unknown;      // arbitrary structured data (kept shallow)
}

/** Maximum number of events retained in memory (oldest evicted first). */
const MAX_EVENTS = 400;
const events: DebugEvent[] = [];
/** Internal flag tracking explicit enablement (in addition to runtime global). */
let enabled = false;

// Evaluate build-time env (Vite / bundlers replace process.env.*) – fallback to runtime global
try {
  if (typeof process !== 'undefined') {
    const envObj = (process as unknown as { env?: Record<string, string | undefined> }).env;
    if (envObj?.JUST_A_WALKTHROUGH_DEBUG === 'true') enabled = true;
  }
} catch { /* ignore */ }

// Runtime global override (lazy checked each call for flexibility)
function runtimeEnabledFlag(): boolean {
  if (typeof window !== 'undefined') {
    const w = window as unknown as { __JUST_A_WALKTHROUGH_DEBUG?: boolean };
    if (w.__JUST_A_WALKTHROUGH_DEBUG) return true;
  }
  return enabled;
}

/**
 * Programmatically enable / disable walkthrough debug mode.
 * This also writes the runtime global flag so toggling persists for existing code paths.
 *
 * @param v - `true` to enable, `false` to disable.
 */
export function enableDebug(v: boolean) {
  enabled = v;
  if (typeof window !== 'undefined') {
    (window as unknown as { __JUST_A_WALKTHROUGH_DEBUG?: boolean }).__JUST_A_WALKTHROUGH_DEBUG = v;
  }
}

/**
 * Append a structured event to the ring buffer if debug mode is active.
 *
 * @param cat  Logical category (e.g. `orchestrator`).
 * @param type Short event discriminator (e.g. `start`, `finish`).
 * @param msg  Optional human readable message (avoid secrets / PII!).
 * @param data Optional shallow serialisable metadata object.
 */
export function recordDebug(cat: string, type: string, msg?: string, data?: unknown) {
  if (!runtimeEnabledFlag()) return;
  events.push({ t: Date.now(), cat, type, msg, data });
  if (events.length > MAX_EVENTS) events.splice(0, events.length - MAX_EVENTS);
}

/**
 * A snapshot of the current debug state returned by {@link dumpWalkthroughDebug}.
 */
export interface DebugDump {
  generatedAt: string;
  events: DebugEvent[];
  counts: Record<string, number>;
  meta: { total: number };
}

/**
 * Create a serialisable snapshot (does not mutate internal buffer).
 * Includes simple aggregated counts per event type for quick inspection.
 */
export function dumpWalkthroughDebug(): DebugDump {
  const counts: Record<string, number> = {};
  for (const e of events) counts[e.type] = (counts[e.type] || 0) + 1;
  return {
    generatedAt: new Date().toISOString(),
    events: [...events],
    counts,
    meta: { total: events.length },
  };
}

// Optional helper to print dump when enabled (still gated by enabled flag)
/**
 * Convenience helper: if debug mode enabled, prints a full dump via `console.info`.
 * Safe no‑op when disabled.
 */
export function printWalkthroughDebug() {
  if (!runtimeEnabledFlag()) return;
  try {
    // eslint-disable-next-line no-console
    console.info('[walkthrough][debug dump]', dumpWalkthroughDebug());
  } catch {}
}

// Provide safe no-op console-style proxy (only outputs when enabled)
/**
 * A proxy implementing the Console interface shape. Methods are no‑ops unless
 * debug mode is enabled; in that case they forward to the real console with a
 * `[walkthrough]` prefix. Useful for ad‑hoc verbose instrumentation while
 * keeping call sites terse and safe for production.
 */
export const wtDebug = new Proxy({} as Console, {
  get(_t, prop: string) {
    return (...args: unknown[]) => {
      if (!runtimeEnabledFlag()) return;
      try {
        const c: Record<string, ((...a: unknown[]) => void) | undefined> = console as unknown as Record<string, ((...a: unknown[]) => void) | undefined>;
        c[prop]?.('[walkthrough]', ...args);
      } catch {}
    };
  },
});
