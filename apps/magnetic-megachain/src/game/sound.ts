import { createSound } from 'utils-sound';

export type MusicName =
	| 'bgm_main'
	| 'bgm_freespin'
	| 'bgm_winlevel_big'
	| 'bgm_winlevel_epic'
	| 'bgm_winlevel_max'
	| 'bgm_winlevel_mega'
	| 'bgm_winlevel_superwin';

export type SoundEffectName =
	| 'jng_intro_fs'
	| 'sfx_anticipation'
	| 'sfx_anticipation_start'
	| 'sfx_bigwin_coinloop'
	| 'sfx_btn_general'
	| 'sfx_btn_spin'
	| 'sfx_fs_respins'
	| 'sfx_multiplier_combine_a'
	| 'sfx_multiplier_combine_b'
	| 'sfx_multiplier_explosion_a'
	| 'sfx_multiplier_explosion_b'
	| 'sfx_multiplier_explosion_c'
	| 'sfx_multiplier_landing'
	| 'sfx_multiplier_reset'
	| 'sfx_multiplier_up'
	| 'sfx_multiplier_update'
	| 'sfx_multiplier_win'
	| 'sfx_reel_stop_1'
	| 'sfx_reel_stop_2'
	| 'sfx_reel_stop_3'
	| 'sfx_reel_stop_4'
	| 'sfx_reel_stop_5'
	| 'sfx_royals_landing'
	| 'sfx_scatter_reveal'
	| 'sfx_scatter_stop_1'
	| 'sfx_scatter_stop_2'
	| 'sfx_scatter_stop_3'
	| 'sfx_scatter_stop_4'
	| 'sfx_scatter_stop_5'
	| 'sfx_scatter_win'
	| 'sfx_scatter_win_v2'
	| 'sfx_superfreespin'
	| 'sfx_symbols_landing'
	| 'sfx_wild_explode'
	| 'sfx_winlevel_end'
	| 'sfx_winlevel_nice'
	| 'sfx_winlevel_small'
	| 'sfx_winlevel_standard'
	| 'sfx_winlevel_substantial'
	| 'sfx_youwon_panel'
	| 'tumble_win_1'
	| 'tumble_win_2'
	| 'tumble_win_3'
	| 'tumble_win_4';

export type SoundName = MusicName | SoundEffectName;

const sound = createSound<SoundName>();

export { sound };
