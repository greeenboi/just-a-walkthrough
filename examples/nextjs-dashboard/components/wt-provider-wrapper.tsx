"use client";
import { WalkthroughProvider, WalkthroughDevPanel } from '../../../src';
import { WalkthroughOrchestration } from './walkthrough-orchestration';

// Dev panel can be optionally imported; leaving out to keep UI clean but demonstrating how to add.
// import { WalkthroughDevPanel } from '../../..';

export default function WalkthroughProviderWrapper({ children }: { children: React.ReactNode }) {
  return (
    <WalkthroughProvider>
      {children}
      <WalkthroughOrchestration />
      <WalkthroughDevPanel />
    </WalkthroughProvider>
  );
}
