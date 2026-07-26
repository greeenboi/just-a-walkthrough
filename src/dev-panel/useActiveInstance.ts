/**
 * React hook that subscribes to the core active-instances registry and returns the
 * current running walkthrough (if any) plus a fresh snapshot. Re-renders on start,
 * step change, and teardown — independent of the React provider, so the dev panel
 * reflects tours started by any means (provider, orchestrator, or direct call).
 */
import { useEffect, useState } from "react";
import {
	type ActiveTourSnapshot,
	getActiveInstance,
	subscribeActive,
} from "../active-registry";
import type { Walkthrough } from "../walkthrough";

export interface ActiveInstanceState {
	instance: Walkthrough | null;
	snapshot: ActiveTourSnapshot | null;
}

function read(): ActiveInstanceState {
	const instance = getActiveInstance();
	return { instance, snapshot: instance ? instance.getSnapshot() : null };
}

export function useActiveInstance(): ActiveInstanceState {
	const [state, setState] = useState<ActiveInstanceState>(read);
	useEffect(() => {
		const update = () => setState(read());
		update();
		return subscribeActive(update);
	}, []);
	return state;
}
