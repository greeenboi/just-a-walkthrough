import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import UserAddressCard from "../components/UserProfile/UserAddressCard";
import UserInfoCard from "../components/UserProfile/UserInfoCard";
import UserMetaCard from "../components/UserProfile/UserMetaCard";
// TEMP: using relative import until 'just-a-walkthrough' is added as dependency or workspace alias configured
import { useWalkthrough } from "../../../../src/react-provider";
import { useCallback } from "react";

export default function UserProfiles() {
	const { start } = useWalkthrough();

	const startProfileTour = useCallback(() => {
		start([
			{ selector: '[data-tour="profile-heading"]', title: 'Profile Page', content: 'Overview of your profile and editable information.' },
			{ selector: '[data-tour="profile-meta-card"]', title: 'Meta Card', content: 'High level identity & social presence.' },
			{ selector: '[data-tour="profile-avatar"]', title: 'Avatar', content: 'Your current avatar image.' },
			{ selector: '[data-tour="profile-name"]', title: 'Display Name', content: 'Publicly visible name & location.' },
			{ selector: '[data-tour="profile-edit-button"]', title: 'Edit Profile', content: 'Open the edit modal to change profile data.'},
		], { tourId: 'profile-tour', persistProgress: true, theme: 'default', scrollIntoView: true, stepWaitMs: 8000 });
	}, [start]);

	return (
		<>
			<PageMeta
				title="React.js Profile Dashboard | TailAdmin - Next.js Admin Dashboard Template"
				description="This is React.js Profile Dashboard page for TailAdmin - React.js Tailwind CSS Admin Dashboard Template"
			/>
			<PageBreadcrumb pageTitle="Profile" />
			<div className="mb-4 flex justify-end">
				<button onClick={startProfileTour} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-500 focus:outline-none focus:ring focus:ring-indigo-400/50">Start Profile Tour</button>
			</div>
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
