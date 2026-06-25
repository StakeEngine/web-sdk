import type { Assets } from 'pixi-svelte';

// CHANGE ME: replace all asset paths with your game's actual files
// Structure: each key is referenced in SYMBOL_INFO_MAP and components

const assets: Assets = {
	// === SYMBOLS — CHANGE ME ===
	// Place your symbol PNGs in static/assets/components/symbols/
	sym_h1:       { type: 'sprite', src: './assets/components/symbols/sym_h1.png',       preload: true },
	sym_h2:       { type: 'sprite', src: './assets/components/symbols/sym_h2.png',       preload: true },
	sym_h3:       { type: 'sprite', src: './assets/components/symbols/sym_h3.png',       preload: true },
	sym_h4:       { type: 'sprite', src: './assets/components/symbols/sym_h4.png',       preload: true },
	sym_h5:       { type: 'sprite', src: './assets/components/symbols/sym_h5.png',       preload: true },
	sym_l1:       { type: 'sprite', src: './assets/components/symbols/sym_l1.png',       preload: true },
	sym_l2:       { type: 'sprite', src: './assets/components/symbols/sym_l2.png',       preload: true },
	sym_l3:       { type: 'sprite', src: './assets/components/symbols/sym_l3.png',       preload: true },
	sym_l4:       { type: 'sprite', src: './assets/components/symbols/sym_l4.png',       preload: true },
	sym_l5:       { type: 'sprite', src: './assets/components/symbols/sym_l5.png',       preload: true },
	sym_wild:     { type: 'sprite', src: './assets/components/symbols/sym_wild.png',     preload: true },
	sym_scatter:  { type: 'sprite', src: './assets/components/symbols/sym_scatter.png',  preload: true },
	// Win state variants — CHANGE ME (can be same as normal or separate glow/highlight version)
	sym_h1_win:   { type: 'sprite', src: './assets/components/symbols/sym_h1_win.png',   preload: false },
	sym_h2_win:   { type: 'sprite', src: './assets/components/symbols/sym_h2_win.png',   preload: false },
	sym_h3_win:   { type: 'sprite', src: './assets/components/symbols/sym_h3_win.png',   preload: false },
	sym_h4_win:   { type: 'sprite', src: './assets/components/symbols/sym_h4_win.png',   preload: false },
	sym_h5_win:   { type: 'sprite', src: './assets/components/symbols/sym_h5_win.png',   preload: false },
	sym_l1_win:   { type: 'sprite', src: './assets/components/symbols/sym_l1_win.png',   preload: false },
	sym_l2_win:   { type: 'sprite', src: './assets/components/symbols/sym_l2_win.png',   preload: false },
	sym_l3_win:   { type: 'sprite', src: './assets/components/symbols/sym_l3_win.png',   preload: false },
	sym_l4_win:   { type: 'sprite', src: './assets/components/symbols/sym_l4_win.png',   preload: false },
	sym_l5_win:   { type: 'sprite', src: './assets/components/symbols/sym_l5_win.png',   preload: false },
	sym_wild_win: { type: 'sprite', src: './assets/components/symbols/sym_wild_win.png', preload: false },
	// Expanded symbol variants for bonus — CHANGE ME
	sym_h1_expand: { type: 'sprite', src: './assets/components/symbols/sym_h1_expand.png', preload: false },
	sym_h2_expand: { type: 'sprite', src: './assets/components/symbols/sym_h2_expand.png', preload: false },
	sym_h3_expand: { type: 'sprite', src: './assets/components/symbols/sym_h3_expand.png', preload: false },
	sym_h4_expand: { type: 'sprite', src: './assets/components/symbols/sym_h4_expand.png', preload: false },
	sym_h5_expand: { type: 'sprite', src: './assets/components/symbols/sym_h5_expand.png', preload: false },
	sym_l1_expand: { type: 'sprite', src: './assets/components/symbols/sym_l1_expand.png', preload: false },
	sym_l2_expand: { type: 'sprite', src: './assets/components/symbols/sym_l2_expand.png', preload: false },
	sym_l3_expand: { type: 'sprite', src: './assets/components/symbols/sym_l3_expand.png', preload: false },
	sym_l4_expand: { type: 'sprite', src: './assets/components/symbols/sym_l4_expand.png', preload: false },
	sym_l5_expand: { type: 'sprite', src: './assets/components/symbols/sym_l5_expand.png', preload: false },
	// === BACKGROUND — CHANGE ME ===
	background:   { type: 'sprite', src: './assets/components/backgrounds/background.png', preload: true },
	splash:       { type: 'sprite', src: './assets/components/backgrounds/splash.jpg',     preload: true },
	// === FRAMES / UI — CHANGE ME ===
	boardFrame:   { type: 'sprite', src: './assets/components/frames/board_frame.png',     preload: true },
	symbolPad:    { type: 'sprite', src: './assets/components/frames/symbol_pad.png',      preload: false },
	gameLogo:     { type: 'sprite', src: './assets/components/ui/game_logo.png',           preload: false },
	// === WIN BOARDS — CHANGE ME ===
	sweetWinBoard:  { type: 'sprite', src: './assets/components/win/win_board.png', preload: false },
	bigWinBoard:    { type: 'sprite', src: './assets/components/win/win_board.png', preload: false },
	superWinBoard:  { type: 'sprite', src: './assets/components/win/win_board.png', preload: false },
	megaWinBoard:   { type: 'sprite', src: './assets/components/win/win_board.png', preload: false },
	epicWinBoard:   { type: 'sprite', src: './assets/components/win/win_board.png', preload: false },
	// === SPINE ANIMATIONS — CHANGE ME ===
	anticipation:   { type: 'spine', src: './assets/spines/anticipation/anticipation.json',   preload: false },
	bigwin:         { type: 'spine', src: './assets/spines/bigwin/bigwin.json',               preload: false },
	fsIntro:        { type: 'spine', src: './assets/spines/fsIntro/fsIntro.json',             preload: false },
	transition:     { type: 'spine', src: './assets/spines/transition/transition.json',       preload: false },
	// === FONTS ===
	goldFont:       { type: 'bitmapFont', src: './assets/fonts/gold.fnt',   preload: true },
	silverFont:     { type: 'bitmapFont', src: './assets/fonts/silver.fnt', preload: true },
	// === SOUNDS ===
	sounds:         { type: 'sound', src: './assets/audio/sounds.json', preload: true },
	// === LOADING BAR ===
	'progressBarBackground.png': { type: 'sprite', src: './assets/components/ui/progress_bar_bg.png',   preload: true },
	'progressBarLeaf.png':       { type: 'sprite', src: './assets/components/ui/progress_bar_leaf.png', preload: true },
};

export default assets;
