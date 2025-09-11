import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { startWalkthrough, Walkthrough } from "../src/walkthrough";

function cleanupDom() {
	document
		.querySelectorAll(".wt-root")
		.forEach((n) => n.parentElement?.removeChild(n));
}

beforeEach(() => {
	localStorage.clear();
	sessionStorage.clear();
	document.body.innerHTML = "";
});

afterEach(() => {
	cleanupDom();
});

describe("Walkthrough basic behavior", () => {
	it("starts, renders and finishes with completion persistence", async () => {
		const el = document.createElement("button");
		el.id = "target";
		el.textContent = "Click";
		document.body.appendChild(el);
		const onFinish = vi.fn();
		const wt = new Walkthrough(
			[{ selector: "#target", title: "Step 1", content: "Hello", focus: true }],
			{
				persistProgress: true,
				tourId: "tour-basic",
				onFinish,
				stepWaitMs: 0,
				stepPollIntervalMs: 0,
				scrollIntoView: false,
			},
		);
		await wt.start();
		expect(document.querySelector(".wt-root")).toBeTruthy();
		wt.finish();
		expect(onFinish).toHaveBeenCalledTimes(1);
		const rawStored = localStorage.getItem("__walkthrough:tour-basic");
		expect(rawStored).toBeTruthy();
		const stored = rawStored ? JSON.parse(rawStored) : {};
		expect(stored.completed).toBe(true);
	});

	it("persists partial progress and resumes from last index", async () => {
		const one = document.createElement("div");
		one.id = "one";
		one.textContent = "One";
		const two = document.createElement("div");
		two.id = "two";
		two.textContent = "Two";
		document.body.append(one, two);
		const steps = [
			{ selector: "#one", title: "First" },
			{ selector: "#two", title: "Second" },
		];
		const wt1 = new Walkthrough(steps, {
			persistProgress: true,
			tourId: "tour-resume",
			stepWaitMs: 0,
			stepPollIntervalMs: 0,
			scrollIntoView: false,
		});
		await wt1.start();
		wt1.next(); // move to second (index 1)
		// wait a microtask for async go() to finish
		await new Promise((r) => setTimeout(r, 0));
		let savedIndex = -1;
		for (let i = 0; i < 5 && savedIndex !== 1; i++) {
			const rawSaved = localStorage.getItem("__walkthrough:tour-resume");
			if (rawSaved) {
				try {
					savedIndex = JSON.parse(rawSaved).index;
				} catch {}
			}
			if (savedIndex !== 1) await new Promise((r) => setTimeout(r, 0));
		}
		expect(savedIndex).toBe(1);
		// destroy without finishing (simulate page reload)
		wt1.destroy();
		cleanupDom();
		const wt2 = new Walkthrough(steps, {
			persistProgress: true,
			tourId: "tour-resume",
			resume: true,
			stepWaitMs: 0,
			stepPollIntervalMs: 0,
			scrollIntoView: false,
		});
		await wt2.start();
		// Should have resumed at second step (title Second)
		const title = document.querySelector(".wt-tooltip h3")?.textContent;
		expect(title).toBe("Second");
		wt2.finish();
	});

	it("skips non-required missing step and shows next", async () => {
		const present = document.createElement("div");
		present.id = "present";
		document.body.appendChild(present);
		const wt = new Walkthrough(
			[
				{ selector: "#missing", title: "Missing", waitMs: 0 },
				{ selector: "#present", title: "Present" },
			],
			{ stepWaitMs: 0, stepPollIntervalMs: 0, scrollIntoView: false },
		);
		await wt.start(); // allow async go chain
		await new Promise((r) => setTimeout(r, 0));
		// Should have skipped to second step
		const title = document.querySelector(".wt-tooltip h3")?.textContent;
		expect(title).toBe("Present");
		wt.finish();
	});

	it("required missing element causes skip with reason", async () => {
		const onSkip = vi.fn();
		const wt = new Walkthrough(
			[{ selector: "#nope", required: true, waitMs: 0 }],
			{ onSkip, stepWaitMs: 0, stepPollIntervalMs: 0, scrollIntoView: false },
		);
		await wt.start();
		await new Promise((r) => setTimeout(r, 0));
		expect(onSkip).toHaveBeenCalledTimes(1);
		expect(onSkip.mock.calls[0][0]).toMatch(/Required element not found/);
	});

	it("keyboard navigation works (next, prev, finish, esc)", async () => {
		const flush = () => new Promise((r) => setTimeout(r, 0));
		const a = document.createElement("div");
		a.id = "a";
		const b = document.createElement("div");
		b.id = "b";
		document.body.append(a, b);
		const onFinish = vi.fn();
		const onSkip = vi.fn();
		const wt = new Walkthrough(
			[
				{ selector: "#a", title: "A" },
				{ selector: "#b", title: "B" },
			],
			{
				onFinish,
				onSkip,
				stepWaitMs: 5,
				stepPollIntervalMs: 1,
				scrollIntoView: false,
			},
		);
		await wt.start();
		// Press ArrowRight -> next
		document.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight" }));
		await flush();
		const titleB = document.querySelector(".wt-tooltip h3")?.textContent;
		expect(titleB).toBe("B");
		// ArrowLeft -> go back
		document.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft" }));
		await flush();
		const titleA = document.querySelector(".wt-tooltip h3")?.textContent;
		expect(titleA).toBe("A");
		// Esc should skip
		document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
		await flush();
		expect(onSkip).toHaveBeenCalled();
		expect(onFinish).not.toHaveBeenCalled();
	});
});

describe("startWalkthrough convenience", () => {
	it("returns instance and starts immediately", () => {
		const el = document.createElement("div");
		el.id = "s";
		document.body.appendChild(el);
		const inst = startWalkthrough([{ selector: "#s", title: "S" }], {
			stepWaitMs: 5,
			stepPollIntervalMs: 1,
			scrollIntoView: false,
		});
		expect(inst).toBeInstanceOf(Walkthrough);
	});
});
