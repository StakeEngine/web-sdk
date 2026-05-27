type LoopAudioState = {
	gain: GainNode;
	source: AudioBufferSourceNode | null;
	buffer: AudioBuffer | null;
	loading: Promise<AudioBuffer | null> | null;
};

export function createAudioEngine<SoundKey extends string>(args: {
	soundSrc: Record<SoundKey, string>;
	soundGain: Record<SoundKey, number>;
	loopSounds: Set<SoundKey>;
	getSoundEnabled: () => boolean;
	getMasterVolume: () => number;
	getLoopVolume: (key: SoundKey) => number;
	setAudioUnlocked: (value: boolean) => void;
	onAudioUnlocked?: () => void;
}) {
	const {
		soundSrc,
		soundGain,
		loopSounds,
		getSoundEnabled,
		getMasterVolume,
		getLoopVolume,
		setAudioUnlocked,
		onAudioUnlocked
	} = args;
	let audioContext: AudioContext | null = null;
	let loopAudioState: Partial<Record<SoundKey, LoopAudioState>> = {};
	let oneShotBufferCache: Partial<Record<SoundKey, AudioBuffer>> = {};
	let oneShotLoadingCache: Partial<Record<SoundKey, Promise<AudioBuffer>>> = {};
	let oneShotActiveCounts: Partial<Record<SoundKey, number>> = {};
	let oneShotLastPlayAt: Partial<Record<SoundKey, number>> = {};
	let activeOneShotTotal = 0;

	const MAX_SIMULTANEOUS_ONE_SHOTS_TOTAL = 12;
	const MAX_SIMULTANEOUS_ONE_SHOTS_PER_KEY = 3;
	const MIN_ONE_SHOT_GAP_MS = 40;

	const ensureAudioContext = () => {
		if (!getSoundEnabled()) return null;
		if (!audioContext) {
			const Ctx = window.AudioContext || (window as any).webkitAudioContext;
			if (!Ctx) return null;
			audioContext = new Ctx();
		}
		if (audioContext.state === 'suspended') {
			void audioContext.resume().catch(() => {});
		}
		return audioContext;
	};

	const ensureLoopState = (key: SoundKey) => {
		if (!loopSounds.has(key)) return null;
		const ctx = ensureAudioContext();
		if (!ctx) return null;
		let state = loopAudioState[key];
		if (!state) {
			const gain = ctx.createGain();
			gain.connect(ctx.destination);
			state = { gain, source: null, buffer: null, loading: null };
			loopAudioState[key] = state;
		}
		return state;
	};

	const ensureDecodedBuffer = async (key: SoundKey) => {
		const ctx = ensureAudioContext();
		if (!ctx) return null;
		const loopState = loopSounds.has(key) ? ensureLoopState(key) : null;
		if (loopState?.buffer) return loopState.buffer;
		if (oneShotBufferCache[key]) return oneShotBufferCache[key] ?? null;
		if (!oneShotLoadingCache[key]) {
			oneShotLoadingCache[key] = (async () => {
				const response = await fetch(soundSrc[key]);
				const arrayBuffer = await response.arrayBuffer();
				return await ctx.decodeAudioData(arrayBuffer.slice(0));
			})();
		}
		try {
			const buffer = await oneShotLoadingCache[key];
			if (loopState) {
				loopState.buffer = buffer;
			} else {
				oneShotBufferCache[key] = buffer;
			}
			return buffer;
		} catch {
			return null;
		} finally {
			delete oneShotLoadingCache[key];
		}
	};

	const ensureLoopBuffer = async (key: SoundKey) => {
		const state = ensureLoopState(key);
		if (!state) return null;
		if (state.buffer) return state.buffer;
		if (!state.loading) state.loading = ensureDecodedBuffer(key);
		try {
			state.buffer = await state.loading;
			return state.buffer;
		} catch {
			return null;
		} finally {
			state.loading = null;
		}
	};

	const setLoopGain = (key: SoundKey) => {
		const state = loopAudioState[key];
		if (!state) return;
		state.gain.gain.value = getLoopVolume(key);
	};

	const playLoop = async (key: SoundKey, restart = false) => {
		if (!loopSounds.has(key)) return;
		const state = ensureLoopState(key);
		const buffer = await ensureLoopBuffer(key);
		if (!state || !buffer) return;
		if (restart && state.source) {
			try {
				state.source.stop();
			} catch {}
			state.source.disconnect();
			state.source = null;
		}
		if (state.source) {
			setLoopGain(key);
			return;
		}
		const ctx = ensureAudioContext();
		if (!ctx) return;
		const source = ctx.createBufferSource();
		source.buffer = buffer;
		source.loop = true;
		source.connect(state.gain);
		state.source = source;
		setLoopGain(key);
		source.onended = () => {
			if (state.source === source) state.source = null;
		};
		source.start(0);
	};

	const stopLoop = (key: SoundKey) => {
		const state = loopAudioState[key];
		if (!state?.source) return;
		try {
			state.source.stop();
		} catch {}
		state.source.disconnect();
		state.source = null;
	};

	const playOneShot = (key: SoundKey) => {
		const master = getMasterVolume();
		if (master <= 0) return;
		const ctx = ensureAudioContext();
		if (!ctx || ctx.state !== 'running') return;
		const now = performance.now();
		if (activeOneShotTotal >= MAX_SIMULTANEOUS_ONE_SHOTS_TOTAL) return;
		if ((oneShotActiveCounts[key] ?? 0) >= MAX_SIMULTANEOUS_ONE_SHOTS_PER_KEY) return;
		if (now - (oneShotLastPlayAt[key] ?? 0) < MIN_ONE_SHOT_GAP_MS) return;
		oneShotLastPlayAt[key] = now;
		void ensureDecodedBuffer(key).then((buffer) => {
			if (!buffer) return;
			const liveCtx = ensureAudioContext();
			if (!liveCtx || liveCtx.state !== 'running') return;
			if (activeOneShotTotal >= MAX_SIMULTANEOUS_ONE_SHOTS_TOTAL) return;
			if ((oneShotActiveCounts[key] ?? 0) >= MAX_SIMULTANEOUS_ONE_SHOTS_PER_KEY) return;
			const gain = liveCtx.createGain();
			gain.gain.value = master * soundGain[key];
			gain.connect(liveCtx.destination);
			const source = liveCtx.createBufferSource();
			source.buffer = buffer;
			source.connect(gain);
			activeOneShotTotal += 1;
			oneShotActiveCounts[key] = (oneShotActiveCounts[key] ?? 0) + 1;
			source.onended = () => {
				activeOneShotTotal = Math.max(0, activeOneShotTotal - 1);
				oneShotActiveCounts[key] = Math.max(0, (oneShotActiveCounts[key] ?? 1) - 1);
				try {
					source.disconnect();
				} catch {}
				try {
					gain.disconnect();
				} catch {}
			};
			source.start(0);
		});
	};

	const updateMix = () => {
		for (const key of loopSounds) {
			setLoopGain(key);
		}
	};

	const ensureUnlocked = async () => {
		const ctx = ensureAudioContext();
		if (!ctx) {
			setAudioUnlocked(false);
			return false;
		}
		if (ctx.state === 'suspended') {
			try {
				await ctx.resume();
			} catch {
				setAudioUnlocked(false);
				return false;
			}
		}
		const unlocked = ctx.state === 'running';
		setAudioUnlocked(unlocked);
		if (unlocked) onAudioUnlocked?.();
		return unlocked;
	};

	const suspend = async () => {
		if (!audioContext) return;
		try {
			if (audioContext.state === 'running') {
				await audioContext.suspend();
			}
		} catch {}
	};

	const dispose = () => {
		for (const key of Object.keys(loopAudioState) as SoundKey[]) {
			stopLoop(key);
		}
		loopAudioState = {};
		oneShotBufferCache = {};
		oneShotLoadingCache = {};
		oneShotActiveCounts = {};
		oneShotLastPlayAt = {};
		activeOneShotTotal = 0;
		if (audioContext) {
			void audioContext.close().catch(() => {});
			audioContext = null;
		}
		setAudioUnlocked(false);
	};

	return {
		playLoop,
		stopLoop,
		playOneShot,
		updateMix,
		ensureUnlocked,
		suspend,
		dispose
	};
}
