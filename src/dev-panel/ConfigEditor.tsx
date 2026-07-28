/**
 * Live configuration editor for the dev panel. Edits a selected tour's options and,
 * when that tour is the running instance, applies changes live via
 * `Walkthrough.updateOptions`. Every change is also merged into the registered tour
 * (`updateTourOptions`) and persisted to localStorage so it survives restarts/reloads.
 */
import type { ActiveTourSnapshot } from "../active-registry";
import { type RegisteredTour, updateTourOptions } from "../orchestrator";
import type { Walkthrough, WalkthroughOptions } from "../walkthrough";

export interface ConfigEditorProps {
	tours: RegisteredTour[];
	tourId: string | null;
	instance: Walkthrough | null;
	snapshot: ActiveTourSnapshot | null;
	onChange: () => void;
}

/** Values shown when a tour hasn't overridden an option (mirror constructor defaults). */
const DISPLAY_DEFAULTS = {
	backdropOpacity: 0.55,
	zIndex: 9999,
	theme: "default" as WalkthroughOptions["theme"],
	tokenColorFormat: "raw" as "raw" | "hsl",
	stepWaitMs: 5000,
	stepPollIntervalMs: 120,
	keyboard: true,
	allowBodyScroll: false,
	advanceOnTargetClick: false,
	advanceOnOverlayClick: false,
	scrollIntoView: true,
	alwaysOnTop: true,
	disableFocusTrap: false,
	tooltipClass: "",
	ringClass: "",
	overlayClass: "",
};

const THEMES: WalkthroughOptions["theme"][] = [
	"default",
	"shadcn",
	"tailwind",
	"unstyled",
];

const TOGGLES: Array<keyof typeof DISPLAY_DEFAULTS> = [
	"keyboard",
	"allowBodyScroll",
	"advanceOnTargetClick",
	"advanceOnOverlayClick",
	"scrollIntoView",
	"alwaysOnTop",
	"disableFocusTrap",
];

const labelStyle: React.CSSProperties = {
	display: "flex",
	alignItems: "center",
	justifyContent: "space-between",
	gap: 8,
	fontSize: 11,
	marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
	background: "#1c1c1c",
	color: "#fff",
	border: "1px solid #444",
	borderRadius: 4,
	padding: "2px 6px",
	fontSize: 11,
	width: 120,
};

export function ConfigEditor({
	tours,
	tourId,
	instance,
	snapshot,
	onChange,
}: ConfigEditorProps) {
	const tour = tours.find((t) => t.id === tourId) || null;
	if (!tour || !tourId) {
		return (
			<div style={{ opacity: 0.7, fontSize: 12 }}>
				Select a tour in the Tours tab to edit its configuration.
			</div>
		);
	}
	const resolvedId = tour.options?.tourId || tour.id;
	const isLive = !!(instance && snapshot?.active && snapshot.id === resolvedId);
	const current = {
		...DISPLAY_DEFAULTS,
		...(tour.options || {}),
		...(isLive && snapshot ? snapshot.options : {}),
	} as typeof DISPLAY_DEFAULTS;

	const apply = (partial: Partial<WalkthroughOptions>) => {
		updateTourOptions(tourId, partial);
		if (isLive) instance?.updateOptions(partial);
		try {
			const key = `__wt_devpanel_tweaks:${tourId}`;
			const existing = JSON.parse(localStorage.getItem(key) || "{}");
			localStorage.setItem(key, JSON.stringify({ ...existing, ...partial }));
		} catch {}
		onChange();
	};

	return (
		<div>
			<div style={{ fontSize: 11, opacity: 0.8, marginBottom: 8 }}>
				Editing <strong>{tour.id}</strong>{" "}
				{isLive ? "· live" : "· on next start"}
			</div>

			<label style={labelStyle}>
				<span>Backdrop opacity ({current.backdropOpacity.toFixed(2)})</span>
				<input
					type="range"
					min={0}
					max={1}
					step={0.05}
					value={current.backdropOpacity}
					onChange={(e) => apply({ backdropOpacity: Number(e.target.value) })}
				/>
			</label>

			<label style={labelStyle}>
				<span>Theme</span>
				<select
					value={current.theme}
					onChange={(e) =>
						apply({ theme: e.target.value as WalkthroughOptions["theme"] })
					}
					style={inputStyle}
				>
					{THEMES.map((th) => (
						<option key={th} value={th}>
							{th}
						</option>
					))}
				</select>
			</label>

			<label style={labelStyle}>
				<span>Token color format</span>
				<select
					value={current.tokenColorFormat}
					onChange={(e) =>
						apply({
							tokenColorFormat: e.target.value as "raw" | "hsl",
						})
					}
					style={inputStyle}
				>
					<option value="raw">raw (Tailwind v4)</option>
					<option value="hsl">hsl (Tailwind v3)</option>
				</select>
			</label>

			<label style={labelStyle}>
				<span>z-index</span>
				<input
					type="number"
					value={current.zIndex}
					onChange={(e) => apply({ zIndex: Number(e.target.value) })}
					style={inputStyle}
				/>
			</label>

			<label style={labelStyle}>
				<span>Step wait (ms)</span>
				<input
					type="number"
					value={current.stepWaitMs}
					onChange={(e) => apply({ stepWaitMs: Number(e.target.value) })}
					style={inputStyle}
				/>
			</label>

			<label style={labelStyle}>
				<span>Poll interval (ms)</span>
				<input
					type="number"
					value={current.stepPollIntervalMs}
					onChange={(e) =>
						apply({ stepPollIntervalMs: Number(e.target.value) })
					}
					style={inputStyle}
				/>
			</label>

			{(["tooltipClass", "ringClass", "overlayClass"] as const).map((k) => (
				<label key={k} style={labelStyle}>
					<span>{k}</span>
					<input
						type="text"
						value={current[k]}
						onChange={(e) => apply({ [k]: e.target.value })}
						style={inputStyle}
					/>
				</label>
			))}

			<div style={{ marginTop: 8, borderTop: "1px solid #333", paddingTop: 8 }}>
				{TOGGLES.map((k) => (
					<label key={k} style={labelStyle}>
						<span>{k}</span>
						<input
							type="checkbox"
							checked={!!current[k]}
							onChange={(e) => apply({ [k]: e.target.checked })}
						/>
					</label>
				))}
			</div>
		</div>
	);
}

export default ConfigEditor;
