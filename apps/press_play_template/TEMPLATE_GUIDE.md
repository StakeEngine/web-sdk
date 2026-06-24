# Press Play Template — Developer Guide

A game-agnostic slot template built on the Press Play web-sdk monorepo.
Fork this app to start a new game; follow the checklist below to wire in your content.

---

## Quick Start

```bash
pnpm install
pnpm --filter press_play_template dev   # runs on port 3005
```

---

## Step-by-step Checklist

### 1. Rename the package

- `package.json` → `name`
- `vite.config.js` → server port (default 3005)
- `src/utils/diagnostics.ts` → log prefix `[press_play_template]`

### 2. Define your symbols

Edit `src/game/types.ts`:
```ts
export type SymbolName =
  | 'H1' | 'H2' | 'H3' | 'H4' | 'H5'   // high-pay — rename to match art (e.g. 'FOX')
  | 'L1' | 'L2' | 'L3' | 'L4' | 'L5'   // low-pay  — rename to match art (e.g. 'ACE')
  | 'WILD' | 'SCATTER';
```

### 3. Configure the board

Edit `src/game/constants.ts`:
- `BOARD_DIMENSIONS` — reels × rows (default 5×3)
- `SYMBOL_SIZE` — base pixel size (default 150)
- `SYMBOL_INFO_MAP` — add/remove symbols, assign spine keys if using Spine

Edit `src/game/config.ts`:
- `PAYLINES` — payline definitions
- `SYMBOL_PAYOUTS` — per-symbol × per-count payouts

### 4. Map asset keys

Edit `src/game/assets.ts`:
- Add all your PNG sprites under `sym_*` keys
- Add background, board frame, Spine, font, audio entries

Edit `src/game/utils.ts`:
- `spriteKeyByName` — normal state sprites
- `bonusSpriteKeyByName` — bonus-mode sprites
- `winSpriteKeyByName` — win-state sprites
- `expandedSpriteKeyByName` — expanded-overlay sprites

### 5. Wire up the expanded symbol overlay

Edit `src/components/ExpandedSymbolOverlay.svelte`:
- `EXPANDED_WIN_ASSET` map — one entry per expandable symbol
- `LOW_SYMBOLS` set — symbols that use sprite-based (not Spine) expansion

Edit `src/components/Board.svelte`:
- `LOW_SYMBOLS_SET` — must match `LOW_SYMBOLS` above

### 6. Implement book event handlers

Edit `src/game/bookEventHandlerMap.ts`:
- Wire `reveal`, `winInfo`, `setWin`, `freeSpinTrigger`, etc.
  to the game-state mutations your server returns.

### 7. Localise strings

Edit `src/i18n/messagesMap/en.ts` (and `zh.ts`):
- Replace all placeholder strings with your game copy.
- Add any extra keys your `Game.svelte` `betModeMeta`/`gameRuleMeta` needs.

### 8. Customise bet modes (optional)

The template ships with `BASE` (1×) and `BONUS` (100×).
To add e.g. a FEATURE mode:
- Add `'FEATURE'` to `BetModeKey` in state-shared (or extend the config)
- Add the `FEATURE` block to `stateMeta.betModeMeta` in `Game.svelte`
- Add cost multiplier logic in `src/state/templateStake.svelte.ts`

### 9. Replace placeholder art

See `static/assets/README.md` for the full directory layout.
All `CHANGE ME` comments in source files point to spots where asset keys are used.

### 10. Sound

Edit `src/game/sound.ts` to declare your `MusicName` and `SoundEffectName` unions.
Edit `src/components/Sound.svelte` to map events → Howler play calls.

---

## Architecture Overview

```
src/
  game/
    actor.ts          XState machine (createPrimaryMachines)
    assets.ts         PIXI asset manifest
    bookEventHandlerMap.ts  server event → state mutations
    config.ts         paylines, symbol payouts
    constants.ts      BOARD_DIMENSIONS, SYMBOL_SIZE, SYMBOL_INFO_MAP
    context.ts        Svelte context provider (getContext / setContext)
    eventEmitter.ts   typed in-game event bus
    sound.ts          MusicName / SoundEffectName unions
    stateGame.svelte.ts  reactive game state ($state)
    stateLayout.ts    layout & loading flags
    types.ts          SymbolName, Position, RawSymbol, etc.
    typesBookEvent.ts server-driven book events
    typesEmitterEvent.ts  internal emitter event union
    utils.ts          sprite key maps, board helpers
    winLevelMap.ts    win tier thresholds & presentation config
  state/
    templateStake.svelte.ts  balance, replay, currency formatting
  i18n/
    messagesMap/en.ts   English strings
    messagesMap/zh.ts   Chinese strings
    i18nDerived.ts      reactive i18n helpers
  utils/
    diagnostics.ts    logDiagnostic helper
  components/
    Game.svelte       root — mounts pixi App, HUD, overlays
    Board.svelte      reel grid
    ExpandedSymbolOverlay.svelte  expanding symbol animation
    HudHtml.svelte    HTML bottom bar (bet, spin, balance)
    FreeSpinIntro/Counter/Outro  bonus flow UI
    Win.svelte        win count-up display
    Sound.svelte      Howler audio controller
    StakeSync.svelte  syncs templateStakeState ↔ stateBet
    replay/ReplayHud.svelte  replay mode overlay
```

---

## Key Conventions

| Pattern | Usage |
|---------|-------|
| `$state` / `$derived` / `$effect` | Svelte 5 reactivity — no stores |
| `context.eventEmitter.subscribeOnMount(...)` | subscribe to game events inside components |
| `context.eventEmitter.broadcast(...)` | fire a game event |
| `broadcastAsync(...)` | fire and await all async subscribers |
| `CHANGE ME` comment | things you must update when forking |

---

## Notes

- This template targets a 5×3 board with 20 paylines. Adjust `BOARD_DIMENSIONS` and `PAYLINES` for other configurations.
- The `ExpandedSymbolOverlay` supports both sprite-tiled (LOW_SYMBOLS) and single-sprite (high) expansion modes.
- The `FreeSpinCounter` shows a simple "X OF Y" counter — no Deal It / All In labels.
- `templateStake.svelte.ts` only handles `BASE` (1×) and `BONUS` (100×) replay cost multipliers.
