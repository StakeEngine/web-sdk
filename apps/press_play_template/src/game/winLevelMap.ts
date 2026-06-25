import type { WinLevel } from 'utils-shared/winLevel';

// CHANGE ME: update win text labels and sound names to match your game's audio assets
export const winLevelMap: WinLevel[] = [
	{ alias: 'zero',        minMultiplier: 0,    maxMultiplier: 0.5,   soundName: null,                    animationName: null,              winText: '' },
	{ alias: 'standard',    minMultiplier: 0.5,  maxMultiplier: 2,     soundName: 'sfx_winlevel_standard', animationName: null,              winText: '' },
	{ alias: 'small',       minMultiplier: 2,    maxMultiplier: 5,     soundName: 'sfx_winlevel_small',    animationName: null,              winText: 'NICE WIN' },
	{ alias: 'nice',        minMultiplier: 5,    maxMultiplier: 10,    soundName: 'sfx_winlevel_nice',     animationName: null,              winText: 'SWEET WIN' },
	{ alias: 'substantial', minMultiplier: 10,   maxMultiplier: 25,    soundName: 'sfx_winlevel_nice',     animationName: null,              winText: 'BIG WIN' },
	{ alias: 'big',         minMultiplier: 25,   maxMultiplier: 50,    soundName: 'sfx_winlevel_nice',     animationName: 'big_win_intro',   winText: 'BIG WIN' },
	{ alias: 'superwin',    minMultiplier: 50,   maxMultiplier: 100,   soundName: 'bgm_winlevel_big',      animationName: 'super_win_intro', winText: 'SUPER WIN' },
	{ alias: 'mega',        minMultiplier: 100,  maxMultiplier: 250,   soundName: 'bgm_winlevel_mega',     animationName: 'mega_win_intro',  winText: 'MEGA WIN' },
	{ alias: 'epic',        minMultiplier: 250,  maxMultiplier: 1000,  soundName: 'bgm_winlevel_epic',     animationName: 'epic_win_intro',  winText: 'EPIC WIN' },
	{ alias: 'max',         minMultiplier: 1000, maxMultiplier: Infinity, soundName: 'bgm_winlevel_max',  animationName: 'max_win_intro',   winText: 'LEGENDARY WIN' },
];
