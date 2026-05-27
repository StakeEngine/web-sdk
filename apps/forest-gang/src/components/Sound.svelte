<script lang="ts" module>
	import { sound, type MusicName, type SoundEffectName, type SoundName } from '../game/sound';

	export type EmitterEventSound =
		| { type: 'soundMusic'; name: MusicName }
		| { type: 'soundOnce'; name: SoundEffectName; forcePlay?: boolean }
		| { type: 'soundLoop'; name: SoundEffectName }
		| { type: 'soundStop'; name: SoundName }
		| { type: 'soundFade'; name: SoundName; from: number; to: number; duration: number }
		| { type: 'soundScatterCounterIncrease' }
		| { type: 'soundScatterCounterClear' };
</script>

<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';

	import { waitForTimeout } from 'utils-shared/wait';
	import { SECOND } from 'constants-shared/time';
	import { stateBet } from 'state-shared';

	import { getContext } from '../game/context';

	const context = getContext();
	const ambientTrackUrl = './forest-gang/audio-idea.wav';
	let ambientAudio: HTMLAudioElement | null = null;
	let ambientUnlocked = false;

	const playAmbient = async (mode: 'base' | 'bonus') => {
		if (!browser || !ambientAudio) return;
		ambientAudio.loop = true;
		ambientAudio.volume = mode === 'bonus' ? 0.32 : 0.22;
		try {
			await ambientAudio.play();
			ambientUnlocked = true;
		} catch {
			// ignore autoplay block until first gesture
		}
	};

	const stopAmbient = () => {
		if (!ambientAudio) return;
		ambientAudio.pause();
		ambientAudio.currentTime = 0;
	};

	const playMusic = ({ name }: { name: MusicName }) => {
		if (name === 'bgm_main') {
			sound.stop({ name: 'bgm_freespin' });
			return playAmbient('base');
		}

		if (name === 'bgm_freespin') {
			sound.stop({ name: 'bgm_main' });
			return playAmbient('bonus');
		}

		stopAmbient();
		sound.players.music.play({ name });
	};

	context.eventEmitter.subscribeOnMount({
		// ui
		soundBetMode: async ({ betModeKey }) => {
			if (betModeKey === 'SUPER') {
				// check if SUPERSPIN, when changing the bet mode.
				sound.players.once.play({ name: 'sfx_winlevel_end' });
				await waitForTimeout(SECOND);
				sound.players.music.play({ name: 'bgm_freespin' });
			} else {
				sound.players.music.play({ name: 'bgm_main' });
			}
		},
		soundPressGeneral: () => sound.players.once.play({ name: 'sfx_btn_general' }),
		soundPressBet: () => sound.players.once.play({ name: 'sfx_btn_spin' }),
		// scatterCounter
		soundScatterCounterIncrease: () => (context.stateGame.scatterCounter = context.stateGame.scatterCounter + 1), // prettier-ignore
		soundScatterCounterClear: () => (context.stateGame.scatterCounter = 0),
		// game
		soundMusic: ({ name }) => playMusic({ name }),
		soundLoop: ({ name }) => sound.players.loop.play({ name }),
		soundOnce: ({ name, forcePlay }) => sound.players.once.play({ name, forcePlay }),
		soundStop: ({ name }) => { if (name === 'bgm_main' || name === 'bgm_freespin') stopAmbient(); sound.stop({ name }); },
		soundFade: async ({ name, duration, from, to }) => await sound.fade({ name, duration, from, to }), // prettier-ignore
	});

	onMount(() => {
		ambientAudio = browser ? new Audio(ambientTrackUrl) : null;
		const unlockAmbient = async () => {
			if (ambientUnlocked) return;
			await playAmbient(stateBet.activeBetModeKey === 'SUPER' ? 'bonus' : 'base');
		};

		window.addEventListener('pointerdown', unlockAmbient, { once: true });
		window.addEventListener('keydown', unlockAmbient, { once: true });

		if (stateBet.activeBetModeKey === 'SUPER') {
			playAmbient('bonus');
		} else {
			playAmbient('base');
		}

		return () => {
			window.removeEventListener('pointerdown', unlockAmbient);
			window.removeEventListener('keydown', unlockAmbient);
			stopAmbient();
		};
	});
</script>
