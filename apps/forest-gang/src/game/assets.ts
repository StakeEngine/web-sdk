export default {
	vineLineTexture: { type: 'sprite', src: './assets/components/ui/vine_line.png?v=20260617g', preload: true },
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
		src: './assets/components/backgrounds/visual_v2.jpg?v=20260611',
		preload: true,
	},
	splash: {
		type: 'sprite',
		src: './assets/components/backgrounds/splash.jpg?v=20260611',
		preload: true,
	},
	logoFrame: {
		type: 'sprite',
		src: './assets/components/frames/logo_frame.png?v=20260611',
		preload: true,
	},
	forestGangLogo: {
		type: 'sprite',
		src: './assets/components/ui/forest_gang_logo.png?v=20260611',
		preload: true,
	},
	scatterPanelImage: {
		type: 'sprite',
		src: './assets/components/ui/scatter-panel-image.png?v=20260611',
		preload: true,
	},
	aTile: { type: 'sprite', src: './assets/components/symbols/card_a.png?v=20260616', preload: true },
	aWinTile: { type: 'sprite', src: './assets/components/symbols/card_a_win.png?v=20260616', preload: true },
	kTile: { type: 'sprite', src: './assets/components/symbols/card_k.png?v=20260616', preload: true },
	kWinTile: { type: 'sprite', src: './assets/components/symbols/card_k_win.png?v=20260616', preload: true },
	qTile: { type: 'sprite', src: './assets/components/symbols/card_q.png?v=20260616', preload: true },
	qWinTile: { type: 'sprite', src: './assets/components/symbols/card_q_win.png?v=20260616', preload: true },
	jTile: { type: 'sprite', src: './assets/components/symbols/card_j.png?v=20260616', preload: true },
	jWinTile: { type: 'sprite', src: './assets/components/symbols/card_j_win.png?v=20260616', preload: true },
	squirrelJAnim: {
		type: 'spine',
		src: {
			atlas: './assets/new_assets/slots_replacement/standard/squirrel_J_anim.atlas',
			skeleton: './assets/new_assets/slots_replacement/standard/squirrel_J_anim.json',
			scale: 1,
		},
		preload: true,
	},
	rabbitExpAnimTest: {
		type: 'spine',
		src: {
			atlas: './assets/new_assets/slots_replacement/standard_expanded/rabbit_10_anim/rabbit_10_anim.atlas',
			skeleton: './assets/new_assets/slots_replacement/standard_expanded/rabbit_10_anim/rabbit_10_anim.json',
			scale: 1,
		},
		preload: true,
	},
	rabbitExpAnimTestSheet: {
		type: 'spriteSheet',
		src: './assets/new_assets/slots_replacement/standard_expanded/rabbit_10_anim/rabbit_10_anim_sheet.json',
		preload: true,
	},
	tTile: { type: 'sprite', src: './assets/components/symbols/card_t.png?v=20260616', preload: true },
	tWinTile: { type: 'sprite', src: './assets/components/symbols/card_t_win.png?v=20260616', preload: true },
	wildTile: { type: 'sprite', src: './assets/components/symbols/wild.png?v=20260616', preload: true },
	wildWinTile: { type: 'sprite', src: './assets/components/symbols/wild_win.png?v=20260616', preload: true },
	scatterCustom: { type: 'sprite', src: './assets/components/symbols/scatter.png?v=20260616', preload: true },
	scatterWin: { type: 'sprite', src: './assets/components/symbols/scatter_win.png?v=20260616', preload: true },
	foxBonusTile: { type: 'sprite', src: './assets/components/symbols/fox_bonus.png?v=20260616', preload: true },
	foxWinTile: { type: 'sprite', src: './assets/components/symbols/fox_win.png?v=20260616', preload: true },
	wolfBonusTile: { type: 'sprite', src: './assets/components/symbols/wolf_bonus.png?v=20260616', preload: true },
	wolfWinTile: { type: 'sprite', src: './assets/components/symbols/wolf_win.png?v=20260616', preload: true },
	bearBonusTile: { type: 'sprite', src: './assets/components/symbols/bear_bonus.png?v=20260616', preload: true },
	bearWinTile: { type: 'sprite', src: './assets/components/symbols/bear_win.png?v=20260616', preload: true },
	rabbitBonusTile: { type: 'sprite', src: './assets/components/symbols/rabbit_bonus.png?v=20260616', preload: true },
	rabbitWinTile: { type: 'sprite', src: './assets/components/symbols/rabbit_win.png?v=20260616', preload: true },
	squirrelBonusTile: { type: 'sprite', src: './assets/components/symbols/squirrel_bonus.png?v=20260616', preload: true },
	squirrelWinTile: { type: 'sprite', src: './assets/components/symbols/squirrel_win.png?v=20260616', preload: true },
	aExpTile: { type: 'sprite', src: './assets/components/symbols/card_a_bonus.png?v=20260616', preload: true },
	aWinExpTile: { type: 'sprite', src: './assets/components/symbols/card_a_expand_win.png?v=20260616', preload: true },
	kExpTile: { type: 'sprite', src: './assets/components/symbols/card_k_bonus.png?v=20260616', preload: true },
	kWinExpTile: { type: 'sprite', src: './assets/components/symbols/card_k_expand_win.png?v=20260616', preload: true },
	qExpTile: { type: 'sprite', src: './assets/components/symbols/card_q_bonus.png?v=20260616', preload: true },
	qWinExpTile: { type: 'sprite', src: './assets/components/symbols/card_q_expand_win.png?v=20260616', preload: true },
	jExpTile: { type: 'sprite', src: './assets/components/symbols/card_j_bonus.png?v=20260616', preload: true },
	jWinExpTile: { type: 'sprite', src: './assets/components/symbols/card_j_expand_win.png?v=20260616', preload: true },
	tExpTile: { type: 'sprite', src: './assets/components/symbols/card_t_bonus.png?v=20260616', preload: true },
	tWinExpTile: { type: 'sprite', src: './assets/components/symbols/card_t_expand_win.png?v=20260616', preload: true },
	foxExpTile: { type: 'sprite', src: './assets/components/symbols/fox_expand.png?v=20260616', preload: true },
	foxExpWinTile: { type: 'sprite', src: './assets/components/symbols/fox_expand_win.png?v=20260616', preload: true },
	wolfExpTile: { type: 'sprite', src: './assets/components/symbols/wolf_expand.png?v=20260616', preload: true },
	wolfExpWinTile: { type: 'sprite', src: './assets/components/symbols/wolf_expand_win.png?v=20260616', preload: true },
	bearExpTile: { type: 'sprite', src: './assets/components/symbols/bear_expand.png?v=20260616', preload: true },
	bearExpWinTile: { type: 'sprite', src: './assets/components/symbols/bear_expand_win.png?v=20260616', preload: true },
	rabbitExpTile: { type: 'sprite', src: './assets/components/symbols/rabbit_expand.png?v=20260616', preload: true },
	rabbitExpWinTile: { type: 'sprite', src: './assets/components/symbols/rabbit_expand_win.png?v=20260616', preload: true },
	squirrelExpTile: { type: 'sprite', src: './assets/components/symbols/squirrel_expand.png?v=20260616', preload: true },
	squirrelExpWinTile: { type: 'sprite', src: './assets/components/symbols/squirrel_expand_win.png?v=20260616', preload: true },
	// Win boards (_w active state shown when winnings display)
	sweetWinBoard:     { type: 'sprite', src: './assets/components/win_boards/sweet_win.png?v=20260616', preload: false },
	wildWinBoard:      { type: 'sprite', src: './assets/components/win_boards/big_win.png?v=20260616', preload: false },
	epicWinBoard:      { type: 'sprite', src: './assets/components/win_boards/epic_win.png?v=20260616', preload: false },
	mythicWinBoard:    { type: 'sprite', src: './assets/components/win_boards/mega_win.png?v=20260616', preload: false },
	legendaryWinBoard: { type: 'sprite', src: './assets/components/win_boards/max_win.png?v=20260616', preload: false },
	pressToContinueText: {
		type: 'sprites',
		src: './assets/sprites/pressToContinueText/MM_pressanywhere.json?v=20260611',
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
		src: './assets/sprites/reelsFrame/reels_frame.json?v=20260611',
	},
	payFrame: {
		type: 'sprite',
		src: './assets/sprites/payFrame/payFrame.png?v=20260611',
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
		src: './assets/fonts/goldFont/mm_gold.xml?v=20260611',
	},
	goldBlur: {
		type: 'font',
		src: './assets/fonts/goldBlur/miningfont_gold_blur.xml?v=20260611',
	},
	silverFont: {
		type: 'font',
		src: './assets/fonts/silverFont/mm_silver.xml?v=20260611',
	},
	purpleFont: {
		type: 'font',
		src: './assets/fonts/purpleFont/mm_purple.xml?v=20260611',
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
	fsBoardBg: {
		type: 'sprite',
		src: './assets/sprites/fsBoardBg/fsBoardBg.png',
	},
	fsMedallion: {
		type: 'sprite',
		src: './assets/sprites/fsMedallion/fsMedallion.png',
	},
	fsNumFrame: {
		type: 'sprite',
		src: './assets/sprites/fsNumFrame/fsNumFrame.png',
	},
	fsCongratsText: {
		type: 'sprites',
		src: './assets/sprites/fsCongratsText/fsCongratsText.json',
	},
	progressBar: {
		type: 'sprites',
		src: './assets/sprites/progressBar/progressBar.json?v=20260611',
		preload: true,
	},
	freeSpins: {
		type: 'sprites',
		src: './assets/sprites/freeSpins/freeSpins.json?v=20260611',
	},
	winSmall: {
		type: 'sprites',
		src: './assets/sprites/winSmall/MM_Localisation_winsmall.json?v=20260611',
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
		src: './assets/sprites/symbolsStatic/symbolsStatic.json?v=20260611',
	},
	coins: {
		type: 'spriteSheet',
		src: './assets/sprites/coin/SD2_Coin.json?v=20260611',
	},
	sound: {
		type: 'audio',
		src: './assets/audio/sounds.json?v=20260611',
		preload: true,
	},
} as const;
