import { Howl } from 'howler';

import { type LoadedAudio } from 'pixi-svelte';
import { waitForTimeout } from 'utils-shared/wait';

import type { StopOptions, FadeOptions, GetSound, GetSoundMap, RateOptions } from './types';

function createPlayer<TSoundName extends string, TPlay extends Function>(playerOptions: {
	loadedAudio: LoadedAudio<TSoundName>;
	loop: boolean;
	howl: Howl;
	createPlay: (options: {
		howl: Howl;
		newSound: (value: TSoundName) => GetSound<TSoundName>;
		getSoundMap: () => GetSoundMap<TSoundName>;
		initSoundVolume: (soundName: TSoundName) => void;
	}) => { play: TPlay };
}) {
	type Sound = GetSound<TSoundName>;

	type SoundMap = Record<TSoundName, Sound>;

	let soundMap = {} as SoundMap;
	let playerVolume = 1;

	const newSound = (soundName: TSoundName) =>
		({
			soundName,
			soundId: 0,
			soundState: 'new',
			soundConfig: playerOptions.loadedAudio.config[soundName] ?? { volume: 1 },
			soundVolume: 1,
		}) as Sound;

	const initSoundVolume = (soundName: TSoundName) => {
		const existingSound = soundMap[soundName];
		if (existingSound) {
			playerOptions.howl.volume(
				playerVolume * existingSound.soundVolume * existingSound.soundConfig.volume,
				existingSound.soundId,
			);
		}
	};

	const { play } = playerOptions.createPlay({
		howl: playerOptions.howl,
		newSound,
		getSoundMap: () => soundMap,
		initSoundVolume: (soundName: TSoundName) => initSoundVolume(soundName),
	});

	const stop = (stopOptions: StopOptions<TSoundName>) => {
		const existingSound = soundMap[stopOptions.name];
		if (existingSound) {
			playerOptions.howl.stop(existingSound.soundId);
			delete soundMap[existingSound.soundName];
		}
	};

	const fade = async (fadeOptions: FadeOptions<TSoundName>) => {
		const existingSound = soundMap[fadeOptions.name];
		if (existingSound) {
			existingSound.soundVolume = fadeOptions.to;

			//Adjust the whole player volume	howl
			playerOptions.howl.fade(
				fadeOptions.from * playerVolume * existingSound.soundConfig.volume,
				fadeOptions.to * playerVolume * existingSound.soundConfig.volume,
				fadeOptions.duration,
				existingSound.soundId,
			);
		}
	};

	const rate = (rateOptions: RateOptions<TSoundName>) => {
		const existingSound = soundMap[rateOptions.name];
		if (existingSound) {
			playerOptions.howl.rate(rateOptions.rate, existingSound.soundId);
		}
	};

	const volume = (volume: number) => {
		playerVolume = volume;

		//Adjust the whole player volume
		// howl.volume(playerVolume);

		//adjust volume per sound
		(Object.values(soundMap) as Sound[]).forEach((sound) => {
			playerOptions.howl.volume(
				playerVolume * sound.soundVolume * sound.soundConfig.volume,
				sound.soundId,
			);
		});
	};

	const debug = () => {
		console.log($state.snapshot(soundMap));
	};

	return {
		play,
		stop,
		fade,
		volume,
		rate,
		howl: playerOptions.howl,
		debug,
	};
}

export type Player<TSoundName extends string, TPlay extends Function> = ReturnType<
	typeof createPlayer<TSoundName, TPlay>
>;

export { createPlayer };
