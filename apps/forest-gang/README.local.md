# Forest Gang local test

## Prereq
- Node >= 22.13
- pnpm available

## Install
From repo root:

```bash
pnpm install
```

## Run app
From repo root:

```bash
pnpm run dev --filter=forest-gang
```

Open:
- http://localhost:3001

## Run Storybook
From repo root:

```bash
pnpm --dir apps/forest-gang run storybook
```

Open:
- http://localhost:6001

Use these stories:
- `MODE_BASE/book/random`
- `MODE_BONUS/book/random`
- `MODE_BONUS/bookEvent/bonusSymbolSelected`
- `MODE_BONUS/bookEvent/expandedSymbolReveal`
- `MODE_BONUS/bookEvent/applyTempMultiplier`
- `MODE_BONUS/bookEvent/updateReelMultipliers`

## Build export
From repo root:

```bash
pnpm run build-game -- forest-gang
```

Expected output:
- `apps/forest-gang/build/index.html`

## If pnpm fails on this machine
Current machine had Node 22.9.0, too old for repo pnpm.
Upgrade Node first, then rerun commands above.

## Forest Gang media wired
- Ambient loop from `static/forest-gang/audio-idea.wav` plays after first user interaction.
- Real scatter art used for scatter static symbol + rules/paytable art.
- Visual concept art shown in loading/branding overlays.

## What to verify manually
- First click/tap on loading screen unlocks the ambient loop.
- Base game uses lower ambient volume.
- Bonus entry switches to louder ambient volume.
- Scatter symbol static frame shows custom chip art.
- Branding card and loading art use Forest Gang concept images.

## Known limit
- Premium/low symbol reels still use sample skeleton atlas placeholders because no per-symbol source sprites/spines were provided in `Forest Gang_Project`.
- Once final Fox/Wolf/Bear/Rabbit/Squirrel/A/K/Q/J/10 symbol art exists, update `src/game/constants.ts` + `src/game/assets.ts` to map each symbol to real art.

## Extracted temporary art
Generated from provided refs into:
- `apps/forest-gang/static/forest-gang/extracted/`

Main extracted files:
- `forest_gang_logo.png`
- `fox_tile.png`, `wolf_tile.png`, `bear_tile.png`, `rabbit_tile.png`, `squirrel_tile.png`
- `a_tile.png`, `k_tile.png`, `q_tile.png`, `j_tile.png`, `j_alt_tile.png`
- `scatter_inner.png`, `scatter_full.png`
- `paylines_reference.png`

Current usage:
- logo snippet uses extracted logo
- premium/low symbol placeholders now use extracted tile crops
- scatter uses custom scatter art
