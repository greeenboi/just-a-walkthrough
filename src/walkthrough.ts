/**
 * Lightweight framework‑agnostic onboarding walkthrough / product tour library.
 *
 * Core ideas:
 *  - Provide a small, dependency‑free primitive that can be orchestrated (manually, by route, or chained) in any framework.
 *  - Keep DOM manipulation explicit & predictable while allowing customization hooks for styling and tooltip content.
 *
 * Built‑in capabilities:
 *  - Darkens the screen and creates a highlight ring around a target element.
 *  - Renders a tooltip (themeable or fully custom) with navigation controls (Back, Next, Skip, Done).
 *  - Keyboard support (Esc exits; Enter / ArrowRight advances; ArrowLeft goes back).
 *  - Auto scrolls target into view with configurable smooth behavior.
 *  - Responsive repositioning on window resize, scroll, DOM mutations (MutationObserver) & optional re‑append to top of <body> (`alwaysOnTop`).
 *  - Step level hooks (`beforeStep`, `afterStep`) and lifecycle callbacks (`onStepChange`, `onSkip`, `onFinish`).
 *  - Polls for elements that are not yet in the DOM (useful for lazy loading, portals, transitions). Polling can be disabled (0ms wait) for immediate fail / skip.
 *  - Optional persistence of progress (`persistProgress` + `tourId`) with resume semantics (`resume`).
 *  - Focus trapping & accessibility (ARIA live region for step titles).
 *  - No external CSS required (inline styles for default theme) yet easily themeable (`theme: 'tailwind' | 'unstyled'`).
 *
 * Not in scope / intentionally omitted:
 *  - Position flipping library dependencies (custom minimal placement logic is used instead).
 *  - Complex animation frameworks (keep animations simple & CSS based so they can be replacedcd externally).
 *  - Global singleton management (caller decides orchestration patterns).
 *
 * Example:
 * ```ts
 * import { Walkthrough, startWalkthrough } from 'just-a-walkthrough';
 *
 * const steps: WalkthroughStep[] = [
 *   { selector: '#logo', title: 'Logo', content: 'This is our brand mark.' },
 *   { selector: '#nav-settings', title: 'Settings', content: 'Configure your profile here.' },
 * ];
 *
 * startWalkthrough(steps, { tourId: 'basic-intro', persistProgress: true });
 yes* ```
 */
import { recordDebug } from "./debug";

/**
 * A single walkthrough step.
 */
export interface WalkthroughStep {
	/** CSS selector used to locate the DOM element to highlight. */
	selector: string;
	/** Optional small heading shown at the top of the tooltip. */
	title?: string;
	/** Optional HTML (or plain text) content for the body of the tooltip. */
	content?: string;
	/** Extra padding (px) around the highlighted rectangle. Default: 8. */
	padding?: number;
	/** If true, attempts to call `.focus()` on the target element when shown. */
	focus?: boolean;
	/** Hook executed before the step becomes visible (awaited). */
	beforeStep?: () => void | Promise<void>;
	/** Hook executed after the step is hidden / before moving to next (awaited). */
	afterStep?: () => void | Promise<void>;
	/** Per‑step override of the max wait (ms) for the selector to appear. Inherits `stepWaitMs`. */
	waitMs?: number;
	/** If true and element is not found after waiting, the entire walkthrough is aborted (skipped). Otherwise the step is skipped and the walkthrough continues. */
	required?: boolean;
}

/**
 * Configuration options applied to a walkthrough instance.
 */
