// Debug / diagnostics utility for just-a-walkthrough
// Logging is completely silent unless explicitly enabled via:
//  1. Environment variable at build time: process.env.JUST_A_WALKTHROUGH_DEBUG === 'true'
//  2. Setting window.__JUST_A_WALKTHROUGH_DEBUG = true in runtime console
//  3. Calling enableDebug(true)
// Provides an in-memory ring buffer of recent events so a user can call dumpWalkthroughDebug()
// to obtain structured diagnostic information without leaking logs in production.

export interface DebugEvent {
  t: number;           // timestamp ms
  cat: string;         // category (walkthrough/orchestrator/react)
  type: string;        // event type
  msg?: string;        // optional message
  // Use unknown to avoid implicit any while allowing structured data
  data?: unknown;      // arbitrary structured data (kept shallow)
}

const MAX_EVENTS = 400;
const events: DebugEvent[] = [];
let enabled: boolean = false;

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

export function enableDebug(v: boolean) {
  enabled = v;
  if (typeof window !== 'undefined') {
    (window as unknown as { __JUST_A_WALKTHROUGH_DEBUG?: boolean }).__JUST_A_WALKTHROUGH_DEBUG = v;
  }
}

export function recordDebug(cat: string, type: string, msg?: string, data?: unknown) {
  if (!runtimeEnabledFlag()) return;
  events.push({ t: Date.now(), cat, type, msg, data });
  if (events.length > MAX_EVENTS) events.splice(0, events.length - MAX_EVENTS);
}

export interface DebugDump {
  generatedAt: string;
  events: DebugEvent[];
  counts: Record<string, number>;
  meta: { total: number };
}

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
export function printWalkthroughDebug() {
  if (!runtimeEnabledFlag()) return;
  try {
    // eslint-disable-next-line no-console
    console.info('[walkthrough][debug dump]', dumpWalkthroughDebug());
  } catch {}
}

// Provide safe no-op console-style proxy (only outputs when enabled)
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
