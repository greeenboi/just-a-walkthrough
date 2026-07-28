# just-a-walkthrough

[![npm version](https://img.shields.io/npm/v/just-a-walkthrough.svg)](https://www.npmjs.com/package/just-a-walkthrough)
[![Bundlephobia](https://img.shields.io/bundlephobia/minzip/just-a-walkthrough)](https://bundlephobia.com/package/just-a-walkthrough)
[![License](https://img.shields.io/github/license/greeenboi/just-a-walkthrough)](./LICENSE)
[![Formatted with Biome](https://img.shields.io/badge/Formatted_with-Biome-60a5fa?style=flat&logo=biome)](https://biomejs.dev/)
[![Linted with Biome](https://img.shields.io/badge/Linted_with-Biome-60a5fa?style=flat&logo=biome)](https://biomejs.dev)
[![Checked with Biome](https://img.shields.io/badge/Checked_with-Biome-60a5fa?style=flat&logo=biome)](https://biomejs.dev)

**Framework‑agnostic, zero‑dependency product tour / onboarding walkthrough with optional React helpers.**

https://github.com/user-attachments/assets/27a1aff2-ca36-4b82-9b21-62209dff055f


> Support us on PeerList!!
<a href="https://peerlist.io/greeenboi/project/just-a-walkthrough" target="_blank" rel="noreferrer">
				<img
					src="https://peerlist.io/api/v1/projects/embed/PRJH7B8B78OLBLD8P169AJGJDDKRLA?showUpvote=false&theme=dark"
					alt="Just A Walkthrough"
					style="width: auto; height: 72px;"
				/>
			</a>

## Features

- Spotlight highlight & darkened backdrop (3 panel overlay + focus ring)
- Accessible keyboard navigation (Esc / Enter / ← →) + focus trap
- Auto scroll + responsive reposition on scroll/resize/mutations
- Step hooks (`beforeStep` / `afterStep`) & lifecycle callbacks
- Chain multiple tours with persistence-aware skipping
- LocalStorage progress persistence & resume support
- Optional once‑per‑session logic via orchestrator helper
- Start tours on page open (auto), programmatically, or on click (`trigger: 'click'` / `data-wt-start`)
- Custom tooltip renderer + theming (`default`, `shadcn`, `tailwind`, `unstyled`) — shadcn works on Tailwind v3 & v4
- Vue-devtools-style dev panel: wireframe flow + live config editing
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

Choose a `theme` in `WalkthroughOptions`:

| `theme` | What it does |
| --- | --- |
| `default` | Self-contained injected CSS. No external styles required. |
| `shadcn` | Styles the overlay/ring/tooltip using your shadcn/ui design tokens (CSS variables) at runtime. **Recommended for shadcn apps.** |
| `tailwind` | Adds Tailwind utility classes (`bg-popover`, `border-primary`, …). ⚠️ You must ensure those classes are generated (see note below). |
| `unstyled` | No styling — bring your own via `tooltipClass` / `ringClass` / `overlayClass`. |

### shadcn / Tailwind support (v3 **and** v4)

The overlay is created at runtime, so Tailwind's JIT never "sees" utility classes the
library adds — with `theme: 'tailwind'` they get purged and the tour renders unstyled
unless you safelist them. **`theme: 'shadcn'` avoids this entirely** by referencing your
design tokens as CSS variables directly, so it works regardless of purge and inherits
your light/dark theme automatically.

shadcn's token format differs between Tailwind majors, so pick `tokenColorFormat`:

```ts
// Tailwind v4 / current shadcn (tokens are full OKLCH colors)
startWalkthrough(steps, { theme: 'shadcn' }); // tokenColorFormat: 'raw' (default)

// Tailwind v3 shadcn (tokens are bare `H S L` triples)
startWalkthrough(steps, { theme: 'shadcn', tokenColorFormat: 'hsl' });
```

Remap which CSS variables are used with `themeVars`:

```ts
startWalkthrough(steps, {
  theme: 'shadcn',
  themeVars: { primary: '--accent', ring: '--accent' },
});
```

Roles: `popover`, `popoverForeground`, `border`, `primary`, `primaryForeground`, `ring`
(defaulting to `--popover`, `--popover-foreground`, `--border`, `--primary`,
`--primary-foreground`, `--ring`).

If you prefer `theme: 'tailwind'` (utility classes), add the library to your Tailwind
`content` / safelist so the classes are generated — e.g. on v4:
`@source "../node_modules/just-a-walkthrough/dist";`

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

Lazy load a module containing tour registrations before matching (pass a module
specifier **string**, which is `import()`-ed internally):

```tsx
<RouteOrchestrator pathname={pathname} dynamicModule="./tours" />
```

Mounting `RouteOrchestrator` also activates click triggers (see below).

## Click Triggers (start a tour on click)

Besides `auto` (start on route match) and `manual` (programmatic only), a tour can use
`trigger: 'click'` to start when a matching element is clicked. Two ways to wire it:

**1. Declarative `data-wt-start` attribute** — works on any element once the delegated
listener is active (mount `RouteOrchestrator`, or call `bindTourTriggers()` yourself):

```tsx
registerTour({ id: 'help', trigger: 'click', match: '*', steps: [/* … */] });

// anywhere in your UI (clicks on descendants count too):
<button data-wt-start="help">Take the tour</button>
```

**2. A `triggerSelector`** on the registration (no attribute needed):

```ts
registerTour({
  id: 'help',
  trigger: 'click',
  triggerSelector: '#help-button',
  match: '*',
  steps: [/* … */],
});
```

**React helpers:**

```tsx
import { TourTrigger, useTourTrigger } from 'just-a-walkthrough';

<TourTrigger tourId="help">Take the tour</TourTrigger>;
// or
const startHelp = useTourTrigger('help');
<button onClick={startHelp}>Take the tour</button>;
```

Notes:
- Clicks are de-duplicated: a second click while the tour is running is ignored.
- By default click starts honor gating (`oncePerSession` / `skipIfCompleted` /
  `condition`). Set `ignoreGatingOnClick: true` on the tour to always start on click.
- `click` (and `manual`) tours are excluded from `startAutoMatches` / `chainAutoMatches`.

## Dev Panel (Development Only)

The optional `WalkthroughDevPanel` is a Vue-devtools-style floating inspector for tours,
with three tabs:

- **Tours** — list registered tours (matcher summary, completed/pending/running), start/
  restart/reset each, and jump to any step of the running tour.
- **Wireframe** — an SVG graph of every tour's step flow (grouped by match); the live
  step is highlighted and nodes of a running tour are clickable to jump.
- **Config** — live-edit the selected tour's options (theme, backdrop, colors, behavior
  toggles). Changes apply immediately to a running tour and persist across restarts/
  reloads (`localStorage` `__wt_devpanel_tweaks:<id>`).

It reads live state from the core active-instances registry, so it reflects tours
started by any means — provider, orchestrator, click trigger, or a direct call.

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

Also:

- Run Matches (or Chain Matches if `chainMatches` prop true); Refresh; Reset All.
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

HTML Content Sanitization: step `content` strings are sanitized by default (removes `<script>`, `<style>`, `<iframe>` etc., strips event handler attributes like `onclick`, and blocks unsafe URL schemes such as `javascript:`). This mitigates XSS if tour definitions incorporate user‑generated text. If you absolutely trust the source, set `allowUnsafeHTML: true` on an individual step to bypass the sanitizer—but prefer leaving it enabled.

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

## Changelog

This project maintains an automated changelog based on git commits and package.json versions. See [CHANGELOG.md](./CHANGELOG.md) for release history and [docs/CHANGELOG_GENERATION.md](./docs/CHANGELOG_GENERATION.md) for details on the generation process.

## Development

```bash
npm i
npm run dev      # playground
npm test         # vitest (jsdom)
npm run build    # library build + types
npm run changelog # generate/update changelog based on commits
```

## Publishing (Maintainers)

```bash
npm run build && npm test
npm version patch   # or minor / major
npm run changelog   # update changelog with new version
git push && git push --tags
npm publish --access public
```

## License

AGPL-3.0-only – see [LICENSE](./LICENSE). For commercial / alternative licensing reach out.

---

Contributions welcome. Open an issue or PR with ideas / improvements.
