import { describe, expect, it } from "vitest";
import {
	dumpWalkthroughDebug,
	enableDebug,
	printWalkthroughDebug,
	wtDebug,
} from "../src/debug";
import { startWalkthrough } from "../src/walkthrough";

function captureConsole(fn: () => void) {
  const origLog = console.log;
  const origInfo = console.info;
  const logs: string[] = [];
	const push: (...args: unknown[]) => void = (...args: unknown[]) => {
		logs.push(args.map(String).join(" "));
	};
  console.log = push;
	console.info = push;
  try { fn(); } finally {
    console.log = origLog;
    console.info = origInfo;
  }
  return logs.join("\n");
}

describe("debug module", () => {
	it("records events when enabled and prints summary by default", async () => {
		enableDebug(true);
		const tmp = document.createElement("div");
		tmp.id = "dbg";
		document.body.appendChild(tmp);
		startWalkthrough([{ selector: "#dbg", title: "Dbg", content: "Test" }], {
			stepWaitMs: 0,
			stepPollIntervalMs: 0,
		});
		await new Promise((r) => setTimeout(r, 10));
		const snapshot = dumpWalkthroughDebug();
		expect(snapshot.events.length).toBeGreaterThan(0);
		const out = captureConsole(() => printWalkthroughDebug());
		// Summary printer includes marker '[walkthrough][debug summary]' and counts object
		expect(out).toContain("[walkthrough][debug summary]");
	});

	it("prints full details when full:true and allows redaction", () => {
		const out = captureConsole(() =>
      printWalkthroughDebug({
        full: true,
        redact: (e) => ({ ...e, data: undefined }),
      }),
    );
		expect(out).toContain("[walkthrough][debug full]");
	});

	it("wtDebug proxy only logs when enabled", () => {
		const out = captureConsole(() => wtDebug.log("hello world"));
		// enabled from previous test; ensure message present
		expect(out).toContain("hello world");
		enableDebug(false);
		const out2 = captureConsole(() => wtDebug.log("hidden msg"));
		expect(out2).not.toContain("hidden msg");
	});
});
