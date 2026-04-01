export function isGameplayRoundEntry(entry: any) {
	return Boolean(entry && (entry.steps || entry.pads));
}

export function oppositeLandedStep(step: string) {
	return String(step).toUpperCase() === 'RIGHT' ? 'LEFT' : 'RIGHT';
}

export function landedPadData(entry: any) {
	const landed = String(entry?.landedStep ?? entry?.landedPad ?? '').toUpperCase();
	const pads = (entry?.steps || entry?.pads || {}) as Record<string, any>;
	const pad = pads[landed] ?? {};
	const item = String(pad?.item ?? pad?.outcome ?? '').toUpperCase();
	return { landed, item, sinking: Boolean(pad?.sinking) };
}

export function isSinkingCoinOrStarOnLandedPad(entry: any) {
	const landed = landedPadData(entry);
	if (!landed.sinking) return false;
	return landed.item.startsWith('+') || landed.item.startsWith('X');
}

export function tokenShouldSlipOnPreviousStep(token: { type?: unknown; extra?: Record<string, unknown> }) {
	const type = String(token?.type ?? '').trim().toLowerCase();
	const isCoinOrStar = type === 'coin' || type === 'star';
	const sinking = token?.extra?.sinking === true || token?.extra?.fall === true;
	return isCoinOrStar && sinking;
}

export function slipTriggerStepForToken(token: { stepIndex?: unknown; type?: unknown; extra?: Record<string, unknown> }) {
	const tokenStep = Number(token?.stepIndex ?? 0);
	if (!Number.isFinite(tokenStep)) return 0;
	return tokenShouldSlipOnPreviousStep(token) ? tokenStep - 1 : tokenStep;
}

export function terminalSlipTriggerAtStep(entry: any, stepIndex: number) {
	return isSinkingCoinOrStarOnLandedPad(entry) ? stepIndex - 1 : stepIndex;
}
