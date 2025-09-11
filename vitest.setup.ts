// JSDOM polyfills / test globals
if (!(HTMLElement.prototype as any).scrollIntoView) {
	(HTMLElement.prototype as any).scrollIntoView = () => {};
}
