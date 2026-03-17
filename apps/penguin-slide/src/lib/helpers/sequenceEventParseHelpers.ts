export type SequenceTimelineEntry = {
	step: number;
	value: number;
	hasLifering: boolean;
	bananaCount: number;
};

export function parsePadSequenceEvents(args: {
	events: any[];
	steps: number;
	currentValue: number;
	runStartValue: number;
	stakeAmount: () => number;
	laneMap: Record<string, number>;
	addToken: (
		stepIndex: number,
		type: string,
		value: number,
		lane: number,
		hit: boolean,
		extra?: Record<string, unknown>
	) => void;
	buildPadStepTokens: (params: {
		entry: Record<string, unknown>;
		stepIndex: number;
		landedLane: number;
		landedKey: string;
		applies: boolean;
		stepTargetLane: number | null;
		stepSkipTargeting: boolean;
		timelineValue: number;
		laneMap: Record<string, number>;
		addToken: (
			stepIndex: number,
			type: string,
			value: number,
			lane: number,
			hit: boolean,
			extra?: Record<string, unknown>
		) => void;
	}) => { hasGoalPad: boolean };
	terminalSlipTriggerAtStep: (entry: Record<string, unknown>, stepIndex: number) => number;
}) {
	let summaryEvent: any = null;
	const vestPopSteps: number[] = [];
	const timeline: SequenceTimelineEntry[] = [];
	let timelineValue = args.stakeAmount();
	let timelineLifering = false;
	let lastTimelineStep: number | null = null;

	for (const entry of args.events) {
		if (entry?.type === 'finish') {
			summaryEvent = {
				result: entry.success === false ? 'slip' : 'goal',
				steps: Number(entry.totalSteps ?? args.steps),
				finalValue: Number(entry.totalWinAmount ?? args.currentValue * 100)
			};
			continue;
		}
		if (entry?.type === 'vestPopped') {
			const explicitStep = Number(entry.index ?? entry.stepIndex);
			let popStep: number = lastTimelineStep ?? 0;
			if (Number.isFinite(explicitStep)) {
				popStep =
					lastTimelineStep != null && explicitStep > lastTimelineStep
						? explicitStep - 1
						: explicitStep;
			}
			popStep = Math.max(0, popStep);
			timelineLifering = false;
			const previousBananaCount =
				timeline.length > 0 ? Number(timeline[timeline.length - 1]?.bananaCount ?? 0) : 0;
			timeline.push({
				step: popStep,
				value: timelineValue,
				hasLifering: false,
				bananaCount: previousBananaCount
			});
			vestPopSteps.push(popStep);
			lastTimelineStep = popStep;
			continue;
		}
		if (!entry.steps && !entry.pads) continue;

		const stepIndex = Number(entry.index ?? entry.stepIndex ?? 0);
		const landedKey = String(entry.landedStep ?? entry.landedPad ?? '');
		const landedLane = args.laneMap[landedKey.toUpperCase()] ?? -1;
		const applies = entry.applies !== false;
		const stepTargetLane = entry?.targetLane === null ? null : landedLane;
		const stepSkipTargeting = entry?.skipTargeting === true || stepTargetLane == null;
		const pads = (entry.steps || entry.pads || {}) as Record<string, unknown>;
		const landedPad =
			landedKey && typeof pads[landedKey.toUpperCase()] === 'object'
				? (pads[landedKey.toUpperCase()] as Record<string, unknown>)
				: {};
		const landedItem = String(landedPad.item ?? landedPad.outcome ?? '')
			.trim()
			.toUpperCase();
		const previousTimelineValue = timelineValue;

		if (typeof entry.accumulatedWinAmount === 'number') {
			timelineValue = args.runStartValue + (args.stakeAmount() * entry.accumulatedWinAmount) / 100;
		}
		const noPriorAccumulatedWin = previousTimelineValue <= args.runStartValue + 1e-6;
		if (landedItem === 'BANANA' && noPriorAccumulatedWin) {
			timelineValue = args.runStartValue;
		}
		if (typeof entry.lifeVests === 'number') {
			timelineLifering = entry.lifeVests > 0;
		}

		timeline.push({
			step: stepIndex,
			value: timelineValue,
			hasLifering: timelineLifering,
			bananaCount: Number(entry.bananaCount ?? 0)
		});
		lastTimelineStep = stepIndex;

		const { hasGoalPad } = args.buildPadStepTokens({
			entry,
			stepIndex,
			landedLane,
			landedKey,
			applies,
			stepTargetLane,
			stepSkipTargeting,
			timelineValue,
			laneMap: args.laneMap,
			addToken: args.addToken
		});

		if (entry.finish && applies) {
			if (!hasGoalPad) {
				args.addToken(stepIndex, 'goal', timelineValue, landedLane, true, { finish: true });
			}
			summaryEvent = {
				result: 'goal',
				steps: stepIndex + 1,
				finalValue: Math.round(timelineValue * 100)
			};
		}
		if (entry.terminal === true && applies) {
			const terminalSuccess = entry.success === true || hasGoalPad;
			summaryEvent = {
				result: terminalSuccess ? 'goal' : 'slip',
				steps: stepIndex + 1,
				triggerAtStep: terminalSuccess ? stepIndex : args.terminalSlipTriggerAtStep(entry, stepIndex),
				finalValue: Math.round(timelineValue * 100)
			};
		}
	}

	return { summaryEvent, vestPopSteps, timeline };
}

