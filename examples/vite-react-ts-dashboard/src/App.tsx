import { Route, BrowserRouter as Router, Routes } from "react-router";
import { ScrollToTop } from "./components/common/ScrollToTop";
import AppLayout from "./layout/AppLayout";
import Calendar from "./pages/Calendar";
import Home from "./pages/Dashboard/Home";
import FormElements from "./pages/Forms/FormElements";

import BasicTables from "./pages/Tables/BasicTables";
import UserProfiles from "./pages/UserProfiles";
import { RouteOrchestrator } from "../../../src/react-route-orchestrator";
import { WalkthroughProviderWrapper } from "./wt-provider-wrapper";

export default function App() {
	return (
		<>
			<Router>
				<ScrollToTop />
				<WalkthroughProviderWrapper>
				<Routes>
					{/* Dashboard Layout */}
					<Route element={<AppLayout />}>
						<Route index path="/" element={<Home />} />

						{/* Others Page */}
						<Route path="/profile" element={<UserProfiles />} />
						<Route path="/calendar" element={<Calendar />} />

						{/* Forms */}
						<Route path="/form-elements" element={<FormElements />} />

						{/* Tables */}
						<Route path="/basic-tables" element={<BasicTables />} />
					</Route>
				</Routes>
					{/* Route-based orchestration still supported for dynamic changes */}
					<RouteOrchestrator
						pathname={window.location.pathname}
						chain
						dynamicModule="./tours.ts"
					/>
				</WalkthroughProviderWrapper>
			</Router>
		</>
	);
}