export interface WalkthroughOptions {
	/** Backdrop darkness (0..1). Default: 0.55. */
	backdropOpacity?: number;
	/** Base z-index for the root overlay. Default: 9999. */
	zIndex?: number;
	/** Enable keyboard navigation. Default: true. */
	keyboard?: boolean;
	/** Allow body scrolling; if false sets `overflow:hidden` during tour. Default: false. */
	allowBodyScroll?: boolean;
	/** Max wait time for step element polling (ms). 0 disables waiting. Default: 5000. */
	stepWaitMs?: number;
	/** Poll interval (ms) for element resolution (minimum clamped to 0/1 internally). Default: 120. */
	stepPollIntervalMs?: number;
	/** Called when walkthrough finishes normally (user reached last step). */
	onFinish?: () => void;
	/** Called when walkthrough is skipped/aborted. Param provides reason tokens (e.g. 'esc', 'user-skip'). */
	onSkip?: (reason?: string) => void;
	/** Called after the internal step index changes (already applied). */
	onStepChange?: (index: number) => void;
	/** If true, clicking the highlighted target advances. Default: false. */
	advanceOnTargetClick?: boolean;
	/** If true, clicking any dimmed overlay area advances. Default: false. */
	advanceOnOverlayClick?: boolean;
	/** Attempts to scroll the target into view (smooth). Default: true. */
	scrollIntoView?: boolean;
	/** Custom scrollIntoView options (overrides default behavior). */
	scrollOptions?: ScrollIntoViewOptions;
	/** Persist progress to localStorage (`__walkthrough:<tourId>`). Default: false. */
	persistProgress?: boolean;
	/** Resume from stored index if not yet completed (implied true when `persistProgress`). */
	resume?: boolean;
	/** Identifier for persistence; if omitted persistence is disabled regardless of other flags. */
	tourId?: string;
	/**
	 * Custom tooltip renderer. Return a root element inserted into the provided container.
	 * You are responsible for adding navigation UI OR call `ctx.defaultNav()` to inject standard buttons.
	 */
	customTooltip?: (ctx: {
		step: WalkthroughStep;
		index: number;
		total: number;
		api: Walkthrough;
		defaultNav: () => HTMLElement;
	}) => HTMLElement;
	/** Disable internal focus trap. Default: false. */
	disableFocusTrap?: boolean;
	/** Styling mode. 'default' injects minimal CSS, 'tailwind' expects Tailwind tokens, 'unstyled' leaves raw elements. */
	theme?: "default" | "tailwind" | "unstyled";
	/** Additional classes appended to tooltip root. */
	tooltipClass?: string;
	/** Additional classes appended to highlight ring. */
	ringClass?: string;
	/** Additional classes appended to each backdrop panel. */
	overlayClass?: string;
	/** Re-append root as last <body> child on DOM mutations to stay above modals. Default: true. */
	alwaysOnTop?: boolean;
}

interface InternalStep extends WalkthroughStep {
	_el?: HTMLElement | null;
}

type InternalResolvedOptions = {
	backdropOpacity: number;
	zIndex: number;
	keyboard: boolean;
	allowBodyScroll: boolean;
	stepWaitMs: number;
	stepPollIntervalMs: number;
	onFinish: () => void;
	onSkip: (reason?: string) => void;
	onStepChange: (index: number) => void;
	advanceOnTargetClick: boolean;
	advanceOnOverlayClick: boolean;
	scrollIntoView: boolean;
	scrollOptions?: ScrollIntoViewOptions;
	persistProgress: boolean;
	resume: boolean;
	tourId?: string;
	customTooltip?: (ctx: {
		step: WalkthroughStep;
		index: number;
		total: number;
		api: Walkthrough;
		defaultNav: () => HTMLElement;
	}) => HTMLElement;
	disableFocusTrap: boolean;
	theme: "default" | "tailwind" | "unstyled";
	tooltipClass?: string;
	ringClass?: string;
	overlayClass?: string;
	alwaysOnTop: boolean;
};

/**
 * Controls the lifecycle of a single walkthrough.
 *
 * Public methods:
 *  - {@link start} : begin / resume at an index
 *  - {@link next} / {@link prev}
 *  - {@link finish} : mark completed, fire callback, remove overlay
 *  - {@link skip} : abort without completion mark
 *  - {@link destroy} : unconditionally tear down (no callbacks)
 *  - {@link clearProgress} : remove persisted state (if enabled)
 */
export class Walkthrough {
	private steps: InternalStep[];
	private opts: InternalResolvedOptions;
	private index = -1;
	private active = false;
	private root!: HTMLElement;
	private overlayParts!: {
		top: HTMLDivElement;
		left: HTMLDivElement;
		right: HTMLDivElement;
		bottom: HTMLDivElement;
		ring: HTMLDivElement;
		tooltip: HTMLDivElement;
		live: HTMLDivElement;
	};
	private resizeHandler = () => this.reposition();
	private scrollHandler = () => this.reposition();
	private keyHandler = (e: KeyboardEvent) => this.onKey(e);
	private mutationObserver?: MutationObserver;
	private focusTrapDisposer?: () => void;

