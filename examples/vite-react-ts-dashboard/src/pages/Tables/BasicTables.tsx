import ComponentCard from "../../components/common/ComponentCard";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import BasicTableOne from "../../components/tables/BasicTables/BasicTableOne";

export default function BasicTables() {
	return (
		<>
			<PageMeta
				title="React.js Basic Tables Dashboard | TailAdmin - Next.js Admin Dashboard Template"
				description="This is React.js Basic Tables Dashboard page for TailAdmin - React.js Tailwind CSS Admin Dashboard Template"
			/>
			<PageBreadcrumb pageTitle="Basic Tables" data-tour="tables-breadcrumb" />
			<div className="space-y-6" data-tour="tables-wrapper">
				<ComponentCard title="Basic Table 1" data-tour="basic-table-card">
					<div data-tour="basic-table-one"><BasicTableOne /></div>
				</ComponentCard>
			</div>
		</>
	);
}
