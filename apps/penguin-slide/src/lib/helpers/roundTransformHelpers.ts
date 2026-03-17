import { isGameplayRoundEntry, oppositeLandedStep, isSinkingCoinOrStarOnLandedPad } from './roundLogicHelpers';

export function createEmptyBridgeStep(previous: any, next: any, index: number) {
	const landedStep = oppositeLandedStep(previous?.landedStep ?? previous?.landedPad ?? 'LEFT');
	const shouldProxySlip = isSinkingCoinOrStarOnLandedPad(next);
	const leftPad = { stepType: 'ICE', item: 'NOTHING', sinking: false };
	const rightPad = { stepType: 'ICE', item: 'NOTHING', sinking: false };
	if (shouldProxySlip) {
		if (landedStep === 'LEFT') leftPad.sinking = true;
		else rightPad.sinking = true;
	}
	return {
		index,
		landedStep,
		steps: { LEFT: leftPad, RIGHT: rightPad },
		bridgeStep: true,
		targetLane: null,
		skipTargeting: true,
		accumulatedWinAmount: Number(previous?.accumulatedWinAmount ?? 0),
		winAmount: 0,
		lifeVests: Number(previous?.lifeVests ?? 0),
		bananaCount: Number(previous?.bananaCount ?? 0),
		success: true,
		applies: true
	};
}

export function transformRoundWithEmptyBridgeSteps(stateEvents: any[]) {
	const cloneRoundEntry = (entry: any) => (entry && typeof entry === 'object' ? { ...entry } : entry);
	const gameplay = stateEvents.filter(isGameplayRoundEntry);
	const extras = stateEvents.filter((entry) => !isGameplayRoundEntry(entry));
	const transformed: any[] = [];
	for (let i = 0; i < gameplay.length; i += 1) {
		const current = cloneRoundEntry(gameplay[i]);
		current.index = transformed.length;
		transformed.push(current);
		const next = gameplay[i + 1];
		if (!next) continue;
		transformed.push(createEmptyBridgeStep(current, next, transformed.length));
	}
	for (const extra of extras) {
		const copy = cloneRoundEntry(extra);
		copy.index = transformed.length;
		transformed.push(copy);
	}
	return transformed;
}