	/**
	 * Create a new walkthrough.
	 * @param steps Ordered list of steps.
	 * @param options Optional configuration.
	 */
	constructor(steps: WalkthroughStep[], options: WalkthroughOptions = {}) {
		this.steps = steps.map((s) => ({ ...s }));
		this.opts = {
			backdropOpacity: options.backdropOpacity ?? 0.55,
			zIndex: options.zIndex ?? 9999,
			keyboard: options.keyboard ?? true,
			allowBodyScroll: options.allowBodyScroll ?? false,
			// Allow explicit 0 to mean "no waiting / single attempt" but clamp negatives
			stepWaitMs: Math.max(0, options.stepWaitMs ?? 5000),
			// A poll interval of 0 can create a tight loop under some schedulers; treat 0 as 1ms minimum
			stepPollIntervalMs: Math.max(0, options.stepPollIntervalMs ?? 120),
			onFinish: options.onFinish ?? (() => {}),
			onSkip: options.onSkip ?? (() => {}),
			onStepChange: options.onStepChange ?? (() => {}),
			advanceOnTargetClick: options.advanceOnTargetClick ?? false,
			advanceOnOverlayClick: options.advanceOnOverlayClick ?? false,
			scrollIntoView: options.scrollIntoView ?? true,
			scrollOptions: options.scrollOptions,
			persistProgress: options.persistProgress ?? false,
			resume: options.resume ?? !!options.persistProgress,
			tourId: options.tourId,
			customTooltip: options.customTooltip,
			disableFocusTrap: options.disableFocusTrap ?? false,
			theme: options.theme ?? "default",
			tooltipClass: options.tooltipClass,
			ringClass: options.ringClass,
			overlayClass: options.overlayClass,
			alwaysOnTop: options.alwaysOnTop ?? true,
		};
	}

	private hasDOM(): boolean {
		return (
			typeof window !== "undefined" &&
			typeof document !== "undefined" &&
			!!document.body
		);
	}

	/**
	 * Begin the walkthrough. If persistence+resume is active and stored progress
	 * exists, that index will be used instead of `startIndex`.
	 * Safe to call multiple times (subsequent calls while active are ignored).
	 */
	async start(startIndex = 0) {
		if (this.active) return;
		if (!this.hasDOM()) {
			// Graceful no-op in non-DOM (SSR / test fallback)
			return;
		}
		this.active = true;
		this.buildDom();
		recordDebug("walkthrough", "start", this.opts.tourId || "<anon>", {
			startIndex,
			steps: this.steps.length,
			resume: this.opts.resume,
			persist: this.opts.persistProgress,
		});
		if (!this.opts.allowBodyScroll) document.body.style.overflow = "hidden";
		window.addEventListener("resize", this.resizeHandler, { passive: true });
		window.addEventListener("scroll", this.scrollHandler, true);
		if (this.opts.keyboard)
			document.addEventListener("keydown", this.keyHandler);
		this.mutationObserver = new MutationObserver(() => {
			this.reposition();
			if (this.opts.alwaysOnTop) this.ensureRootOnTop();
		});
		this.mutationObserver.observe(document.body, {
			attributes: true,
			childList: true,
			subtree: true,
		});
		const resumeIndex = this.loadProgress();
		const initial =
			this.opts.persistProgress && this.opts.resume && resumeIndex != null
				? resumeIndex
				: startIndex;
		await this.go(initial);
	}

	/**
	 * Jump to an arbitrary 0‑based step index. If out of range, finishes the tour.
	 * Intended for internal use & custom navigation UIs.
	 */
	async go(i: number): Promise<void> {
		if (!this.active) return;
		if (i < 0 || i >= this.steps.length) return this.finish();
		// after previous
		if (this.index >= 0) {
			const prev = this.steps[this.index];
			if (prev.afterStep) await prev.afterStep();
		}
		this.index = i;
		recordDebug("walkthrough", "step", this.opts.tourId || "<anon>", {
			index: this.index,
			selector: this.steps[this.index].selector,
		});
		this.opts.onStepChange(this.index);
		const step = this.steps[this.index];
		if (step.beforeStep) await step.beforeStep();
		step._el = await this.resolveElement(step);
		if (!step._el) {
			recordDebug(
				"walkthrough",
				step.required ? "missing-required" : "missing-optional",
				this.opts.tourId || "<anon>",
				{ selector: step.selector },
			);
			if (step.required) {
				this.skip(`Required element not found for selector: ${step.selector}`);
				return;
			} else {
				// skip this step
				return this.go(i + 1);
			}
		}
		recordDebug("walkthrough", "resolved", this.opts.tourId || "<anon>", {
			index: this.index,
			selector: step.selector,
		});
		this.renderStep(step);
		this.saveProgress();
	}

