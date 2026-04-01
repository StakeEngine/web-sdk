export function readAssetDimension(asset: unknown, key: 'width' | 'height', fallback = 0) {
	if (!asset || typeof asset !== 'object') return fallback;
	const value = (asset as Record<'width' | 'height', unknown>)[key];
	return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function laneSide(lane: number): 'left' | 'right' {
	return lane >= 0 ? 'right' : 'left';
}

export function pickFrom<T>(items: readonly T[], random: () => number = Math.random): T {
	return items[Math.floor(random() * items.length)] as T;
}

export function laneItemValue(pad: any) {
	return String(pad?.item ?? pad?.outcome ?? '').trim().toUpperCase();
}

export function isNothingItemValue(value: string) {
	const normalized = String(value ?? '').trim().toUpperCase();
	return (
		normalized === '' ||
		normalized === 'NOTHING' ||
		normalized === 'NONE' ||
		normalized === 'NULL' ||
		normalized === 'UNDEFINED' ||
		normalized === 'EMPTY'
	);
}

export function laneStepTypeValue(pad: any) {
	return String(pad?.stepType ?? pad?.padType ?? '').trim().toUpperCase();
}

export function makeNothingPad(pad: any) {
	return {
		...(pad ?? {}),
		item: 'NOTHING',
		outcome: 'NOTHING'
	};
}

export function withStepPads(entry: any, stepPads: Record<string, any>) {
	const hadSteps = entry?.steps != null;
	const hadPads = entry?.pads != null;
	return {
		...entry,
		steps: hadSteps ? stepPads : undefined,
		pads: hadPads ? stepPads : undefined
	};
}
