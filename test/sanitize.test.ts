import { describe, expect, it } from "vitest";
import type { WalkthroughStep } from "../src";
import { startWalkthrough } from "../src";

// We indirectly test sanitizeHTML by constructing a walkthrough with malicious content
// and inspecting the rendered tooltip DOM.

describe("walkthrough content sanitization", () => {
	function getTooltip(): HTMLElement | null {
		return document.querySelector(".wt-tooltip");
	}

	function baseStep(html: string, allowUnsafeHTML?: boolean): WalkthroughStep {
		return {
			selector: "#target",
			content: html,
			title: "T",
			allowUnsafeHTML,
		} as WalkthroughStep;
	}

	function setupTarget() {
		const el = document.createElement("div");
		el.id = "target";
		document.body.appendChild(el);
	}

	it("removes script tags and event handlers", async () => {
		setupTarget();
		const steps: WalkthroughStep[] = [
			baseStep('<p onclick="alert(1)">Hi<script>alert(2)</script></p>'),
		];
		const wt = startWalkthrough(steps, {
			stepWaitMs: 0,
			stepPollIntervalMs: 0,
		});
		await new Promise((r) => setTimeout(r, 10));
		const tooltip = getTooltip();
		expect(tooltip).toBeTruthy();
		if (!tooltip) throw new Error("tooltip not found");
		const html = tooltip.innerHTML;
		expect(html).not.toContain("script");
		expect(html).not.toContain("onclick");
		wt.destroy();
	});

	it("allows safe http links but strips javascript urls", async () => {
		setupTarget();
		const steps: WalkthroughStep[] = [
			baseStep(
				'<a href="https://example.com" onclick="alert(1)">Link</a><a href="javascript:alert(2)">Bad</a>',
			),
		];
		const wt = startWalkthrough(steps, {
			stepWaitMs: 0,
			stepPollIntervalMs: 0,
		});
		await new Promise((r) => setTimeout(r, 10));
		const tooltip = getTooltip();
		if (!tooltip) throw new Error("tooltip not found");
		const links = tooltip.querySelectorAll("a");
		expect(links.length).toBe(2);
		const hrefs = Array.from(links).map((a) => a.getAttribute("href"));
		expect(hrefs).toContain("https://example.com");
		// second link should have lost its href attribute
		expect(hrefs).toContain(null);
		wt.destroy();
	});

	it("can opt out via allowUnsafeHTML (dangerous)", async () => {
		setupTarget();
		const steps: WalkthroughStep[] = [
			baseStep('<p onclick="alert(1)">Hi<script>alert(2)</script></p>', true),
		];
		const wt = startWalkthrough(steps, {
			stepWaitMs: 0,
			stepPollIntervalMs: 0,
		});
		await new Promise((r) => setTimeout(r, 10));
		const tooltip = getTooltip();
		if (!tooltip) throw new Error("tooltip not found");
		const html = tooltip.innerHTML;
		// raw string should still be present (demonstrating skip of sanitizer)
		expect(html).toContain("onclick");
		expect(html).toContain("script");
		wt.destroy();
	});
});