	/** Advance to next step. */
	next() {
		this.go(this.index + 1);
	}
	/** Go back to previous step. */
	prev() {
		this.go(this.index - 1);
	}

	/**
	 * Complete the walkthrough (fires `onFinish`, marks persisted state as completed).
	 * Further navigation is disabled until a new instance is started.
	 */
	finish() {
		if (!this.active) return;
		this.markCompleted();
		this.cleanup();
		recordDebug("walkthrough", "finish", this.opts.tourId || "<anon>", {
			finalIndex: this.index,
		});
		this.opts.onFinish();
	}
	/**
	 * Abort the walkthrough (fires `onSkip` with a reason token; does NOT mark completed).
	 * Useful for user cancellations or required element failures.
	 */
	skip(reason?: string) {
		if (!this.active) return;
		this.cleanup();
		recordDebug("walkthrough", "skip", this.opts.tourId || "<anon>", {
			reason,
			index: this.index,
		});
		this.opts.onSkip(reason);
	}

	/** Hard teardown: remove DOM & listeners without firing callbacks or marking progress. */
	destroy() {
		this.cleanup();
		recordDebug("walkthrough", "destroy", this.opts.tourId || "<anon>");
	}

	/**
	 * Attempt to resolve a DOM element for a step, polling until found or timeout.
	 * Fast path: when effective wait is 0 only a single synchronous query is performed.
	 */
	private async resolveElement(
		step: InternalStep,
	): Promise<HTMLElement | null> {
		const waitMs = Math.max(
			0,
			step.waitMs == null ? this.opts.stepWaitMs : step.waitMs,
		);
		// Fast path: no waiting requested -> single immediate lookup
		if (waitMs === 0) {
			return (
				(document.querySelector(step.selector) as HTMLElement | null) || null
			);
		}
		const deadline = Date.now() + waitMs;
		const poll = Math.max(1, this.opts.stepPollIntervalMs);
		while (Date.now() <= deadline) {
			const el = document.querySelector(step.selector) as HTMLElement | null;
			if (el) return el;
			await new Promise((r) => setTimeout(r, poll));
		}
		return null;
	}

