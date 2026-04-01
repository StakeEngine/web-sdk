type LoopAudioState = {
	gain: GainNode;
	source: AudioBufferSourceNode | null;
	buffer: AudioBuffer | null;
	loading: Promise<AudioBuffer> | null;
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

	const ensureLoopBuffer = async (key: SoundKey) => {
		const ctx = ensureAudioContext();
		const state = ensureLoopState(key);
		if (!ctx || !state) return null;
		if (state.buffer) return state.buffer;
		if (!state.loading) {
			state.loading = (async () => {
				const response = await fetch(soundSrc[key]);
				const arrayBuffer = await response.arrayBuffer();
				return await ctx.decodeAudioData(arrayBuffer.slice(0));
			})();
		}
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
		const audio = new Audio(soundSrc[key]);
		audio.preload = 'auto';
		audio.volume = master * soundGain[key];
		void audio.play().catch(() => {});
	};

	const updateMix = () => {
		for (const key of loopSounds) {
			setLoopGain(key);
		}
	};

	const ensureUnlocked = () => {
		const ctx = ensureAudioContext();
		if (!ctx) {
			setAudioUnlocked(false);
			return;
		}
		if (ctx.state === 'suspended') {
			void ctx
				.resume()
				.then(() => {
					const unlocked = ctx.state === 'running';
					setAudioUnlocked(unlocked);
					if (unlocked) onAudioUnlocked?.();
				})
				.catch(() => {
					setAudioUnlocked(false);
				});
			return;
		}
		setAudioUnlocked(ctx.state === 'running');
		if (ctx.state === 'running') onAudioUnlocked?.();
	};

	const dispose = () => {
		for (const key of Object.keys(loopAudioState) as SoundKey[]) {
			stopLoop(key);
		}
		loopAudioState = {};
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
		dispose
	};
}
