# Next.js Dashboard Walkthrough Integration

This example shows how to integrate **just-a-walkthrough** in a Next.js (App Router) dashboard and orchestrate multiple tours (intro + deep dives) on a single route.

## What This Demonstrates

- Adding stable `data-tour` attributes to key UI elements
- Declaring multiple tours bound to a single pathname (`/dashboard`)
- Persistence with `persistProgress + tourId` so completed tours are skipped on reload
- Chaining tours with automatic skipping of already-completed ones
- Provider setup in a central layout with a small orchestration component

## Files Added / Modified

| File | Purpose |
|------|---------|
| `components/kokonutui/content.tsx` | Added `data-tour` attributes for selectors. |
| `components/walkthrough-orchestration.tsx` | Registers & chains three tours for `/dashboard`. |
| `components/wt-provider-wrapper.tsx` | Wraps children with `WalkthroughProvider` & mounts orchestration. |
| `app/layout.tsx` | Injects the provider wrapper around the app. |

## Tour Definitions

We define three tours:

1. `dash-intro` – High level overview of the three dashboard panels.
2. `dash-accounts` – Focused look at the Accounts panel.
3. `dash-activity` – Transactions + Events panels.

Each tour sets `persistProgress: true` with a `tourId` matching its `id`. When a tour has already completed, it is skipped automatically in the chain.

## Registration & Chaining

`walkthrough-orchestration.tsx` (client component):

```tsx
useEffect(() => {
  registerTours([
    { id: 'dash-intro', steps: introSteps, match: () => location.pathname.startsWith('/dashboard'), options: { tourId: 'dash-intro', persistProgress: true, resume: true } },
    { id: 'dash-accounts', steps: accountsDeepDive, match: () => location.pathname.startsWith('/dashboard'), options: { tourId: 'dash-accounts', persistProgress: true, resume: true } },
    { id: 'dash-activity', steps: activityAndEvents, match: () => location.pathname.startsWith('/dashboard'), options: { tourId: 'dash-activity', persistProgress: true, resume: true } },
  ]);
  // Chain in declared order (skips completed via persistence)
  chainAutoMatches(window.location.pathname);
}, []);
```

`chainAutoMatches(pathname)` returns the ids and a chain instance; you can ignore the return value for fire‑and‑forget behavior.

## Provider Setup

`wt-provider-wrapper.tsx` ensures the provider & orchestration run only on the client:

```tsx
"use client";
import { WalkthroughProvider } from 'just-a-walkthrough';
import { WalkthroughOrchestration } from './walkthrough-orchestration';

export default function Wrapper({ children }) {
  return (
    <WalkthroughProvider>
      {children}
      <WalkthroughOrchestration />
    </WalkthroughProvider>
  );
}
```

Then imported in `app/layout.tsx` and wrapped around `{children}`.

## Selectors

Data attributes provide stable references:

- `[data-tour="accounts-card"]`
- `[data-tour="transactions-card"]`
- `[data-tour="events-card"]`
- `[data-tour="accounts-title"]`
- `[data-tour="transactions-title"]`
- `[data-tour="events-title"]`

## Extending

- Add a Dev Panel: import `WalkthroughDevPanel` and render inside the provider (dev only).
- Route-based Orchestrator: instead of manual `useEffect`, you can use the `ReactRouteOrchestrator` component from the library to auto-run / chain matches.
- Conditional Tours: Provide `condition` in `registerTours` entries (async supported).

## Security Note

HTML in step `content` is sanitized by default. Only set `allowUnsafeHTML: true` for trusted, static strings.

## Resetting Progress

Open DevTools and run:

```js
localStorage.clear(); sessionStorage.clear();
```

Reload to replay all tours.

---

For library API details see the root README.