	/** Lazily build overlay DOM (idempotent). */
	private buildDom() {
		if (this.root) return;
		const root = document.createElement("div");
		root.className = "wt-root";
		root.setAttribute("data-walkthrough", "");
		root.style.position = "fixed";
		root.style.inset = "0";
		root.style.zIndex = String(this.opts.zIndex);
		root.style.pointerEvents = "none";
		// Inject styles once (only for default theme)
		if (
			this.opts.theme === "default" &&
			!document.getElementById("__walkthrough_styles")
		) {
			const style = document.createElement("style");
			style.id = "__walkthrough_styles";
			style.textContent = this.generateStyles();
			document.head.appendChild(style);
		}

		const makePart = (cls: string) => {
			const d = document.createElement("div");
			d.className = "wt-part " + cls;
			d.style.position = "fixed";
			if (this.opts.theme === "default") {
				d.style.background = `rgba(0,0,0,${this.opts.backdropOpacity})`;
			} else if (this.opts.theme === "tailwind") {
				d.classList.add("bg-black/60");
			}
			if (this.opts.overlayClass)
				d.classList.add(...this.opts.overlayClass.split(/\s+/).filter(Boolean));
			d.style.pointerEvents = this.opts.advanceOnOverlayClick ? "auto" : "none";
			return d;
		};
		const top = makePart("wt-top");
		const left = makePart("wt-left");
		const right = makePart("wt-right");
		const bottom = makePart("wt-bottom");
		const ring = document.createElement("div");
		ring.className = "wt-ring";
		ring.style.position = "fixed";
		ring.style.pointerEvents = "none";
		if (this.opts.theme === "default") {
			ring.style.border = "2px solid #6366f1";
			ring.style.borderRadius = "8px";
			ring.style.boxShadow =
				"0 0 0 4px rgba(99,102,241,0.35), 0 4px 18px rgba(0,0,0,0.4)";
			ring.style.transition = "all 180ms cubic-bezier(.4,0,.2,1)";
		} else if (this.opts.theme === "tailwind") {
			ring.classList.add(
				"rounded-lg",
				"border-2",
				"border-primary",
				"shadow-[0_0_0_4px_rgba(99,102,241,0.35)]",
				"transition-all",
			);
		}
		if (this.opts.ringClass)
			ring.classList.add(...this.opts.ringClass.split(/\s+/).filter(Boolean));

		const tooltip = document.createElement("div");
		tooltip.className = "wt-tooltip";
		tooltip.style.position = "fixed";
		tooltip.style.maxWidth = "340px";
		tooltip.style.pointerEvents = "auto";
		tooltip.style.display = "flex";
		tooltip.style.flexDirection = "column";
		tooltip.style.gap = "12px";
		if (this.opts.theme === "tailwind") {
			tooltip.classList.add(
				"rounded-lg",
				"border",
				"p-4",
				"bg-popover",
				"text-popover-foreground",
				"shadow-lg",
			);
		} else if (this.opts.theme === "unstyled") {
			tooltip.removeAttribute("style");
			tooltip.style.position = "fixed";
			tooltip.style.pointerEvents = "auto";
		}
		if (this.opts.tooltipClass)
			tooltip.classList.add(
				...this.opts.tooltipClass.split(/\s+/).filter(Boolean),
			);

		const live = document.createElement("div");
		live.className = "wt-live";
		live.setAttribute("aria-live", "polite");
		live.setAttribute("role", "status");
		live.style.position = "absolute";
		live.style.width = "1px";
		live.style.height = "1px";
		live.style.overflow = "hidden";
		live.style.clip = "rect(1px,1px,1px,1px)";
		live.style.whiteSpace = "nowrap";
		live.style.pointerEvents = "none";
		root.appendChild(live);

		[top, left, right, bottom, ring, tooltip].forEach((p) =>
			root.appendChild(p),
		);
		document.body.appendChild(root);
		this.root = root;
		this.overlayParts = { top, left, right, bottom, ring, tooltip, live };

		if (this.opts.alwaysOnTop) this.ensureRootOnTop();

		if (this.opts.advanceOnOverlayClick) {
			[top, left, right, bottom].forEach((d) =>
				d.addEventListener("click", () => this.next()),
			);
		}
	}

	/** Ensure root remains the last <body> child (z-order correctness). */
	private ensureRootOnTop() {
		if (!this.root) return;
		const body = document.body;
		if (body.lastElementChild !== this.root) {
			body.appendChild(this.root); // moves to end keeping event handlers
		}
	}

	/** Generate injected stylesheet (default theme only). */
	private generateStyles(): string {
		return `
    .wt-root { font-family: system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif; }
    .wt-tooltip { background: #111827EE; color: #f9fafb; border: 1px solid #374151; border-radius: 10px; padding: 16px 18px; box-shadow: 0 8px 28px -6px rgba(0,0,0,.55); }
    .wt-tooltip h3 { margin: 0 0 4px; font-size: 16px; font-weight: 600; }
    .wt-tooltip .wt-content { font-size: 14px; line-height: 1.4; }
    .wt-tooltip .wt-nav { display:flex; gap:8px; justify-content: flex-end; }
    .wt-tooltip button { all:unset; font:inherit; background:#6366f1; color:#fff; padding:6px 14px; border-radius:6px; cursor:pointer; font-size:13px; font-weight:500; box-shadow:0 2px 4px rgba(0,0,0,.25); }
    .wt-tooltip button:hover { background:#4f46e5; }
    .wt-tooltip button.wt-secondary { background:#374151; }
    .wt-tooltip button.wt-secondary:hover { background:#4b5563; }
    @media(prefers-color-scheme:light){
      .wt-tooltip { background:#ffffffF2; color:#111827; border-color:#e5e7eb; }
      .wt-tooltip button.wt-secondary { background:#e5e7eb; color:#111827; }
      .wt-tooltip button.wt-secondary:hover { background:#d1d5db; }
    }
    `;
	}

