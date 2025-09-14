"use client";
import { useEffect } from 'react';
// Import from root source during local development. In a published scenario use 'just-a-walkthrough'.
import { registerTours, chainAutoMatches, WalkthroughStep } from '../../../src';

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

export function WalkthroughOrchestration() {
  useEffect(() => {
    // Register tours for the dashboard pathname
    registerTours([
      {
        id: 'dash-intro',
        steps: introSteps,
        match: () => window.location.pathname.startsWith('/dashboard'),
        options: { tourId: 'dash-intro', persistProgress: true, resume: true }
      },
      {
        id: 'dash-accounts',
        steps: accountsDeepDive,
        match: () => window.location.pathname.startsWith('/dashboard'),
        options: { tourId: 'dash-accounts', persistProgress: true, resume: true }
      },
      {
        id: 'dash-activity',
        steps: activityAndEvents,
        match: () => window.location.pathname.startsWith('/dashboard'),
        options: { tourId: 'dash-activity', persistProgress: true, resume: true }
      }
    ]);

    // Chain matching auto tours for this pathname (skips already completed ones via persistence)
    chainAutoMatches(window.location.pathname);
  }, []);

  return null;
}
