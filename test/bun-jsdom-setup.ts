import { JSDOM } from "jsdom";

declare global {
	// Augment minimal globals we rely on; broad indexing kept internal.
	// eslint-disable-next-line no-var
	var window: Window & typeof globalThis;
	// eslint-disable-next-line no-var
	var document: Document;
	// eslint-disable-next-line no-var
	var navigator: Navigator;
	// eslint-disable-next-line no-var
	var HTMLElement: typeof globalThis.HTMLElement;
	// eslint-disable-next-line no-var
	var MutationObserver: typeof globalThis.MutationObserver;
}

if (typeof globalThis.document === "undefined") {
	const dom = new JSDOM(
		"<!doctype html><html><head></head><body></body></html>",
		{
			url: "http://localhost/",
			pretendToBeVisual: true,
		},
	);
	const { window } = dom;
	globalThis.window = window as unknown as typeof globalThis.window;
	globalThis.document = window.document;
	globalThis.navigator = window.navigator;
	globalThis.HTMLElement = window.HTMLElement;
	globalThis.MutationObserver = window.MutationObserver;
	for (const k of Object.getOwnPropertyNames(window)) {
		if (!(k in globalThis)) {
			(globalThis as Record<string, unknown>)[k] = (
				window as Record<string, unknown>
			)[k];
		}
	}
}
