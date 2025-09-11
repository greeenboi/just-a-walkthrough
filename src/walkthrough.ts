/**
 * Lightweight framework-agnostic onboarding walkthrough library.
 * Features:
 *  - Darken screen & spotlight a target element.
 *  - Tooltip with title/content & navigation (Next, Back, Skip, Done).
 *  - Keyboard support (Esc to exit, Enter/RightArrow for next, LeftArrow for prev).
 *  - Auto-scroll & responsive repositioning on resize/scroll.
 *  - Step hooks (beforeStep / afterStep) and lifecycle callbacks.
 *  - Polling wait if target not yet in DOM (useful for lazy-loaded UI / shadcn portals).
 *  - Zero external dependencies. Works with any DOM (React, shadcn, plain HTML, etc.).
 */

export interface WalkthroughStep {
	selector: string; // CSS selector for element to highlight
	title?: string; // Optional heading
	content?: string; // Optional rich (HTML allowed) content
	padding?: number; // Extra padding around highlight (default 8)
	focus?: boolean; // Attempt to focus the element (default false)
	beforeStep?: () => void | Promise<void>;
	afterStep?: () => void | Promise<void>;
	/** Custom wait override (ms) for this step */
	waitMs?: number;
	/** If true and element missing after wait, abort walkthrough (default: skip step) */
	required?: boolean;
}

export interface WalkthroughOptions {
	backdropOpacity?: number; // 0..1 (default 0.55)
	zIndex?: number; // root stacking (default 9999)
	keyboard?: boolean; // enable keyboard navigation (default true)
	allowBodyScroll?: boolean; // if false body overflow hidden while active (default false)
	stepWaitMs?: number; // default polling max wait (default 5000)
	stepPollIntervalMs?: number; // polling interval (default 120)
	onFinish?: () => void;
	onSkip?: (reason?: string) => void;
	onStepChange?: (index: number) => void;
	/** If true, clicking highlighted element advances to next step (default false) */
	advanceOnTargetClick?: boolean;
	/** If true, clicking outside tooltip but inside overlay advances (default false) */
	advanceOnOverlayClick?: boolean;
	/** Smooth scroll target into view (default true) */
	scrollIntoView?: boolean;
	/** Scroll options (overrides behavior if provided) */
	scrollOptions?: ScrollIntoViewOptions;
	/** Persist progress to localStorage (default false) */
	persistProgress?: boolean;
	/** Resume from stored index if partial (default true when persistProgress) */
	resume?: boolean;
	/** ID used for persistence; if omitted persistence disabled for this tour */
	tourId?: string;
	/** Provide custom tooltip renderer. Return an HTMLElement (content) inserted into tooltip container. Should include navigation UI or call ctx.defaultNav() */
	customTooltip?: (ctx: {
		step: WalkthroughStep;
		index: number;
		total: number;
		api: Walkthrough;
		defaultNav: () => HTMLElement;
	}) => HTMLElement;
	/** Disable internal focus trap (default false) */
	disableFocusTrap?: boolean;
	/** Theme styling mode (default 'default') */
	theme?: "default" | "tailwind" | "unstyled";
	/** Extra classes for tooltip container */
	tooltipClass?: string;
	/** Extra classes for highlight ring */
	ringClass?: string;
	/** Extra classes for backdrop overlay panels */
	overlayClass?: string;
	/** Keep overlay root re-appended as last <body> child to stay above modals (default true) */
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
			resume: options.resume ?? (!!options.persistProgress),
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

	async start(startIndex = 0) {
		if (this.active) return;
		if (!this.hasDOM()) {
			// Graceful no-op in non-DOM (SSR / test fallback)
			return;
		}
		this.active = true;
		this.buildDom();
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

	async go(i: number): Promise<void> {
		if (!this.active) return;
		if (i < 0 || i >= this.steps.length) return this.finish();
		// after previous
		if (this.index >= 0) {
			const prev = this.steps[this.index];
			if (prev.afterStep) await prev.afterStep();
		}
		this.index = i;
		this.opts.onStepChange(this.index);
		const step = this.steps[this.index];
		if (step.beforeStep) await step.beforeStep();
		step._el = await this.resolveElement(step);
		if (!step._el) {
			if (step.required) {
				this.skip(`Required element not found for selector: ${step.selector}`);
				return;
			} else {
				// skip this step
				return this.go(i + 1);
			}
		}
		this.renderStep(step);
		this.saveProgress();
	}

	next() {
		this.go(this.index + 1);
	}
	prev() {
		this.go(this.index - 1);
	}

	finish() {
		if (!this.active) return;
		this.markCompleted();
		this.cleanup();
		this.opts.onFinish();
	}
	skip(reason?: string) {
		if (!this.active) return;
		this.cleanup();
		this.opts.onSkip(reason);
	}

	destroy() {
		this.cleanup();
	}

	private async resolveElement(
		step: InternalStep,
	): Promise<HTMLElement | null> {
		const waitMs = Math.max(
			0,
			step.waitMs == null ? this.opts.stepWaitMs : step.waitMs,
		);
		// Fast path: no waiting requested -> single immediate lookup
		if (waitMs === 0) {
			return (document.querySelector(step.selector) as HTMLElement | null) || null;
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

	private ensureRootOnTop() {
		if (!this.root) return;
		const body = document.body;
		if (body.lastElementChild !== this.root) {
			body.appendChild(this.root); // moves to end keeping event handlers
		}
	}

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
	}

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

	private teardownFocusTrap() {
		this.focusTrapDisposer?.();
		this.focusTrapDisposer = undefined;
	}

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

	private reposition() {
		if (!this.active) return;
		const step = this.steps[this.index];
		if (!step || !step._el) return;
		this.positionHighlight(step._el, step.padding ?? 8);
		this.positionTooltip(step._el, this.overlayParts.tooltip);
	}

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
	}

	// Persistence helpers
	private progressKey() {
		return this.opts.tourId ? `__walkthrough:${this.opts.tourId}` : undefined;
	}
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
	clearProgress() {
		if (this.opts.persistProgress && this.opts.tourId) {
			try {
				const key = this.progressKey();
				if (key) localStorage.removeItem(key);
			} catch {}
		}
	}
}

/** Convenience helper */
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
