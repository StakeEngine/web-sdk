export type RandomFn = () => number;

function normalizeSeedInput(seedInput: unknown) {
	if (seedInput == null) return 'penguin-slide-default-seed';
	if (typeof seedInput === 'string') return seedInput;
	if (
		typeof seedInput === 'number' ||
		typeof seedInput === 'bigint' ||
		typeof seedInput === 'boolean'
	) {
		return String(seedInput);
	}
	try {
		return JSON.stringify(seedInput);
	} catch {
		return String(seedInput);
	}
}

function hashSeed(seedInput: unknown) {
	const text = normalizeSeedInput(seedInput);
	let hash = 2166136261;
	for (let i = 0; i < text.length; i += 1) {
		hash ^= text.charCodeAt(i);
		hash = Math.imul(hash, 16777619);
	}
	return hash >>> 0;
}

export function createSeededRandom(seedInput: unknown): RandomFn {
	let state = hashSeed(seedInput) || 0x9e3779b9;
	return () => {
		state = (state + 0x6d2b79f5) >>> 0;
		let mixed = state;
		mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
		mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
		return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
	};
}

export function createFrontendRandomStreams(seedInput: unknown) {
	const seedKey = normalizeSeedInput(seedInput);
	return {
		seedKey,
		route: createSeededRandom(`${seedKey}:route`),
		lane: createSeededRandom(`${seedKey}:lane`),
		ghost: createSeededRandom(`${seedKey}:ghost`),
		iceLayout: createSeededRandom(`${seedKey}:ice-layout`),
		iceSpawn: createSeededRandom(`${seedKey}:ice-spawn`)
	};
}
