import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	getActiveInstance,
	listActiveInstances,
	subscribeActive,
} from "../src/active-registry";
import { startWalkthrough } from "../src/walkthrough";

beforeEach(() => {
	document.body.innerHTML = "";
	localStorage.clear();
});

afterEach(() => {
	listActiveInstances().forEach((i) => i.destroy());
	document.getElementById("__walkthrough_styles")?.remove();
	document.querySelectorAll(".wt-root").forEach((n) => n.remove());
});

function addTarget(id: string) {
	const el = document.createElement("div");
	el.id = id;
	document.body.appendChild(el);
	return el;
}

describe("active-registry", () => {
	it("registers on start and unregisters on finish", () => {
		addTarget("a");
		expect(listActiveInstances()).toHaveLength(0);
		const wt = startWalkthrough([{ selector: "#a", waitMs: 0 }], {
			stepPollIntervalMs: 0,
		});
		expect(listActiveInstances()).toContain(wt);
		expect(getActiveInstance()).toBe(wt);
		wt.finish();
		expect(listActiveInstances()).toHaveLength(0);
		expect(getActiveInstance()).toBeNull();
	});

	it("notifies subscribers on start/step/finish and stops after unsubscribe", () => {
		addTarget("a");
		let count = 0;
		const unsub = subscribeActive(() => {
			count++;
		});
		const wt = startWalkthrough([{ selector: "#a", waitMs: 0 }], {
			stepPollIntervalMs: 0,
		});
		expect(count).toBeGreaterThan(0);
		const afterStart = count;
		wt.finish();
		expect(count).toBeGreaterThan(afterStart);
		unsub();
		const afterUnsub = count;
		const wt2 = startWalkthrough([{ selector: "#a", waitMs: 0 }], {
			stepPollIntervalMs: 0,
		});
		wt2.finish();
		expect(count).toBe(afterUnsub);
	});

	it("getActiveInstance returns the most recently started instance", () => {
		addTarget("a");
		const w1 = startWalkthrough([{ selector: "#a", waitMs: 0 }], {
			stepPollIntervalMs: 0,
		});
		const w2 = startWalkthrough([{ selector: "#a", waitMs: 0 }], {
			stepPollIntervalMs: 0,
		});
		expect(getActiveInstance()).toBe(w2);
		w2.destroy();
		expect(getActiveInstance()).toBe(w1);
	});
});
