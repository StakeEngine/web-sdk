import { createSound } from 'utils-sound';

// CHANGE ME: add/remove sound names to match your game's audio files
export type MusicName =
	| 'bgm_main'
	| 'bgm_freespin'
	| 'bgm_winlevel_big'
	| 'bgm_winlevel_epic'
	| 'bgm_winlevel_max'
	| 'bgm_winlevel_mega'
	| 'bgm_winlevel_superwin';

export type SoundEffectName =
	| 'sfx_anticipation'
	| 'sfx_btn_general'
	| 'sfx_btn_spin'
	| 'sfx_reel_stop_1'
	| 'sfx_reel_stop_2'
	| 'sfx_reel_stop_3'
	| 'sfx_reel_stop_4'
	| 'sfx_reel_stop_5'
	| 'sfx_scatter_stop_1'
	| 'sfx_scatter_stop_2'
	| 'sfx_scatter_stop_3'
	| 'sfx_scatter_stop_4'
	| 'sfx_scatter_stop_5'
	| 'sfx_scatter_win'
	| 'sfx_winlevel_end'
	| 'sfx_winlevel_nice'
	| 'sfx_winlevel_small'
	| 'sfx_winlevel_standard'
	| 'sfx_youwon_panel'
	| 'sfx_bigwin_coinloop';

export type SoundName = MusicName | SoundEffectName;

const sound = createSound<SoundName>();
export { sound };
