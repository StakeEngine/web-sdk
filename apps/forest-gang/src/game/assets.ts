export default {
	loader: {
		type: 'spine',
		src: {
			atlas: './assets/spines/loader/loader.atlas',
			skeleton: './assets/spines/loader/loader.json',
			scale: 2,
		},
		preload: true,
	},



	visualV2: {
		type: 'sprite',
		src: './forest-gang/visual_v2.png',
		preload: true,
	},
	forestGangLogo: {
		type: 'sprite',
		src: './forest-gang/extracted/forest_gang_logo.png',
		preload: true,
	},
	foxTile: { type: 'sprite', src: './forest-gang/extracted/fox_tile.png', preload: true },
	wolfTile: { type: 'sprite', src: './forest-gang/extracted/wolf_tile.png', preload: true },
	bearTile: { type: 'sprite', src: './forest-gang/extracted/bear_tile.png', preload: true },
	rabbitTile: { type: 'sprite', src: './forest-gang/extracted/rabbit_tile.png', preload: true },
	squirrelTile: { type: 'sprite', src: './forest-gang/extracted/squirrel_tile.png', preload: true },
	aTile: { type: 'sprite', src: './forest-gang/extracted/a_tile.png', preload: true },
	kTile: { type: 'sprite', src: './forest-gang/extracted/k_tile.png', preload: true },
	qTile: { type: 'sprite', src: './forest-gang/extracted/q_tile.png', preload: true },
	jTile: { type: 'sprite', src: './forest-gang/extracted/j_tile.png', preload: true },
	tTile: { type: 'sprite', src: './forest-gang/extracted/j_alt_tile.png', preload: true },
	scatterCustom: {
		type: 'sprite',
		src: './forest-gang/scatter-symbol.png',
		preload: true,
	},
	pressToContinueText: {
		type: 'sprites',
		src: './assets/sprites/pressToContinueText/MM_pressanywhere.json',
		preload: true,
	},
	H1: {
		type: 'spine',
		src: {
			atlas: './assets/spines/symbols/symbols.atlas',
			skeleton: './assets/spines/symbols/h1.json',
			scale: 2,
		},
	},
	H2: {
		type: 'spine',
		src: {
			atlas: './assets/spines/symbols/symbols.atlas',
			skeleton: './assets/spines/symbols/h2.json',
			scale: 2,
		},
	},
	H3: {
		type: 'spine',
		src: {
			atlas: './assets/spines/symbols/symbols.atlas',
			skeleton: './assets/spines/symbols/h3.json',
			scale: 2,
		},
	},
	H4: {
		type: 'spine',
		src: {
			atlas: './assets/spines/symbols/symbols.atlas',
			skeleton: './assets/spines/symbols/h4.json',
			scale: 2,
		},
	},
	H5: {
		type: 'spine',
		src: {
			atlas: './assets/spines/symbols/symbols.atlas',
			skeleton: './assets/spines/symbols/h5.json',
			scale: 2,
		},
	},
	L1: {
		type: 'spine',
		src: {
			atlas: './assets/spines/symbols/symbols.atlas',
			skeleton: './assets/spines/symbols/l1.json',
			scale: 2,
		},
	},
	L2: {
		type: 'spine',
		src: {
			atlas: './assets/spines/symbols/symbols.atlas',
			skeleton: './assets/spines/symbols/l2.json',
			scale: 2,
		},
	},
	L3: {
		type: 'spine',
		src: {
			atlas: './assets/spines/symbols/symbols.atlas',
			skeleton: './assets/spines/symbols/l3.json',
			scale: 2,
		},
	},
	L4: {
		type: 'spine',
		src: {
			atlas: './assets/spines/symbols/symbols.atlas',
			skeleton: './assets/spines/symbols/l4.json',
			scale: 2,
		},
	},
	M: {
		type: 'spine',
		src: {
			atlas: './assets/spines/symbols2/symbols2.atlas',
			skeleton: './assets/spines/symbols2/M.json',
			scale: 2,
		},
	},
	S: {
		type: 'spine',
		src: {
			atlas: './assets/spines/symbols2/symbols2.atlas',
			skeleton: './assets/spines/symbols2/S.json',
			scale: 2,
		},
	},
	explosion: {
		type: 'spine',
		src: {
			atlas: './assets/spines/symbols3/symbols3.atlas',
			skeleton: './assets/spines/symbols3/explosion.json',
			scale: 2,
		},
	},
	W: {
		type: 'spine',
		src: {
			atlas: './assets/spines/symbols3/symbols3.atlas',
			skeleton: './assets/spines/symbols3/W.json',
			scale: 2,
		},
	},
	reelsFrame: {
		type: 'sprites',
		src: './assets/sprites/reelsFrame/reels_frame.json',
	},
	payFrame: {
		type: 'sprite',
		src: './assets/sprites/payFrame/payFrame.png',
	},
	anticipation: {
		type: 'spine',
		src: {
			atlas: './assets/spines/anticipation/anticipation.atlas',
			skeleton: './assets/spines/anticipation/anticipation.json',
			scale: 2,
		},
	},
	goldFont: {
		type: 'font',
		src: './assets/fonts/goldFont/mm_gold.xml',
	},
	goldBlur: {
		type: 'font',
		src: './assets/fonts/goldBlur/miningfont_gold_blur.xml',
	},
	silverFont: {
		type: 'font',
		src: './assets/fonts/silverFont/mm_silver.xml',
	},
	purpleFont: {
		type: 'font',
		src: './assets/fonts/purpleFont/mm_purple.xml',
	},
	bigwin: {
		type: 'spine',
		src: {
			atlas: './assets/spines/bigwin/big_wins.atlas',
			skeleton: './assets/spines/bigwin/mm_bigwin.json',
			scale: 2,
		},
	},
	globalMultiplier: {
		type: 'spine',
		src: {
			atlas: './assets/spines/globalMultiplier/multiframe.atlas',
			skeleton: './assets/spines/globalMultiplier/multiframe.json',
			scale: 2,
		},
	},
	fsIntro: {
		type: 'spine',
		src: {
			atlas: './assets/spines/fsIntro/fs_screen.atlas',
			skeleton: './assets/spines/fsIntro/fs_screen.json',
			scale: 2,
		},
	},
	fsIntroNumber: {
		type: 'spine',
		src: {
			atlas: './assets/spines/fsIntro/fs_screen.atlas',
			skeleton: './assets/spines/fsIntro/fs_screen_number.json',
			scale: 2,
		},
	},
	fsOutroNumber: {
		type: 'spine',
		src: {
			atlas: './assets/spines/fsIntro/fs_screen.atlas',
			skeleton: './assets/spines/fsIntro/fs_total_number.json',
			scale: 2,
		},
	},
	foregroundAnimation: {
		type: 'spine',
		src: {
			atlas: './assets/spines/foregroundAnimation/mm_bg.atlas',
			skeleton: './assets/spines/foregroundAnimation/mm_bg.json',
			scale: 2,
		},
		preload: true,
	},
	foregroundFeatureAnimation: {
		type: 'spine',
		src: {
			atlas: './assets/spines/foregroundFeatureAnimation/mm_bg_feature.atlas',
			skeleton: './assets/spines/foregroundFeatureAnimation/mm_bg_feature.json',
			scale: 2,
		},
		preload: true,
	},
	tumble_multiplier: {
		type: 'spine',
		src: {
			atlas: './assets/spines/tumbleWin/tumble_win.atlas',
			skeleton: './assets/spines/tumbleWin/tumble_multiplier.json',
			scale: 2,
		},
	},
	tumble_win: {
		type: 'spine',
		src: {
			atlas: './assets/spines/tumbleWin/tumble_win.atlas',
			skeleton: './assets/spines/tumbleWin/tumble_win.json',
			scale: 2,
		},
	},
	reelhouse: {
		type: 'spine',
		src: {
			atlas: './assets/spines/reelhouse/reelhouse_glow.atlas',
			skeleton: './assets/spines/reelhouse/reelhouse_glow.json',
			scale: 2,
		},
	},
	progressBar: {
		type: 'sprites',
		src: './assets/sprites/progressBar/progressBar.json',
		preload: true,
	},
	freeSpins: {
		type: 'sprites',
		src: './assets/sprites/freeSpins/freeSpins.json',
	},
	winSmall: {
		type: 'sprites',
		src: './assets/sprites/winSmall/MM_Localisation_winsmall.json',
	},
	clusterWin: {
		type: 'spine',
		src: {
			atlas: './assets/spines/clusterWin/clusterpay.atlas',
			skeleton: './assets/spines/clusterWin/clusterpay.json',
			scale: 2,
		},
	},
	transition: {
		type: 'spine',
		src: {
			atlas: './assets/spines/transition/transition.atlas',
			skeleton: './assets/spines/transition/transition.json',
			scale: 2,
		},
	},
	symbolsStatic: {
		type: 'sprites',
		src: './assets/sprites/symbolsStatic/symbolsStatic.json',
	},
	coins: {
		type: 'spriteSheet',
		src: './assets/sprites/coin/SD2_Coin.json',
	},
	sound: {
		type: 'audio',
		src: './assets/audio/sounds.json',
		preload: true,
	},
} as const;
