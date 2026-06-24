# Static Assets

Place game assets here. The directory structure expected by `assets.ts`:

```
static/assets/
  components/
    backgrounds/
      visual_v1.jpg          — bonus/feature background
      visual_v2.png/.jpg     — main background / hero art
      splash.jpg             — splash intro screen (16:9)
    frames/
      board_frame.png        — main board frame overlay
      bonus_buy_button_frame.png
      bonus_menu_frame.webp
      hud_frame.png
      lower_hud_button_frame.png
      play_button-frame.png
      scatter_frame.png
      top_menu-button_frame.png
      top_sound_button_frame.png
    navbar/
      bar.png                — 9-sliced wooden bar
      auto.png
      buy_bonus.png
      coins.png
      menu.png
      minus.png
      plus.png
      sound.png
      spin.png
      turbo_1.png / turbo_2.png / turbo_3.png
    reference/
      buy_bonus_reference.png
      controls_reference.png
      paylines_reference.png
      ui-reference-1.png
    symbols/
      sym_h1.png             — H1 normal
      sym_h1_bonus.png       — H1 bonus mode
      sym_h1_win.png         — H1 win state
      sym_h1_expand.png      — H1 expanded overlay
      (repeat for h2-h5, l1-l5)
      sym_wild.png / sym_wild_bonus.png / sym_wild_win.png
      sym_scatter.png / sym_scatter_bonus.png / sym_scatter_win.png
      scatter.png            — standalone scatter art for HUD
    ui/
      logo.png               — game logo for splash screen
      scatter-panel-image.png
  hud/
    icon-autoplay.svg
    icon-coins.svg
    icon-lightning.svg
    icon-menu.svg
    icon-minus.svg
    icon-play.svg
    icon-plus.svg
    icon-volume.svg
  fonts/
    gold.xml + gold.png      — BitmapFont for win amounts
  spines/
    fsIntro/                 — Free spin intro Spine animation
      fsIntro.atlas
      fsIntro.json
      fsIntro.png
    winBoard/                — Big/Epic/Mega/Max win board Spine
      winBoard.atlas
      winBoard.json
      winBoard.png
  audio/
    music_base.mp3           — base game background music
    music_bonus.mp3          — bonus game background music
    sfx_spin.mp3
    sfx_win_small.mp3
    sfx_win_big.mp3
    sfx_scatter.mp3
    sfx_transition.mp3
    sfx_press_general.mp3
    sfx_press_bet.mp3
    sfx_reel_stop.mp3
    sfx_anticipation.mp3
    sfx_expand.mp3
    sfx_freespin_trigger.mp3
    sfx_freespin_outro.mp3
```

All asset keys in `assets.ts` must match the filenames here.
The `CHANGE ME` comments in source files indicate where asset keys are referenced.
