# Forest Gang Math Status Summary — 2026-05-27

## Goal

Move local proto math as close as practical to PRD until final math-sdk books are generated.

## PRD targets

- RTP: `96.10%`
- Hit frequency: `~24%`
- Free-spin trigger: `~1 in 180`
- Base contribution: `~56%`
- Free-spin contribution: `~40%`
- Max win: `20,000x`

## Current upload-package metrics

Generated via:

```bash
node scripts/generate-forest-gang-math-artifacts.mjs
node scripts/validate-forest-gang-artifacts.mjs
```

Artifact-backed RTP:

- BASE: `96.0293%`
- BONUS: `96.1118%`
- SUPER: `96.1118%`

Artifacts created:

- `apps/forest-gang/library/books/books_BASE.jsonl`
- `apps/forest-gang/library/books/books_BONUS.jsonl`
- `apps/forest-gang/library/books/books_SUPER.jsonl`
- `apps/forest-gang/library/publish_files/books_base.jsonl.zst`
- `apps/forest-gang/library/publish_files/books_bonus.jsonl.zst`
- `apps/forest-gang/library/publish_files/books_super.jsonl.zst`
- `apps/forest-gang/library/publish_files/lookUpTable_*_0.csv`
- `apps/forest-gang/library/publish_files/index.json`
- `apps/forest-gang/library/configs/config.json`

## Current 100k-seed proto metrics

Command:

```bash
node scripts/forest-gang-sim.mjs 100000
```

Result:

- BASE RTP: `96.0080%`
- BASE hit rate: `24.0380%`
- BASE trigger rate: `0.5420%` = `~1 in 184.5`
- BASE pre-bonus contribution: `55.93%`
- BONUS buy RTP: `95.3789%`
- SUPER buy RTP: `95.3763%`
- Observed max win in sample:
  - BASE `4850x`
  - BONUS `2232.5x`
  - SUPER `8930x`

## Read

Proto math now sits close to PRD on the major topline metrics.

Regression command:

```bash
node scripts/test-forest-gang-regression.mjs
```

Current pass:

- deterministic replay/path checks: pass
- event ordering/shape checks: pass
- base metric band checks: pass
- buy RTP sanity band checks: pass

Still missing for production sign-off:

- final PAR sheet
- 1M and 20M spin evidence
- volatility measurement
- published books / lookup tables
- compliance / QA / replay regression sign-off

## Files changed

- `mock-rgs/math/forest-gang.mjs`
- `mock-rgs/server.mjs`
- `scripts/forest-gang-sim.mjs`
- `scripts/test-forest-gang-regression.mjs`
- `packages/envs/src/envs.svelte.ts`
- `apps/forest-gang/tsconfig.json`
- `Forest Gang_Project/Forest_Gang_Production_Readiness_Checklist.md`

## Recommended next gate

Generate real math-sdk books and compare:

1. theoretical RTP
2. empirical RTP at 1M+
3. event payload parity vs proto-math playback
