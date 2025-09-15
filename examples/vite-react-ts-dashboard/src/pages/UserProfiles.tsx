import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import UserAddressCard from "../components/UserProfile/UserAddressCard";
import UserInfoCard from "../components/UserProfile/UserInfoCard";
import UserMetaCard from "../components/UserProfile/UserMetaCard";

export default function UserProfiles() {
	return (
		<>
			<PageMeta
				title="React.js Profile Dashboard | TailAdmin - Next.js Admin Dashboard Template"
				description="This is React.js Profile Dashboard page for TailAdmin - React.js Tailwind CSS Admin Dashboard Template"
			/>
			<PageBreadcrumb pageTitle="Profile" />
			<div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
				<h3 className="mb-5 text-lg font-semibold text-gray-800 dark:text-white/90 lg:mb-7" data-tour="profile-heading">Profile</h3>
				<div className="space-y-6">
					<UserMetaCard />
					<UserInfoCard />
					<UserAddressCard />
				</div>
			</div>
		</>
	);
}
