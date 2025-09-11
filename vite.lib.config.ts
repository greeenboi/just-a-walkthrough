import path from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
	build: {
		lib: {
			entry: path.resolve(__dirname, "src/index.ts"),
			name: "WalkthroughLib",
			formats: ["es", "cjs"],
			fileName: (format) =>
				format === "es"
					? "react-walkthrough.esm.js"
					: "react-walkthrough.cjs.js",
		},
		sourcemap: true,
		minify: true,
		rollupOptions: {
			external: ["react", "react-dom"],
		},
	},
});
