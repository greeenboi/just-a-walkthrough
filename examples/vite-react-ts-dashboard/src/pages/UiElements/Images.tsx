import ComponentCard from "../../components/common/ComponentCard";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import ResponsiveImage from "../../components/ui/images/ResponsiveImage";
import ThreeColumnImageGrid from "../../components/ui/images/ThreeColumnImageGrid";
import TwoColumnImageGrid from "../../components/ui/images/TwoColumnImageGrid";

export default function Images() {
	return (
		<>
			<PageMeta
				title="React.js Images Dashboard | TailAdmin - React.js Admin Dashboard Template"
				description="This is React.js Images page for TailAdmin - React.js Tailwind CSS Admin Dashboard Template"
			/>
			<PageBreadcrumb pageTitle="Images" />
			<div className="space-y-5 sm:space-y-6">
				<ComponentCard title="Responsive image">
					<ResponsiveImage />
				</ComponentCard>
				<ComponentCard title="Image in 2 Grid">
					<TwoColumnImageGrid />
				</ComponentCard>
				<ComponentCard title="Image in 3 Grid">
					<ThreeColumnImageGrid />
				</ComponentCard>
			</div>
		</>
	);
}
