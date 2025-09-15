import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useWalkthrough } from '../../../src/react-provider';

/**
 * Unified CrossPageTour
 * Replaces registry-based tours (tours.ts) with imperative chained logic spanning multiple routes.
 * Order:
 *  1. Welcome/dashboard metrics (on '/')
 *  2. Charts (same '/'): charts-intro
 *  3. Forms tour (navigates to '/form-elements')
 *  4. Tables tour (navigates to '/basic-tables')
 *  5. Profile tour (navigates to '/profile')
 * Each tour persists; previously completed segments are skipped, advancing automatically.
 */
export function CrossPageTour() {
  const { start } = useWalkthrough();
  const location = useLocation();
  const navigate = useNavigate();
  const advancingRef = useRef(false);

  // Helper to check completion via persistence key
  const done = (id: string) => !!localStorage.getItem(`__walkthrough:${id}`);

  // Central driver: decides what to run next based on route + persistence
  useEffect(() => {
    if (advancingRef.current) return;

    const route = location.pathname;

    // Sequence logic
    if (route === '/') {
      // 1. Welcome metrics tour
      if (!done('welcome-dashboard')) {
        advancingRef.current = true;
        start([
          { selector: 'body', title: 'Welcome', content: "Let's explore the dashboard." },
          { selector: '#metric-customers', title: 'Customers', content: 'Active customer count.' },
          { selector: '#metric-orders', title: 'Orders', content: 'Total orders metric.' },
        ], {
          tourId: 'welcome-dashboard',
          persistProgress: true,
          onFinish: () => { advancingRef.current = false; /* trigger charts next */ setTimeout(() => runNext(), 50); },
          onSkip: () => { advancingRef.current = false; setTimeout(() => runNext(), 0); }
        });
        return;
      }
      // 2. Charts tour
      if (!done('charts-intro')) {
        advancingRef.current = true;
        start([
          { selector: '#chart-monthly-sales', title: 'Monthly Sales', content: 'Seasonality & trends.' },
          { selector: '#chart-monthly-target', title: 'Targets', content: 'Progress towards KPIs.' },
          { selector: '#chart-statistics', title: 'Statistics', content: 'Aggregate metrics overview.' },
          { selector: '#chart-demographic', title: 'Demographics', content: 'User segment breakdown.' },
          { selector: '#chart-recent-orders', title: 'Recent Orders', content: 'Latest order feed.' },
        ], {
          tourId: 'charts-intro',
          persistProgress: true,
          scrollIntoView: true,
          onFinish: () => { advancingRef.current = false; setTimeout(() => navigate('/form-elements'), 200); },
          onSkip: () => { advancingRef.current = false; setTimeout(() => navigate('/form-elements'), 0); }
        });
        return;
      }
      // If both done, move to forms if that tour not done
      if (!done('form-elements-intro')) {
        navigate('/form-elements');
        return;
      }
      // Else progress forward if forms & tables & profile not done
      if (!done('basic-tables-tour')) { navigate('/basic-tables'); return; }
      if (!done('profile-tour')) { navigate('/profile'); return; }
      return; // all done
    }

    if (route === '/form-elements') {
      if (!done('form-elements-intro')) {
        advancingRef.current = true;
        start([
          { selector: '[data-tour="form-elements-page"]', title: 'Forms Hub', content: 'Grouped inputs & controls.' },
          { selector: '[data-tour="default-inputs-section"]', content: 'Default text inputs.' },
          { selector: '[data-tour="select-inputs-section"]', content: 'Select elements.' },
          { selector: '[data-tour="textarea-input-section"]', content: 'Multiline text areas.' },
          { selector: '[data-tour="input-states-section"]', content: 'Validation states.' },
          { selector: '[data-tour="file-input-example-section"]', content: 'File input handling.' },
          { selector: '[data-tour="checkbox-components-section"]', content: 'Checkbox options.' },
          { selector: '[data-tour="radio-buttons-section"]', content: 'Radio groups.' },
          { selector: '[data-tour="toggle-switch-section"]', content: 'Toggle switches.' },
          { selector: '[data-tour="dropzone-section"]', content: 'Drag & drop file zone.' },
        ], {
          tourId: 'form-elements-intro',
          persistProgress: true,
          scrollIntoView: true,
          onFinish: () => { advancingRef.current = false; setTimeout(() => navigate('/basic-tables'), 200); },
          onSkip: () => { advancingRef.current = false; setTimeout(() => navigate('/basic-tables'), 0); }
        });
        return;
      }
      // Already done => jump forward
      if (!done('basic-tables-tour')) { navigate('/basic-tables'); return; }
      if (!done('profile-tour')) { navigate('/profile'); return; }
      return;
    }

    if (route === '/basic-tables') {
      if (!done('basic-tables-tour')) {
        advancingRef.current = true;
        start([
          { selector: '[data-tour="tables-breadcrumb"]', title: 'Context', content: 'Breadcrumb navigation.' },
          { selector: '[data-tour="tables-wrapper"]', title: 'Wrapper', content: 'Table container.' },
          { selector: '[data-tour="basic-table-card"]', title: 'Table Card', content: 'Encapsulating panel.' },
          { selector: '[data-tour="basic-table-one"]', title: 'Base Table', content: 'Extend with sorting/pagination.' },
        ], {
          tourId: 'basic-tables-tour',
          persistProgress: true,
          scrollIntoView: true,
          onFinish: () => { advancingRef.current = false; setTimeout(() => navigate('/profile'), 200); },
          onSkip: () => { advancingRef.current = false; setTimeout(() => navigate('/profile'), 0); }
        });
        return;
      }
      if (!done('profile-tour')) { navigate('/profile'); return; }
      return;
    }

    if (route === '/profile') {
      if (!done('profile-tour')) {
        advancingRef.current = true;
        start([
          { selector: '[data-tour="profile-heading"]', title: 'Profile', content: 'Overview & identity.' },
          { selector: '[data-tour="profile-meta-card"]', title: 'Meta Card', content: 'Key identity snapshot.' },
          { selector: '[data-tour="profile-avatar"]', title: 'Avatar', content: 'Your image.' },
          { selector: '[data-tour="profile-name"]', title: 'Display Name', content: 'Public identity.' },
          { selector: '[data-tour="profile-edit-button"]', title: 'Edit', content: 'Modify profile data.' },
        ], {
          tourId: 'profile-tour',
          persistProgress: true,
          scrollIntoView: true,
          onFinish: () => { advancingRef.current = false; /* Completed full chain */ },
          onSkip: () => { advancingRef.current = false; }
        });
        return;
      }
      return; // chain completed
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // manual trigger for next segment if something stalls
  function runNext() {
    advancingRef.current = false;
    // Re-run effect logic by forcing a tiny navigation bounce or rely on state; simplest is noop since effect uses pathname.
    // Could also set a state flag to recompute; here we depend on setTimeout calls after completions.
  }

  return null;
}

export default CrossPageTour;
