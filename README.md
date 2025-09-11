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
