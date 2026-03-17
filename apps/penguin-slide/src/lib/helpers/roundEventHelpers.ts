export function normalizeRoundEvents(events: any[]) {
	if (!Array.isArray(events)) return [];
	const normalized: any[] = [];
	const oldToNewStepIndex = new Map<number, number>();
	let nextStepIndex = 0;

	for (const event of events) {
		const hasStepPads = Boolean(event?.steps || event?.pads);
		if (!hasStepPads) {
			if (event?.type === 'vestPopped') {
				const raw = Number(event?.index ?? event?.stepIndex);
				if (Number.isFinite(raw) && oldToNewStepIndex.has(raw)) {
					const mapped = oldToNewStepIndex.get(raw) as number;
					normalized.push({ ...event, index: mapped, stepIndex: mapped });
					continue;
				}
				if (nextStepIndex > 0) {
					const fallback = nextStepIndex - 1;
					normalized.push({ ...event, index: fallback, stepIndex: fallback });
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
			normalized.push({
				...stepEvent,
				index: assignedIndex,
				stepIndex: assignedIndex
			});
		}
	}

	return normalized;
}
