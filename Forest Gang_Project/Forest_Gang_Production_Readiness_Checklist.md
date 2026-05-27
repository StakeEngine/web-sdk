# Forest Gang Production Readiness Checklist

Status date: 2026-05-27

## Release verdict

- [ ] Production ready
- [x] Prototype / pre-production

## 1) PRD / product alignment

- [x] PRD exists: `Forest_Gang_PRD_Filled.docx`
- [x] Paytable draft exists: `Forest_Gang_Paytable_Draft.docx`
- [ ] Final PAR sheet exists
- [ ] Final reel strips locked
- [ ] Final bonus buy pricing locked
- [ ] Final multiplier caps locked
- [ ] Final max-win proof locked at `20,000x`
- [ ] Win tier thresholds signed off vs actual implementation

## 2) Math sign-off

- [ ] Theoretical RTP sheet documented by mode
- [ ] Simulated RTP report at 1M+ spins
- [ ] Sign-off RTP report at 20M+ spins
- [ ] Hit-rate report
- [ ] Trigger-rate report
- [ ] Bonus-mode RTP split documented
- [ ] Buy-bonus RTP documented
- [ ] Standard error / confidence interval documented
- [ ] Seeded reproducible simulation command checked in

### Current target from PRD

- RTP: `96.10%`
- Volatility: `Very High`
- Hit frequency: `~24%`
- Free-spin trigger frequency: `~1 in 180`
- Max win: `20,000x`
- Base contribution: `~56%`
- Free-spin contribution: `~40%`

### Current local proto state

- [x] Mock-RGS proto math exists
- [x] Seeded simulation script added: `scripts/forest-gang-sim.mjs`
- [x] 100k-seed calibration run completed
- [ ] Generated math-sdk books exist
- [ ] Generated lookup tables exist
- [ ] Final simulation outputs archived in repo

### Current 100k-seed proto metrics

- BASE RTP: `96.0080%`
- BASE hit rate: `24.0380%`
- BASE trigger rate: `0.5420%` (`~1 in 184.5`)
- BASE pre-bonus contribution: `55.93%`
- BONUS buy RTP: `95.3789%`
- SUPER buy RTP: `95.3763%`

Interpretation:

- Base / buy RTP now sit close to PRD target band.
- Trigger rate now sits close to PRD target band.
- Base contribution now sits very near PRD `~56%`.
- Bonus contribution now sits very near PRD `~40%`.
- Volatility still not formally measured.

## 3) Math artifact pipeline

- [x] `books_BASE` generated
- [x] `books_BONUS` generated
- [x] `books_SUPER` generated
- [x] `lookUpTable_BASE_0.csv` generated
- [x] `lookUpTable_BONUS_0.csv` generated
- [x] `lookUpTable_SUPER_0.csv` generated
- [x] `index.json` generated for published modes
- [x] Mock RGS reads generated books instead of proto fallback

## 4) Frontend / event contract

- [x] Base reveal event works
- [x] `freeSpinTrigger` event wired
- [x] `bonusSymbolSelected` event wired
- [x] `expandedSymbolReveal` event wired
- [x] `applyTempMultiplier` event wired
- [x] `updateReelMultipliers` event wired
- [x] `freeSpinEnd` event wired
- [ ] Replay-mode full regression tested
- [ ] Event payload schema validated against final math books

## 5) Build / toolchain

- [x] App builds locally with Vite
- [x] Static export builds locally
- [x] App tsconfig updated to extend SvelteKit generated tsconfig
- [x] Public env access changed to safe dynamic defaults
- [ ] ESLint flat-config migration finished
- [ ] Node version pinned and verified on local/dev/CI
- [ ] Zero build warnings policy achieved

## 6) QA / automated coverage

- [ ] Unit tests for game state helpers
- [ ] Integration tests for event sequencing
- [ ] Replay tests for BASE / BONUS / SUPER
- [ ] Smoke test for mock-RGS wallet/play/end-round flow
- [ ] Bonus-entry regression test
- [ ] Max-win clamp regression test
- [ ] Manual test checklist completed on desktop
- [ ] Manual test checklist completed on mobile

## 7) Art / UX / audio

- [x] Temporary visual refs wired
- [x] Temporary scatter art wired
- [x] Ambient loop wired
- [ ] Final symbol art delivered
- [ ] Final premium/low symbol animation assets delivered
- [ ] Final free-spin intro/outro approved
- [ ] Final win-celebration timings approved
- [ ] Win-tier naming / thresholds match PRD

## 8) Compliance / publication

- [ ] Jurisdiction checklist run
- [ ] Social wording audit run
- [ ] Auto-play / turbo / slam-stop settings reviewed
- [ ] Replay support signed off
- [ ] RTP disclosure requirements reviewed
- [ ] Feature-buy requirements reviewed

## 9) Immediate next actions

1. Generate 100k / 1M seeded sim report with `node scripts/forest-gang-sim.mjs`.
2. Tune proto math until metrics sit near PRD target band.
3. Replace proto math with generated math-sdk books + lookup tables.
4. Add replay / event-sequence automated tests.
5. Finish ESLint v9 flat-config migration.
