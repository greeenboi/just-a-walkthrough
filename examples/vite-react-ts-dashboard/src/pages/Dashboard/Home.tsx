/** biome-ignore-all lint/correctness/useUniqueElementIds: id needed for walkthrough tour */

import { useCallback } from "react";
// NOTE: Adjusted relative path to reach library root (needed 5 levels up from Dashboard folder)
import { useWalkthrough } from "../../../../../src/react-provider";
import PageMeta from "../../components/common/PageMeta";
import DemographicCard from "../../components/ecommerce/DemographicCard";
import EcommerceMetrics from "../../components/ecommerce/EcommerceMetrics";
import MonthlySalesChart from "../../components/ecommerce/MonthlySalesChart";
import MonthlyTarget from "../../components/ecommerce/MonthlyTarget";
import RecentOrders from "../../components/ecommerce/RecentOrders";
import StatisticsChart from "../../components/ecommerce/StatisticsChart";

export default function Home() {
	const { start } = useWalkthrough();

	const startChartsTour = useCallback(() => {
		console.info("[charts-intro] starting charts walkthrough");
		start(
			[
				{
					selector: "#chart-monthly-sales",
					title: "Monthly Sales",
					content:
						"Trend of sales performance. Use this to monitor seasonality.",
					focus: false,
				},
				{
					selector: "#chart-monthly-target",
					title: "Targets",
					content: "Progress toward monthly targets and KPIs.",
				},
				{
					selector: "#chart-statistics",
					title: "Statistics Overview",
					content:
						"Higher level aggregate statistics across your key dimensions.",
				},
				{
					selector: "#chart-demographic",
					title: "Demographics",
					content: "Breakdown of user population across demographic segments.",
				},
				{
					selector: "#chart-recent-orders",
					title: "Recent Orders",
					content: "Latest orders flowing through; useful for live monitoring.",
				},
			],
			{
				tourId: "charts-intro",
				persistProgress: true,
				theme: "default", // switch to default to verify visibility; change back to 'tailwind' after confirming
				scrollIntoView: true,
				zIndex: 200000, // force over any high z-index UI layers
				onStepChange: (i) => console.info("[charts-intro] step", i),
				onFinish: () => console.info("[charts-intro] finished"),
				onSkip: (r) => console.info("[charts-intro] skipped", r),
			},
		);
	}, [start]);

	return (
		<>
			<PageMeta
				title="React.js Ecommerce Dashboard | TailAdmin - React.js Admin Dashboard Template"
				description="This is React.js Ecommerce Dashboard page for TailAdmin - React.js Tailwind CSS Admin Dashboard Template"
			/>
			<div className="flex items-center justify-end mb-4">
				<button
					type="button"
					onClick={startChartsTour}
					className="px-3 py-2 text-sm font-medium text-white rounded-md bg-brand-500 hover:bg-brand-600 focus:outline-none focus:ring focus:ring-brand-400/50"
				>
					Start Charts Tour
				</button>
			</div>
			<div className="grid grid-cols-12 gap-4 md:gap-6">
				<div className="col-span-12 space-y-6 xl:col-span-7">
					<EcommerceMetrics />

					<div id="chart-monthly-sales">
						<MonthlySalesChart />
					</div>
				</div>

				<div className="col-span-12 xl:col-span-5" id="chart-monthly-target">
					<MonthlyTarget />
				</div>

				<div className="col-span-12" id="chart-statistics">
					<StatisticsChart />
				</div>

				<div className="col-span-12 xl:col-span-5" id="chart-demographic">
					<DemographicCard />
				</div>

				<div className="col-span-12 xl:col-span-7" id="chart-recent-orders">
					<RecentOrders />
				</div>
			</div>
		</>
	);
}
