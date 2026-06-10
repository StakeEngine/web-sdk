import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

import { generateRoundForMode } from '../../mock-rgs/math/forest-gang.mjs';

const rootDir = path.resolve(new URL('../..', import.meta.url).pathname);
const libraryDir = path.join(rootDir, 'apps/forest-gang/library');
const booksDir = path.join(libraryDir, 'books');
const publishDir = path.join(libraryDir, 'publish_files');
const configsDir = path.join(libraryDir, 'configs');
const forcesDir = path.join(libraryDir, 'forces');
const lookupTablesDir = path.join(libraryDir, 'lookup_tables');

const MODES = [
  { key: 'BASE', name: 'base', cost: 1, gameType: 'basegame', feature: true, buyBonus: false, seeds: 1000000, maxWin: 20000 },
  { key: 'BONUS', name: 'bonus', cost: 100, gameType: 'freegame', feature: false, buyBonus: true, seeds: 500000, maxWin: 30000 },
  { key: 'SUPER', name: 'super', cost: 400, gameType: 'superspin', feature: false, buyBonus: true, seeds: 500000, maxWin: 120000 },
];

const sha256 = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');
const ensureDir = (dir) => fs.mkdirSync(dir, { recursive: true });
const json = (value) => `${JSON.stringify(value, null, 4)}\n`;
const compressZst = (inputPath, outputPath) => {
  execFileSync('python3', [
    '-c',
    [
      'import pathlib, sys',
      'import zstandard as zstd',
      'inp = pathlib.Path(sys.argv[1]).read_bytes()',
      'pathlib.Path(sys.argv[2]).write_bytes(zstd.ZstdCompressor(level=3).compress(inp))',
    ].join('; '),
    inputPath,
    outputPath,
  ]);
};

const stdOfNormalizedReturn = (payoutAmounts, cost) => {
  const vals = payoutAmounts.map((amount) => amount / 100 / cost);
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  const variance = vals.reduce((sum, v) => sum + (v - mean) ** 2, 0) / vals.length;
  return Number(Math.sqrt(variance).toFixed(4));
};

const firstSetTotalWin = (events) => events.find((event) => event.type === 'setTotalWin')?.amount ?? 0;
const finalWinAmount = (events) => [...events].reverse().find((event) => event.type === 'finalWin')?.amount ?? 0;

const representativeBooksForMode = ({ key, gameType, seeds }) => {
  const counts = new Map();
  const booksByPayout = new Map();
  const payoutAmounts = [];

  for (let seed = 1; seed <= seeds; seed++) {
    const round = generateRoundForMode({ mode: key, seed });
    const payoutAmount = Math.round(round.payoutMultiplier * 100);
    payoutAmounts.push(payoutAmount);
    counts.set(payoutAmount, (counts.get(payoutAmount) ?? 0) + 1);

    if (!booksByPayout.has(payoutAmount)) {
      const baseGameWinAmount = key === 'BASE' ? firstSetTotalWin(round.events) : 0;
      const totalWinAmount = finalWinAmount(round.events);
      booksByPayout.set(payoutAmount, {
        payoutAmount,
        events: round.events,
        criteria: gameType,
        baseGameWins: Number((baseGameWinAmount / 100).toFixed(2)),
        freeGameWins: Number(((totalWinAmount - baseGameWinAmount) / 100).toFixed(2)),
      });
    }
  }

  const books = [...booksByPayout.values()]
    .sort((a, b) => a.payoutAmount - b.payoutAmount)
    .map((book, id) => ({
      id,
      payoutMultiplier: book.payoutAmount,
      events: book.events,
      criteria: book.criteria,
      baseGameWins: book.baseGameWins,
      freeGameWins: book.freeGameWins,
    }));

  const payoutToId = new Map(books.map((book) => [book.payoutMultiplier, book.id]));
  const lookupRows = [...counts.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([payoutAmount, weight]) => ({
      id: payoutToId.get(payoutAmount),
      weight,
      payoutAmount,
    }));

  const totalWeight = lookupRows.reduce((sum, row) => sum + row.weight, 0);
  const weightedPayout = lookupRows.reduce((sum, row) => sum + row.weight * row.payoutAmount, 0);
  const rtp = weightedPayout / totalWeight / 100 / MODES.find((mode) => mode.key === key).cost;
  const std = stdOfNormalizedReturn(payoutAmounts, MODES.find((mode) => mode.key === key).cost);

  return { books, lookupRows, totalWeight, rtp, std };
};

const writeFileWithSha = (filePath, content) => {
  const buffer = Buffer.isBuffer(content) ? content : Buffer.from(content);
  fs.writeFileSync(filePath, buffer);
  return sha256(buffer);
};

const writeModeArtifacts = (mode, stats) => {
  const upper = mode.key;
  const lower = mode.name;
  const booksJsonl = `${stats.books.map((book) => JSON.stringify(book)).join('\n')}\n`;
  const lookupCsv = `${stats.lookupRows.map((row) => `${row.id},${row.weight},${row.payoutAmount}`).join('\n')}\n`;

  const booksFile = path.join(booksDir, `books_${upper}.jsonl`);
  const lookupFileUpper = path.join(publishDir, `lookUpTable_${upper}_0.csv`);
  const lookupFileLower = path.join(publishDir, `lookUpTable_${lower}_0.csv`);
  const lookupSegmentedFile = path.join(lookupTablesDir, `lookUpTable_${lower}.csv`);
  const lookupSegmentedFile2 = path.join(lookupTablesDir, `lookUpTableSegmented_${lower}.csv`);
  const publishBooksRaw = path.join(publishDir, `books_${lower}.jsonl`);
  const publishBooksZst = path.join(publishDir, `books_${lower}.jsonl.zst`);

  const booksSha = writeFileWithSha(booksFile, booksJsonl);
  writeFileWithSha(lookupFileUpper, lookupCsv);
  const lookupSha = writeFileWithSha(lookupFileLower, lookupCsv);
  writeFileWithSha(lookupSegmentedFile, lookupCsv);
  writeFileWithSha(lookupSegmentedFile2, lookupCsv);
  fs.writeFileSync(publishBooksRaw, booksJsonl);
  compressZst(publishBooksRaw, publishBooksZst);
  fs.unlinkSync(publishBooksRaw);
  const zstSha = sha256(fs.readFileSync(publishBooksZst));

  return {
    booksSha,
    lookupSha,
    zstSha,
    bookLength: stats.books.length,
    rtp: Number(stats.rtp.toFixed(6)),
    std: stats.std,
    maxWin: mode.maxWin,
  };
};