	/** Render highlight + tooltip for a resolved step element. */
	private renderStep(step: InternalStep) {
		if (!step._el) return;
		const padding = step.padding ?? 8;
		this.positionHighlight(step._el, padding);
		this.renderTooltip(step);
		if (step.focus) {
			try {
				step._el.focus();
			} catch {}
		}
		if (this.opts.scrollIntoView && step._el) {
			try {
				step._el.scrollIntoView(
					this.opts.scrollOptions || {
						behavior: "smooth",
						block: "center",
						inline: "center",
					},
				);
			} catch {}
		}
		if (this.opts.advanceOnTargetClick) {
			const listener = () => {
				step._el?.removeEventListener("click", listener);
				this.next();
			};
			step._el.addEventListener("click", listener, { once: true });
		}
	}

	/** Position the dark overlay panels + highlight ring around the target. */
	private positionHighlight(el: HTMLElement, padding: number) {
		const rect = el.getBoundingClientRect();
		const p = padding;
		const x = rect.left - p;
		const y = rect.top - p;
		const w = rect.width + p * 2;
		const h = rect.height + p * 2;
		const { top, left, right, bottom, ring } = this.overlayParts;
		top.style.top = "0px";
		top.style.left = "0px";
		top.style.width = "100%";
		top.style.height = `${Math.max(0, y)}px`;
		left.style.top = `${y}px`;
		left.style.left = "0px";
		left.style.width = `${Math.max(0, x)}px`;
		left.style.height = `${h}px`;
		right.style.top = `${y}px`;
		right.style.left = `${x + w}px`;
		right.style.width = `${Math.max(0, window.innerWidth - (x + w))}px`;
		right.style.height = `${h}px`;
		bottom.style.top = `${y + h}px`;
		bottom.style.left = "0px";
		bottom.style.width = "100%";
		bottom.style.height = `${Math.max(0, window.innerHeight - (y + h))}px`;
		ring.style.top = `${y}px`;
		ring.style.left = `${x}px`;
		ring.style.width = `${w}px`;
		ring.style.height = `${h}px`;
		if (typeof window === "undefined") return; // Defensive check for window
	}

	/** Build & mount tooltip content for the current step. */
	private renderTooltip(step: InternalStep) {
		const { tooltip, live } = this.overlayParts;
		tooltip.innerHTML = "";
		live.textContent = step.title || "";
		let firstFocusableBefore: HTMLElement | null = null;

		const defaultNav = () => {
			const nav = document.createElement("div");
			nav.className = "wt-nav";
			if (this.index > 0) {
				const back = document.createElement("button");
				back.className = "wt-secondary";
				back.textContent = "Back";
				back.addEventListener("click", () => this.prev());
				nav.appendChild(back);
			}
			const skip = document.createElement("button");
			skip.className = "wt-secondary";
			skip.textContent = "Skip";
			skip.addEventListener("click", () => this.skip("user-skip"));
			nav.appendChild(skip);
			const next = document.createElement("button");
			const last = this.index === this.steps.length - 1;
			next.textContent = last ? "Done" : "Next";
			next.addEventListener("click", () =>
				last ? this.finish() : this.next(),
			);
			nav.appendChild(next);
			return nav;
		};

		if (this.opts.customTooltip) {
			const custom = this.opts.customTooltip({
				step,
				index: this.index,
				total: this.steps.length,
				api: this,
				defaultNav,
			});
			tooltip.appendChild(custom);
		} else {
			if (step.title) {
				const h = document.createElement("h3");
				h.textContent = step.title;
				tooltip.appendChild(h);
			}
			if (step.content) {
				const c = document.createElement("div");
				c.className = "wt-content";
				c.innerHTML = step.content;
				tooltip.appendChild(c);
			}
			tooltip.appendChild(defaultNav());
		}

		if (step._el) {
			this.positionTooltip(step._el, tooltip);
		}
		if (!this.opts.disableFocusTrap) {
			this.setupFocusTrap(tooltip);
		}
		// Focus first button/link else container
		const focusables = tooltip.querySelectorAll<HTMLElement>(
			Walkthrough.FOCUSABLE_SEL,
		);
		if (focusables.length) {
			firstFocusableBefore = focusables[0];
			setTimeout(() => firstFocusableBefore?.focus(), 0);
		} else {
			tooltip.tabIndex = -1;
			tooltip.focus();
		}
	}

