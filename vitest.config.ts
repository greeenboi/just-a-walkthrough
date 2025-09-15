import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		environment: "jsdom",
		globals: true,
		setupFiles: "./vitest.setup.ts",
		coverage: {
			provider: "istanbul", // or 'v8'
			include: ['src/**/*'],
			exclude: ['examples/**','public/**', "*.config.ts", "**/__tests__/**", "**/node_modules/**"],
		},
		reporters: process.env.GITHUB_ACTIONS ? ['dot', 'github-actions'] : ['verbose'],
	},
});
