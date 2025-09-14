import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		environment: "jsdom",
		globals: true,
		setupFiles: "./vitest.setup.ts",
		coverage: {
			provider: "istanbul", // or 'v8'
			exclude: ['examples/**','public/**'],
		},
		reporters: process.env.GITHUB_ACTIONS ? ['dot', 'github-actions'] : ['verbose'],
	},
});