	private static FOCUSABLE_SEL =
		'a[href], button:not([disabled]), textarea, input[type="text"], input[type="radio"], input[type="checkbox"], select, [tabindex]:not([tabindex="-1"])';

	/** Simple cyclical focus trap for interactive tooltip controls. */
	private setupFocusTrap(container: HTMLElement) {
		this.teardownFocusTrap();
		const handler = (e: KeyboardEvent) => {
			if (e.key !== "Tab") return;
			const focusables = Array.from(
				container.querySelectorAll<HTMLElement>(Walkthrough.FOCUSABLE_SEL),
			).filter((el) => !el.hasAttribute("disabled"));
			if (!focusables.length) {
				e.preventDefault();
				container.focus();
				return;
			}
			const first = focusables[0];
			const last = focusables[focusables.length - 1];
			if (e.shiftKey) {
				if (document.activeElement === first) {
					e.preventDefault();
					last.focus();
				}
			} else {
				if (document.activeElement === last) {
					e.preventDefault();
					first.focus();
				}
			}
		};
		document.addEventListener("keydown", handler, true);
		this.focusTrapDisposer = () =>
			document.removeEventListener("keydown", handler, true);
	}

	/** Remove previously installed focus trap handler if present. */
	private teardownFocusTrap() {
		this.focusTrapDisposer?.();
		this.focusTrapDisposer = undefined;
	}

	/** Compute and set tooltip coordinates (prefers bottom, top, right, left then clamps). */
	private positionTooltip(target: HTMLElement, tooltip: HTMLElement) {
		const rect = target.getBoundingClientRect();
		const gap = 14;
		const tw = tooltip.offsetWidth || 320;
		const th = tooltip.offsetHeight || 140;
		// Strategies preference: bottom, top, right, left.
		let top = rect.bottom + gap;
		let left = rect.left + (rect.width - tw) / 2;
		let placed = false;
		const within = (x: number, y: number) =>
			x >= 4 &&
			x + tw <= window.innerWidth - 4 &&
			y >= 4 &&
			y + th <= window.innerHeight - 4;
		// bottom
		if (within(left, top)) placed = true;
		// top
		if (!placed) {
			const t = rect.top - gap - th;
			if (within(left, t)) {
				top = t;
				placed = true;
			}
		}
		// right
		if (!placed) {
			const l = rect.right + gap;
			const t = rect.top + (rect.height - th) / 2;
			if (within(l, t)) {
				left = l;
				top = t;
				placed = true;
			}
		}
		// left
		if (!placed) {
			const l = rect.left - gap - tw;
			const t = rect.top + (rect.height - th) / 2;
			if (within(l, t)) {
				left = l;
				top = t;
				placed = true;
			}
		}
		// fallback clamp
		if (!placed) {
			top = Math.min(
				Math.max(4, rect.bottom + gap),
				window.innerHeight - th - 4,
			);
			left = Math.min(
				Math.max(4, rect.left + (rect.width - tw) / 2),
				window.innerWidth - tw - 4,
			);
		}
		tooltip.style.top = `${top}px`;
		tooltip.style.left = `${left}px`;
	}

	/** Recompute highlight + tooltip position (on resize/scroll/mutation). */
	private reposition() {
		if (!this.active) return;
		const step = this.steps[this.index];
		if (!step || !step._el) return;
		this.positionHighlight(step._el, step.padding ?? 8);
		this.positionTooltip(step._el, this.overlayParts.tooltip);
		if (typeof window === "undefined") return; // Defensive check for window
	}

	/** Keyboard handler for global navigation / dismissal keys. */
	private onKey(e: KeyboardEvent) {
		if (!this.active) return;
		switch (e.key) {
			case "Escape":
				this.skip("esc");
				break;
			case "ArrowRight":
			case "Enter":
				this.next();
				break;
			case "ArrowLeft":
				this.prev();
				break;
		}
	}

