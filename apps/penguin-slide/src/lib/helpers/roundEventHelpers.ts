export function normalizeRoundEvents(events: any[]) {
	if (!Array.isArray(events)) return [];
	const normalized: any[] = [];
	const oldToNewStepIndex = new Map<number, number>();
	let nextStepIndex = 0;
	const VEST_POP_EXTRA_STEPS = 3;
	const createVestPopGapStep = (index: number, previous: any) => {
		const landedStep = String(previous?.landedStep ?? previous?.landedPad ?? 'LEFT').toUpperCase();
		const seed =
			(index * 1103515245 +
				Number(previous?.bananaCount ?? 0) * 12345 +
				(landedStep === 'LEFT' ? 1 : 2)) >>>
			0;
		const ghostOnLeft = seed % 2 === 0;
		return {
			index,
			stepIndex: index,
			landedStep,
			steps: {
				LEFT: {
					stepType: 'ICE',
					item: ghostOnLeft ? 'GHOST' : 'NOTHING',
					sinking: false
				},
				RIGHT: {
					stepType: 'ICE',
					item: ghostOnLeft ? 'NOTHING' : 'GHOST',
					sinking: false
				}
			},
			bridgeStep: true,
			targetLane: null,
			skipTargeting: true,
			accumulatedWinAmount: Number(previous?.accumulatedWinAmount ?? 0),
			winAmount: 0,
			lifeVests: 0,
			bananaCount: Number(previous?.bananaCount ?? 0),
			success: true,
			applies: false
		};
	};
	let lastGameplayEvent: any = null;

	for (const event of events) {
		const hasStepPads = Boolean(event?.steps || event?.pads);
		if (!hasStepPads) {
			if (event?.type === 'vestPopped') {
				const raw = Number(event?.index ?? event?.stepIndex);
				if (Number.isFinite(raw) && oldToNewStepIndex.has(raw)) {
					const mapped = oldToNewStepIndex.get(raw) as number;
					normalized.push({ ...event, index: mapped, stepIndex: mapped });
					for (let i = 0; i < VEST_POP_EXTRA_STEPS; i += 1) {
						normalized.push(createVestPopGapStep(nextStepIndex, lastGameplayEvent));
						nextStepIndex += 1;
					}
					continue;
				}
				if (nextStepIndex > 0) {
					const fallback = nextStepIndex - 1;
					normalized.push({ ...event, index: fallback, stepIndex: fallback });
					for (let i = 0; i < VEST_POP_EXTRA_STEPS; i += 1) {
						normalized.push(createVestPopGapStep(nextStepIndex, lastGameplayEvent));
						nextStepIndex += 1;
					}
					continue;
				}
			}
			normalized.push(event);
			continue;
		}

		// Step splitting transformation disabled by request.
		const splitSteps = [event];
		const rawIndex = Number(event?.index ?? event?.stepIndex);
		if (Number.isFinite(rawIndex) && !oldToNewStepIndex.has(rawIndex)) {
			oldToNewStepIndex.set(rawIndex, nextStepIndex);
		}

		for (const stepEvent of splitSteps) {
			const assignedIndex = nextStepIndex;
			nextStepIndex += 1;
			const normalizedStepEvent = {
				...stepEvent,
				index: assignedIndex,
				stepIndex: assignedIndex
			};
			normalized.push(normalizedStepEvent);
			lastGameplayEvent = normalizedStepEvent;
		}
	}

	return normalized;
}