const main = () => {
  [booksDir, publishDir, configsDir, forcesDir, lookupTablesDir].forEach(ensureDir);

  const results = MODES.map((mode) => {
    const stats = representativeBooksForMode(mode);
    const files = writeModeArtifacts(mode, stats);
    return { mode, stats, files };
  });

  const feConfig = {
    providerName: 'sample_provider',
    gameName: 'forest_gang',
    gameID: '0_0_forest_gang',
    rtp: 0.961,
    numReels: 5,
    numRows: [4, 4, 4, 4, 4],
    betModes: {
      base: { cost: 1.0, feature: true, buyBonus: false, rtp: results[0].files.rtp, max_win: 20000 },
      bonus: { cost: 100.0, feature: false, buyBonus: true, rtp: results[1].files.rtp, max_win: 30000 },
      super: { cost: 400.0, feature: false, buyBonus: true, rtp: results[2].files.rtp, max_win: 120000 },
    },
    symbols: ['FOX', 'WOLF', 'BEAR', 'RABBIT', 'SQUIRREL', 'A', 'K', 'Q', 'J', 'T', 'WILD', 'SCATTER'],
    paddingReels: {},
  };
  const feConfigName = 'config_fe_forest_gang.json';
  const feConfigSha = writeFileWithSha(path.join(configsDir, feConfigName), json(feConfig));

  const forceJson = { base: {}, bonus: {}, super: {} };
  const forceSha = writeFileWithSha(path.join(forcesDir, 'force.json'), json(forceJson));
  const forceRecordShas = Object.fromEntries(
    MODES.map((mode) => [
      mode.name,
      writeFileWithSha(path.join(forcesDir, `force_record_${mode.name}.json`), '[]\n'),
    ]),
  );

  writeFileWithSha(path.join(configsDir, 'math_config.json'), json({ game_id: '0_0_forest_gang', bet_modes: [], fences: [], dresses: [], bias: [] }));

  for (const mode of MODES) {
    const eventConfig = {
      reveal: { type: 'reveal', gameType: mode.gameType, board: 'RawSymbol[][]', paddingPositions: 'number[]', anticipation: 'number[]' },
      winInfo: { type: 'winInfo' },
      setTotalWin: { type: 'setTotalWin' },
      freeSpinTrigger: { type: 'freeSpinTrigger' },
      updateFreeSpin: { type: 'updateFreeSpin' },
      finalWin: { type: 'finalWin' },
      setWin: { type: 'setWin' },
      freeSpinEnd: { type: 'freeSpinEnd' },
      bonusSymbolSelected: { type: 'bonusSymbolSelected' },
      expandedSymbolReveal: { type: 'expandedSymbolReveal' },
      applyTempMultiplier: { type: 'applyTempMultiplier' },
      updateReelMultipliers: { type: 'updateReelMultipliers' },
    };
    writeFileWithSha(path.join(configsDir, `event_config_${mode.name}.json`), json(eventConfig));
  }

  const config = {
    workingName: 'forest_gang',
    frontendConfig: {
      file: feConfigName,
      sha256: feConfigSha,
    },
    gameID: '0_0_forest_gang',
    rtp: 96.1,
    betDenomination: 1000,
    minDenomination: 10,
    providerNumber: 0,
    standardForceFile: {
      file: 'force.json',
      sha256: forceSha,
    },
    bookShelfConfig: results.map(({ mode, files }) => ({
      name: mode.name,
      tables: [
        {
          file: `lookUpTable_${mode.name}_0.csv`,
          sha256: files.lookupSha,
        },
      ],
      cost: mode.cost,
      rtp: files.rtp,
      std: files.std,
      bookLength: files.bookLength,
      feature: mode.feature,
      autoEndRoundDisabled: false,
      buyBonus: mode.buyBonus,
      maxWin: files.maxWin,
      booksFile: {
        file: `books_${mode.name}.jsonl.zst`,
        sha256: files.zstSha,
      },
      forceFile: {
        file: `force_record_${mode.name}.json`,
        sha256: forceRecordShas[mode.name],
      },
    })),
  };
  writeFileWithSha(path.join(configsDir, 'config.json'), json(config));

  const publishIndex = {
    modes: results.map(({ mode }) => ({
      name: mode.name,
      cost: mode.cost,
      events: `books_${mode.name}.jsonl.zst`,
      weights: `lookUpTable_${mode.name}_0.csv`,
    })),
  };
  writeFileWithSha(path.join(publishDir, 'index.json'), json(publishIndex));

  console.log(
    JSON.stringify(
      results.map(({ mode, stats, files }) => ({
        mode: mode.key,
        books: files.bookLength,
        totalWeight: stats.totalWeight,
        rtp: files.rtp,
        std: files.std,
        maxWin: files.maxWin,
      })),
      null,
      2,
    ),
  );
};

main();
