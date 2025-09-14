# just-a-walkthrough

[![npm version](https://img.shields.io/npm/v/just-a-walkthrough.svg)](https://www.npmjs.com/package/just-a-walkthrough)
[![Bundlephobia](https://img.shields.io/bundlephobia/minzip/just-a-walkthrough)](https://bundlephobia.com/package/just-a-walkthrough)
[![License](https://img.shields.io/github/license/greeenboi/just-a-walkthrough)](./LICENSE)
[![Formatted with Biome](https://img.shields.io/badge/Formatted_with-Biome-60a5fa?style=flat&logo=biome)](https://biomejs.dev/)
[![Linted with Biome](https://img.shields.io/badge/Linted_with-Biome-60a5fa?style=flat&logo=biome)](https://biomejs.dev)
[![Checked with Biome](https://img.shields.io/badge/Checked_with-Biome-60a5fa?style=flat&logo=biome)](https://biomejs.dev)

**Framework‑agnostic, zero‑dependency product tour / onboarding walkthrough with optional React helpers.**

## Features

- Spotlight highlight & darkened backdrop (3 panel overlay + focus ring)
- Accessible keyboard navigation (Esc / Enter / ← →) + focus trap
- Auto scroll + responsive reposition on scroll/resize/mutations
- Step hooks (`beforeStep` / `afterStep`) & lifecycle callbacks
- Chain multiple tours with persistence-aware skipping
- LocalStorage progress persistence & resume support
- Optional once‑per‑session logic via orchestrator helper
- Custom tooltip renderer + theming (`default`, `tailwind`, `unstyled`)
- Works with any DOM (vanilla, React, shadcn, portals)
- Tiny, tree‑shakeable (no external deps)

## Install

```bash
npm i just-a-walkthrough
# or
pnpm add just-a-walkthrough
# or
yarn add just-a-walkthrough
```

## Quick Start (Vanilla)

```ts
import { startWalkthrough } from 'just-a-walkthrough';

startWalkthrough([
  { selector: '#hero-cta', title: 'Welcome', content: 'Click here to begin.' },
  { selector: '.nav-settings', title: 'Settings', content: 'Manage preferences.' }
]);
```

## React Example

```tsx
import { useEffect } from 'react';
import { startWalkthrough } from 'just-a-walkthrough';

export function Onboard() {
  useEffect(() => {
    const inst = startWalkthrough([
      { selector: '#dash-metric', title: 'Metrics' },
      { selector: '#create-btn', title: 'Create', content: 'Start something new' },
    ], { persistProgress: true, tourId: 'main-onboarding' });
    return () => inst.destroy();
  }, []);
  return null;
}
```

## Orchestrator (Route-based Tours)

```ts
import { registerTours, startAutoMatches } from 'just-a-walkthrough';

registerTours([
  { id: 'home-tour', match: '/home', steps: [ { selector: '#welcome', title: 'Hi!' } ] },
  { id: 'settings-tour', match: '/settings', steps: [ { selector: '#profile', title: 'Profile' } ], oncePerSession: true }
]);

// Call on route change
startAutoMatches({ pathname: window.location.pathname });
```

## API Surface (Core)

`startWalkthrough(steps, options)` – convenience wrapper returning a `Walkthrough` instance.

`Walkthrough` key methods:

- `start(index?)` – begin tour (auto called by helper)
- `next()/prev()`
- `finish()` – mark completed & cleanup
- `skip(reason?)`
- `destroy()` – cleanup without marking completed

Persistence options (when `persistProgress: true` & `tourId` set):

- Saves `{ index, completed }` in `localStorage` under `__walkthrough:<tourId>`
- Resumes if not completed and `resume !== false`

## Theming

Use `theme: 'tailwind'` to rely on your Tailwind stack (supply utility classes) or `unstyled` to supply all styling manually.

## Chain Multiple Tours

```ts
import { WalkthroughChain } from 'just-a-walkthrough';
new WalkthroughChain([
  { id: 'a', steps: [ { selector: '#x' } ] },
  { id: 'b', steps: [ { selector: '#y' } ], options: { persistProgress: true, tourId: 'b' } }
]).start();
```

Completed persistent tours are skipped automatically.

## React Integration (Provider & Hook)

For React apps you can wrap your tree with the `WalkthroughProvider` to get easy access to `start` and `chain` helpers plus reactive state (current index, active flag):

```tsx
import { WalkthroughProvider, useWalkthrough } from 'just-a-walkthrough/react';

function LaunchTourButton() {
  const { start, active } = useWalkthrough();
  return (
    <button
      disabled={active}
      onClick={() => start([
        { selector: '#logo', title: 'Logo' },
        { selector: '#settings', title: 'Settings' },
      ], { persistProgress: true, tourId: 'react-main' })}
    >Start Tour</button>
  );
}

export function App() {
  return (
    <WalkthroughProvider>
      <LaunchTourButton />
      {/* rest of app */}
    </WalkthroughProvider>
  );
}
```

Auto start on mount:

```tsx
<WalkthroughProvider autoStart={{ steps, options }} />
```

## React Route Orchestrator Component

If you want automatic starting of registered route-based tours when the location changes, use the `RouteOrchestrator` helper:

```tsx
import { RouteOrchestrator } from 'just-a-walkthrough/react';
import { registerTours } from 'just-a-walkthrough';

registerTours([
  { id: 'home-tour', match: '/home', trigger: 'auto', steps: [ { selector: '#home-title', title: 'Home' } ] },
  { id: 'profile-tour', match: /\/users\//, trigger: 'auto', steps: [ { selector: '#avatar', title: 'Avatar' } ], order: 10 },
]);

function Routes({ pathname }: { pathname: string }) {
  return (
    <>
      <RouteOrchestrator pathname={pathname} chain onStartIds={ids => console.log('Started tours', ids)} />
      {/* your routed UI */}
    </>
  );
}
```

Lazy load a module containing tour registrations before matching:

```tsx
<RouteOrchestrator pathname={pathname} dynamicModule={() => import('./tours')} />
```

## Dev Panel (Development Only)

The optional `WalkthroughDevPanel` gives you a floating inspector for tours: start them manually, run auto matches, chain matches, and reset persistence.

```tsx
import { WalkthroughDevPanel } from 'just-a-walkthrough/react';

function Root() {
  return (
    <>
      {/* app UI */}
      {import.meta.env.DEV && <WalkthroughDevPanel chainMatches />}
    </>
  );
}
```

Features:

- Lists all registered tours with matcher summary.
- Shows completion status (persistent tours).
- Start / Reset per tour; Reset All.
- Run Matches (or Chain Matches if `chainMatches` prop true).
- Collapsible; collapsed state stored in `localStorage` (`__wt_devpanel_collapsed`).

Do NOT ship this to production (reveals internal tour structure).

## Debugging / Diagnostics

Instrumentation is available but silent by default. To enable and inspect internal events you can use one of:

1. Build-time env var (e.g. with Vite): `JUST_A_WALKTHROUGH_DEBUG=true`
2. Runtime flag: `window.__JUST_A_WALKTHROUGH_DEBUG = true`
3. API call: `enableDebug(true)`

Events recorded include categories:
`walkthrough` (start, step, resolved, missing, finish, skip), `orchestrator` (registration, match, chain), `react` (route effects, dynamic loads).

```ts
import { enableDebug, dumpWalkthroughDebug, printWalkthroughDebug } from 'just-a-walkthrough/debug';

enableDebug(true);
// run some tours ...

// Safe summary only (counts + meta, no raw events)
printWalkthroughDebug();

// Full detail (explicit opt-in) with redaction example
printWalkthroughDebug({
  full: true,
  redact: e => ({ ...e, data: undefined })
});

const snapshot = dumpWalkthroughDebug(); // programmatic access
```

Security: by default `printWalkthroughDebug()` prints only aggregate counts (avoids leaking selectors or user data). Pass `{ full: true }` consciously in trusted environments.

You can also access a console proxy `wtDebug` which is a no-op unless debug is enabled:

```ts
import { wtDebug } from 'just-a-walkthrough/debug';
wtDebug.log('current tour id', currentId);
```

## Advanced Usage Notes

- Use `waitMs: 0` (or global `stepWaitMs: 0`) for elements that are guaranteed to be present to avoid unnecessary polling.
- Prefer chaining tours when you have progressive disclosure flows; persistent tours auto-skip if already completed, keeping chains idempotent.
- When dynamically removing highlighted elements mid-step (e.g. route transitions), the MutationObserver repositions but if the element disappears the next navigation call will resolve again. Consider guarding with required steps if element is critical.

## Accessibility Notes

- Focus ring container traps tab order (unless `disableFocusTrap: true`)
- Live region announces step titles (`aria-live="polite"`)
- Esc always available (when `keyboard: true`)

## Zero-Wait Configuration

Specify `stepWaitMs: 0` and/or per-step `waitMs: 0` to disable polling for elements (single lookup). `stepPollIntervalMs` is clamped to a minimum of 1ms internally when waiting.

## Development

```bash
npm i
npm run dev      # playground
npm test         # vitest (jsdom)
npm run build    # library build + types
```

## Publishing (Maintainers)

```bash
npm run build && npm test
npm version patch   # or minor / major
git push && git push --tags
npm publish --access public
```

## License

AGPL-3.0-only – see [LICENSE](./LICENSE). For commercial / alternative licensing reach out.

---

Contributions welcome. Open an issue or PR with ideas / improvements.
