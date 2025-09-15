import { useEffect } from "react";
// Import from root source during local development. In a published package you would use 'just-a-walkthrough'.
import { chainAutoMatches } from "../../../src/orchestrator";
import { loadTours } from "../../../src/orchestrator";

// We keep orchestration logic separated so main.tsx stays lean. This mirrors the Next.js example pattern.
// It attempts to load the static tours module (tours.ts) and then chains auto matches for current pathname.

export function WalkthroughOrchestration() {
  useEffect(() => {
    let cancelled = false;
    // Dynamically import tours definition (can be code-split)
    loadTours("./tours.ts").then((_maybe) => {
      if (cancelled) return;
      // If the module didn't already register (loadTours handles registration when array), we could manually register.
      // chain auto matches for this initial load
      chainAutoMatches(window.location.pathname);
    }).catch((e) => console.warn("walkthrough orchestration: failed to load tours", e));

    // On pathname change (simple SPA example), you might call chainAutoMatches again; router integration could be added.

    return () => { cancelled = true; };
  }, []);

  return null;
}
