import "./style.css";
import viteLogo from "/vite.svg";
import { setupCounter } from "./counter.ts";
import typescriptLogo from "./typescript.svg";
import { startWalkthrough } from "./walkthrough";

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <div>
    <a href="https://vite.dev" target="_blank">
      <img src="${viteLogo}" class="logo" alt="Vite logo" />
    </a>
    <a href="https://www.typescriptlang.org/" target="_blank">
      <img src="${typescriptLogo}" class="logo vanilla" alt="TypeScript logo" />
    </a>
    <h1>Vite + TypeScript</h1>
    <div class="card">
      <button id="counter" type="button"></button>
    </div>
    <p class="read-the-docs">
      Click on the Vite and TypeScript logos to learn more
    </p>
  </div>
`;

setupCounter(document.querySelector<HTMLButtonElement>("#counter")!);

// Demo walkthrough (can be removed). Starts 1s after load.
setTimeout(() => {
	startWalkthrough(
		[
			{
				selector: 'a[href="https://vite.dev"]',
				title: "Vite Logo",
				content: "This link takes you to the Vite website.",
			},
			{
				selector: "#counter",
				title: "Counter Button",
				content:
					"Click to increment. After you click Next, the walkthrough finishes.",
				focus: true,
			},
		],
		{
			onFinish: () => console.log("Walkthrough finished"),
			onSkip: (r) => console.log("Walkthrough skipped", r),
		},
	);
}, 1000);
