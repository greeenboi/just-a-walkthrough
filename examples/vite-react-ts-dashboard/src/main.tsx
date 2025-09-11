import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "swiper/swiper-bundle.css";
import "flatpickr/dist/flatpickr.css";
import WalkthroughDevPanel from "../../../src/dev-panel";
import { loadTours } from "../../../src/orchestrator";
import { WalkthroughProvider } from "../../../src/react-provider";
import { RouteOrchestrator } from "../../../src/react-route-orchestrator";
import App from "./App.tsx";

// Lazy load tours module once at startup (optional; RouteOrchestrator also supports dynamicModule prop)
loadTours("./tours.ts").catch((e) => console.warn("Failed to load tours", e));

import { AppWrapper } from "./components/common/PageMeta.tsx";
import { ThemeProvider } from "./context/ThemeContext.tsx";

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<ThemeProvider>
			<WalkthroughProvider>
				<AppWrapper>
					<App />
					<RouteOrchestrator
						pathname={window.location.pathname}
						chain
						dynamicModule="./tours.ts"
					/>
					<WalkthroughDevPanel chainMatches />
				</AppWrapper>
			</WalkthroughProvider>
		</ThemeProvider>
	</StrictMode>,
);
