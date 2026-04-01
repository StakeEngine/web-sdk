export type SoundKey =
	| 'music_loop'
	| 'penguin_slide_loop'
	| 'penguin_fall'
	| 'penguin_finish'
	| 'penguin_turn'
	| 'pickup_banana'
	| 'pickup_bronze'
	| 'pickup_buy'
	| 'pickup_gold'
	| 'pickup_multi'
	| 'pickup_silver'
	| 'start_button'
	| 'ui_bet_up'
	| 'ui_bet_down';

export const SOUND_RELATIVE_PATHS: Record<SoundKey, string> = {
	music_loop: '/sounds/music_loop.wav',
	penguin_slide_loop: '/sounds/penguin_slide_loop.wav',
	penguin_fall: '/sounds/penguin_fall.wav',
	penguin_finish: '/sounds/penguin_finish.wav',
	penguin_turn: '/sounds/penguin_turn.wav',
	pickup_banana: '/sounds/pickup_banana.wav',
	pickup_bronze: '/sounds/pickup_bronze.wav',
	pickup_buy: '/sounds/pickup_buy.wav',
	pickup_gold: '/sounds/pickup_gold.wav',
	pickup_multi: '/sounds/pickup_multi.wav',
	pickup_silver: '/sounds/pickup_silver.wav',
	start_button: '/sounds/start_button.wav',
	ui_bet_up: '/sounds/ui_bet_up.wav',
	ui_bet_down: '/sounds/ui_bet_down.wav'
};

export const LOOP_SOUNDS = new Set<SoundKey>(['music_loop', 'penguin_slide_loop']);

export const SOUND_GAIN: Record<SoundKey, number> = {
	music_loop: 0.35,
	penguin_slide_loop: 0.6,
	penguin_fall: 1,
	penguin_finish: 1,
	penguin_turn: 0.9,
	pickup_banana: 1,
	pickup_bronze: 1,
	pickup_buy: 1,
	pickup_gold: 1,
	pickup_multi: 1,
	pickup_silver: 1,
	start_button: 1,
	ui_bet_up: 1,
	ui_bet_down: 1
};

export function buildSoundSrc(assetPath: (path: string) => string): Record<SoundKey, string> {
	const entries = Object.entries(SOUND_RELATIVE_PATHS) as Array<[SoundKey, string]>;
	return Object.fromEntries(entries.map(([key, path]) => [key, assetPath(path)])) as Record<
		SoundKey,
		string
	>;
}
