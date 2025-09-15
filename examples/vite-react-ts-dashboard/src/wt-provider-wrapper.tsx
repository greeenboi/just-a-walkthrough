import React from "react";
import { WalkthroughProvider } from "../../../src/react-provider";
import WalkthroughDevPanel from "../../../src/dev-panel";
// Using unified CrossPageTour instead of registry-based orchestration
import { CrossPageTour } from "./CrossPageTour";

/**
 * Wrapper component mirroring the Next.js example pattern.
 * Encapsulates provider, orchestration logic and optional dev panel.
 */
export function WalkthroughProviderWrapper({ children }: { children: React.ReactNode }) {
  return (
    <WalkthroughProvider>
      {children}
  <CrossPageTour />
  <WalkthroughDevPanel />
    </WalkthroughProvider>
  );
}
