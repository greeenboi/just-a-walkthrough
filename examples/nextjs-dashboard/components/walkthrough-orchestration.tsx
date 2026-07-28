"use client";
import { usePathname } from 'next/navigation';
// Import from root source during local development. In a published scenario use 'just-a-walkthrough'.
import { registerTours, RouteOrchestrator, WalkthroughStep } from '../../../src';

// Define three walkthroughs: intro (cards overview), accounts, transactions/events combined.
// We rely on data-tour attributes injected in content.tsx

const introSteps: WalkthroughStep[] = [
  {
    selector: '[data-tour="accounts-card"]',
    title: 'At-a-glance Accounts',
    content: 'Your institution & wallet balances are summarized here.'
  },
  {
    selector: '[data-tour="transactions-card"]',
    title: 'Recent Activity',
    content: 'Latest transactions for quick reconciliation.'
  },
  {
    selector: '[data-tour="events-card"]',
    title: 'Upcoming Events',
    content: 'Time-bound items and calendar entries show up in this panel.'
  }
];

const accountsDeepDive: WalkthroughStep[] = [
  {
    selector: '[data-tour="accounts-title"]',
    title: 'Accounts Panel',
    content: 'Filter, sort and drill into individual accounts here.'
  }
];

const activityAndEvents: WalkthroughStep[] = [
  {
    selector: '[data-tour="transactions-title"]',
    title: 'Transactions Header',
    content: 'Click rows to view full transaction details.'
  },
  {
    selector: '[data-tour="events-title"]',
    title: 'Events Header',
    content: 'Calendar and upcoming operational events.'
  }
];

// Register tours once at module load (idempotent by id), so they are available before
// RouteOrchestrator's effect runs on first render. Matchers receive the current pathname.
// This example uses Tailwind v3 + shadcn/ui, whose tokens are stored as bare `H S L`
// triples — so the 'shadcn' theme is used with tokenColorFormat: 'hsl'. (On Tailwind v4
// / current shadcn the tokens are full OKLCH colors; use tokenColorFormat: 'raw'.)
const shadcnTheme = { theme: 'shadcn', tokenColorFormat: 'hsl' } as const;

registerTours([
  {
    id: 'dash-intro',
    steps: introSteps,
    match: '/dashboard*',
    options: { tourId: 'dash-intro', persistProgress: true, resume: true, ...shadcnTheme }
  },
  {
    id: 'dash-accounts',
    steps: accountsDeepDive,
    match: '/dashboard*',
    options: { tourId: 'dash-accounts', persistProgress: true, resume: true, ...shadcnTheme }
  },
  {
    id: 'dash-activity',
    steps: activityAndEvents,
    match: '/dashboard*',
    options: { tourId: 'dash-activity', persistProgress: true, resume: true, ...shadcnTheme }
  }
]);

export function WalkthroughOrchestration() {
  const pathname = usePathname();
  // Reactively chain matching auto tours whenever the route changes. Also binds the
  // delegated click-trigger listener (for `trigger: 'click'` / `data-wt-start`).
  return <RouteOrchestrator pathname={pathname} chain />;
}
