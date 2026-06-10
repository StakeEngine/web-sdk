export function randomGhostOutcome(baseStake = 1, random: () => number = Math.random) {
	const options = ['coin', 'star', 'banana'] as const;
	const pick = options[Math.floor(random() * options.length)];
	if (pick === 'coin') {
		const coinValue = Math.max(1, Math.round(baseStake)) * (1 + Math.floor(random() * 5));
		return { type: 'coin', extra: { cosmetic: true, coinValue } };
	}
	if (pick === 'star') {
		const multiplier = 2 + Math.floor(random() * 4);
		return { type: 'star', extra: { cosmetic: true, multiplier } };
	}
	if (pick === 'lifering') {
		return { type: 'lifering', extra: { cosmetic: true } };
	}
	return { type: 'banana', extra: { cosmetic: true } };
}

export function parseOutcome(
	item: string,
	padType?: string,
	sinking?: boolean,
	baseStake = 1,
	random: () => number = Math.random
) {
	void sinking;
	const normalized = String(item || '').trim().toUpperCase();
	const pad = String(padType || '').trim().toUpperCase();
	if (
		pad === 'STONE' ||
		normalized === 'STONE' ||
		normalized === 'STONE_COLLECT' ||
		normalized === 'GOAL'
	) {
		return { type: 'goal', extra: {} };
	}
	if (pad === 'LILY' && normalized === 'BANANA') {
		return { type: 'banana', extra: { fall: true } };
	}
	if (pad === 'LILY' && (normalized === 'LIFE_VEST' || normalized === 'LIFE_RING')) {
		return { type: 'lifering', extra: {} };
	}
	if (normalized === 'LIFE_VEST' || normalized === 'LIFE_RING') {
		return { type: 'lifering', extra: {} };
	}
	if (normalized.startsWith('X')) {
		const multiplier = Number(normalized.slice(1));
		return { type: 'star', extra: { multiplier } };
	}
	if (normalized.startsWith('+')) {
		const coinValue = Number(normalized.slice(1));
		return { type: 'coin', extra: { coinValue } };
	}
	if (normalized === 'GHOST') {
		return randomGhostOutcome(baseStake, random);
	}
	if (normalized === 'SLIP' || normalized === 'SINK') {
		return { type: 'banana', extra: { fall: true } };
	}
	if (normalized === 'BANANA') {
		return { type: 'banana', extra: {} };
	}
	return { type: 'empty', extra: {} };
}
