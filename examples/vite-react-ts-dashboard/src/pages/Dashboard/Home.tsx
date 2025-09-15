/** biome-ignore-all lint/correctness/useUniqueElementIds: id needed for walkthrough tour */

// Walkthrough logic extracted to cross-page component; this page now only renders content.
import PageMeta from "../../components/common/PageMeta";
import DemographicCard from "../../components/ecommerce/DemographicCard";
import EcommerceMetrics from "../../components/ecommerce/EcommerceMetrics";
import MonthlySalesChart from "../../components/ecommerce/MonthlySalesChart";
import MonthlyTarget from "../../components/ecommerce/MonthlyTarget";
import RecentOrders from "../../components/ecommerce/RecentOrders";
import StatisticsChart from "../../components/ecommerce/StatisticsChart";

export default function Home() {
	return (
		<>
			<PageMeta
				title="React.js Ecommerce Dashboard | TailAdmin - React.js Admin Dashboard Template"
				description="This is React.js Ecommerce Dashboard page for TailAdmin - React.js Tailwind CSS Admin Dashboard Template"
			/>
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
