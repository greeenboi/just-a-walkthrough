import type { RegisteredTour } from "../../../src/orchestrator";

export const tours: RegisteredTour[] = [
	{
		id: "welcome-dashboard",
		match: "/",
		trigger: "auto",
		steps: [
			{ selector: "body", content: "Welcome! Let's explore the dashboard." },
			{
				selector: "#metric-customers",
				content: "Customer metric shows current active customers.",
			},
			{
				selector: "#metric-orders",
				content: "Orders metric tracks total orders.",
			},
		],
		options: { tourId: "welcome-dashboard", persistProgress: true },
		order: 1,
	},
	{
		id: "nav-tour",
		match: "/",
		trigger: "manual",
		steps: [
			{
				selector: "aside",
				content: "This sidebar helps you navigate across sections.",
			},
			{
				selector: "header",
				content: "Header contains quick actions and user menu.",
			},
		],
		options: { tourId: "nav-tour", persistProgress: true },
		order: 2,
	},
];

export default tours;