export function parseBookSequenceEvents(args: {
	bookEvents: any[];
	resetRun: (startValue: number) => void;
	onSetLastHitType: (hitType: string) => void;
	onSlipLossQueued: (stepIndex: number) => void;
	onSetLastWin: (value: number) => void;
	nearestLane: (value: number) => number;
	buildTileResultTokens: (params: {
		event: Record<string, unknown>;
		hitType: string;
		laneSide: number;
		stepIndex: number;
		addToken: (
			stepIndex: number,
			type: string,
			value: number,
			lane: number,
			hit: boolean,
			extra?: Record<string, unknown>
		) => void;
	}) => void;
	addToken: (
		stepIndex: number,
		type: string,
		value: number,
		lane: number,
		hit: boolean,
		extra?: Record<string, unknown>
	) => void;
}) {
	let summaryEvent: any = null;
	const vestPopSteps: number[] = [];
	const timeline: SequenceTimelineEntry[] = [];
	let timelineValue = 1;
	let timelineLifering = false;

	args.resetRun(1);
	for (const event of args.bookEvents) {
		if (event.type === 'slideStart') {
			const startValue = (event.startingValue ?? 100) / 100;
			args.resetRun(startValue);
			timelineValue = startValue;
			timelineLifering = false;
			continue;
		}
		if (event.type === 'tileResult') {
			const hitType = String(event.hitType ?? event.tileType ?? '');
			args.onSetLastHitType(hitType);
			const eventSavedByVest =
				Boolean(event.savedByLifering) || Number(event.lifeVests ?? 0) > 0;
			if (event.hitType === 'banana' && event.fall === true && !eventSavedByVest) {
				args.onSlipLossQueued(Number(event.stepIndex));
			}
			const laneOffsetRaw =
				typeof event.laneOffset === 'number' ? Number(event.laneOffset) : -1;
			const laneSide = args.nearestLane(laneOffsetRaw);
			if (typeof event.value === 'number') {
				timelineValue = event.value / 100;
			}
			if (hitType === 'lifering') timelineLifering = true;
			if (event.savedByLifering) timelineLifering = false;
			timeline.push({
				step: Number(event.stepIndex),
				value: timelineValue,
				hasLifering: timelineLifering,
				bananaCount: Number(event.bananaCount ?? 0)
			});
			const eventStepIndex = Number(event.stepIndex);
			args.buildTileResultTokens({
				event,
				hitType,
				laneSide,
				stepIndex: eventStepIndex,
				addToken: args.addToken
			});
			continue;
		}
		if (event.type === 'vestPopped') {
			const popStep = Number(event.index ?? event.stepIndex);
			if (Number.isFinite(popStep)) vestPopSteps.push(popStep);
			continue;
		}
		if (event.type === 'slideSummary') {
			summaryEvent = event;
			continue;
		}
		if (event.type === 'winInfo') {
			if (event.totalWin != null) args.onSetLastWin(event.totalWin / 100);
			continue;
		}
		if (event.type === 'finalWin') {
			if (typeof event.amount === 'number') args.onSetLastWin(event.amount / 100);
			continue;
		}
	}

	return { summaryEvent, vestPopSteps, timeline };
}