	/** Internal teardown used by finish/skip/destroy (difference is which callbacks fire). */
	private cleanup() {
		if (!this.active) return;
		this.active = false;
		if (!this.opts.allowBodyScroll) document.body.style.overflow = "";
		window.removeEventListener("resize", this.resizeHandler);
		window.removeEventListener("scroll", this.scrollHandler, true);
		document.removeEventListener("keydown", this.keyHandler);
		this.teardownFocusTrap();
		this.mutationObserver?.disconnect();
		if (this.root?.parentNode) this.root.parentNode.removeChild(this.root);
		recordDebug("walkthrough", "cleanup", this.opts.tourId || "<anon>", {
			index: this.index,
		});
	}

	// Persistence helpers
	/** Build the localStorage key (if persistence enabled). */
	private progressKey() {
		return this.opts.tourId ? `__walkthrough:${this.opts.tourId}` : undefined;
	}
	/** Persist current index (not yet completed). */
	private saveProgress() {
		if (!this.opts.persistProgress || !this.opts.tourId) return;
		try {
			const key = this.progressKey();
			if (key) {
				localStorage.setItem(
					key,
					JSON.stringify({
						index: this.index,
						completed: false,
						ts: Date.now(),
					}),
				);
			}
		} catch {}
	}
	/** Load prior progress index (returns null if completed or unavailable). */
	private loadProgress(): number | null {
		if (!this.opts.persistProgress || !this.opts.tourId) return null;
		try {
			const key = this.progressKey();
			if (!key) return null;
			const raw = localStorage.getItem(key);
			if (!raw) return null;
			const data = JSON.parse(raw);
			if (data.completed) return null; // start fresh if already completed
			if (typeof data.index === "number") return data.index;
		} catch {}
		return null;
	}
	/** Persist completion + final index. */
	private markCompleted() {
		if (!this.opts.persistProgress || !this.opts.tourId) return;
		try {
			const key = this.progressKey();
			if (key) {
				localStorage.setItem(
					key,
					JSON.stringify({
						index: this.index,
						completed: true,
						ts: Date.now(),
					}),
				);
			}
		} catch {}
	}
	/** Remove any stored progress / completion state for this tour instance. */
	clearProgress() {
		if (this.opts.persistProgress && this.opts.tourId) {
			try {
				const key = this.progressKey();
				if (key) localStorage.removeItem(key);
			} catch {}
		}
	}
}

/**
 * Convenience helper to create + start a walkthrough immediately.
 * Returns the instance so callers can call `skip()` or `clearProgress()` later.
 */
export function startWalkthrough(
	steps: WalkthroughStep[],
	options?: WalkthroughOptions,
) {
	const wt = new Walkthrough(steps, options);
	wt.start();
	return wt;
}

// --- Chain Support ---------------------------------------------------------
export interface ChainedTour {
	id: string;
	steps: WalkthroughStep[];
	options?: WalkthroughOptions;
}

export class WalkthroughChain {
	private tours: ChainedTour[];
	private currentIndex = -1;
	private currentInstance: Walkthrough | null = null;
	constructor(tours: ChainedTour[]) {
		this.tours = tours;
	}
	start() {
		this.advanceToNext();
	}
	private advanceToNext(): void {
		this.currentIndex++;
		if (this.currentInstance) {
			this.currentInstance.destroy();
			this.currentInstance = null;
		}
		if (this.currentIndex >= this.tours.length) return; // done
		const tour = this.tours[this.currentIndex];
		// Skip if already completed (persistence)
		if (tour.options?.persistProgress && tour.options.tourId) {
			try {
				const raw = localStorage.getItem(
					`__walkthrough:${tour.options.tourId}`,
				);
				if (raw) {
					const data = JSON.parse(raw);
					if (data?.completed) {
						this.advanceToNext();
						return;
					}
				}
			} catch {}
		}
		const inst = new Walkthrough(tour.steps, {
			...tour.options,
			onFinish: () => {
				tour.options?.onFinish?.();
				this.advanceToNext();
			},
			onSkip: (r) => {
				tour.options?.onSkip?.(r); /* skipping stops chain */
			},
		});
		this.currentInstance = inst;
		inst.start();
	}
	stop() {
		this.currentInstance?.skip("chain-stop");
	}
}

// Example of potential global exposure (opt-in)
// (window as any).Walkthrough = Walkthrough;
// (window as any).startWalkthrough = startWalkthrough;
