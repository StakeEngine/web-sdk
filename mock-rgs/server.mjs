import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getRoundForMode as getForestRoundForMode, getReplayRound as getForestReplayRound } from './math/forest-gang.mjs';
import { getRoundForMode as getMagneticRoundForMode, getReplayRound as getMagneticReplayRound } from './math/magnetic.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 8787);
const HOST = process.env.HOST || '0.0.0.0';
const API_AMOUNT_MULTIPLIER = 1_000_000;

const generatedBooksCache = new Map();
const generatedLookupCache = new Map();
let nextBetId = 1;
let balance = 1000 * API_AMOUNT_MULTIPLIER;
const replayStore = new Map();

const buildJurisdiction = () => ({
  socialCasino: false,
  disabledFullscreen: false,
  disabledTurbo: false,
  disabledSuperTurbo: false,
  disabledAutoplay: false,
  disabledSlamstop: false,
  disabledSpacebar: false,
  disabledBuyFeature: false,
  displayNetPosition: false,
  displayRTP: false,
  displaySessionTimer: false,
  minimumRoundDuration: 0,
});

const GAME_REGISTRY = {
  forest: {
    slug: 'forest-gang',
    gameID: '0_0_forest_gang',
    modeCostMultipliers: { BASE: 1, BONUS: 100, SUPER: 400, FEATURE: 20, CHANCE: 2 },
    getRoundForMode: getForestRoundForMode,
    getReplayRound: getForestReplayRound,
    booksDir: process.env.MATH_SDK_BOOKS_DIR || path.resolve(__dirname, '../apps/forest-gang/library/books'),
    lookupDir: process.env.MATH_SDK_LOOKUPS_DIR || path.resolve(__dirname, '../apps/forest-gang/library/publish_files'),
    buildConfig: () => ({
      gameID: '0_0_forest_gang',
      minBet: 1 * API_AMOUNT_MULTIPLIER,
      maxBet: 100 * API_AMOUNT_MULTIPLIER,
      stepBet: 1 * API_AMOUNT_MULTIPLIER,
      defaultBetLevel: 1 * API_AMOUNT_MULTIPLIER,
      betLevels: [1, 2, 5, 10, 20, 50, 100].map((value) => value * API_AMOUNT_MULTIPLIER),
      betModes: {
        BASE: { type: 'default' },
        BONUS: { type: 'buy' },
        SUPER: { type: 'buy' },
      },
      jurisdiction: buildJurisdiction(),
    }),
  },
  magnetic: {
    slug: 'magnetic',
    gameID: '0_0_magnetic',
    modeCostMultipliers: { BASE: 1, CHANCE: 2, FEATURE: 50, BONUS: 150, SUPER: 400 },
    getRoundForMode: getMagneticRoundForMode,
    getReplayRound: getMagneticReplayRound,
    booksDir: process.env.MAGNETIC_MATH_SDK_BOOKS_DIR || path.resolve(__dirname, '__disabled__/magnetic/books'),
    lookupDir: process.env.MAGNETIC_MATH_SDK_LOOKUPS_DIR || path.resolve(__dirname, '__disabled__/magnetic/publish_files'),
    buildConfig: () => ({
      gameID: '0_0_magnetic',
      minBet: 1 * API_AMOUNT_MULTIPLIER,
      maxBet: 100 * API_AMOUNT_MULTIPLIER,
      stepBet: 1 * API_AMOUNT_MULTIPLIER,
      defaultBetLevel: 1 * API_AMOUNT_MULTIPLIER,
      betLevels: [1, 2, 5, 10, 20, 50, 100].map((value) => value * API_AMOUNT_MULTIPLIER),
      betModes: {
        BASE: { type: 'default' },
        CHANCE: { type: 'activate' },
        FEATURE: { type: 'activate' },
        BONUS: { type: 'buy' },
        SUPER: { type: 'buy' },
      },
      jurisdiction: buildJurisdiction(),
    }),
  },
};

const send = (res, code, body) => {
  res.writeHead(code, {
    'content-type': 'application/json',
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'content-type',
  });
  res.end(JSON.stringify(body));
};

const readJson = (req) =>
  new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => (data += chunk));
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });

const getRouteContext = (pathname) => {
  if (pathname === '/magnetic' || pathname.startsWith('/magnetic/')) {
    const stripped = pathname.replace(/^\/magnetic/, '') || '/';
    return { game: GAME_REGISTRY.magnetic, pathname: stripped.startsWith('/') ? stripped : `/${stripped}` };
  }
  return { game: GAME_REGISTRY.forest, pathname };
};

const cacheKey = (game, mode) => `${game.slug}:${String(mode || 'BASE').toUpperCase()}`;

const loadGeneratedBooks = (game, mode) => {
  const key = cacheKey(game, mode);
  if (generatedBooksCache.has(key)) return generatedBooksCache.get(key);
  const filePath = path.join(game.booksDir, `books_${String(mode || 'BASE').toUpperCase()}.jsonl`);
  if (!fs.existsSync(filePath)) {
    generatedBooksCache.set(key, null);
    return null;
  }
  const rows = fs
    .readFileSync(filePath, 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
  generatedBooksCache.set(key, rows);
  return rows;
};

const loadGeneratedLookup = (game, mode) => {
  const key = cacheKey(game, mode);
  if (generatedLookupCache.has(key)) return generatedLookupCache.get(key);
  const filePath = path.join(game.lookupDir, `lookUpTable_${String(mode || 'BASE').toUpperCase()}_0.csv`);
  if (!fs.existsSync(filePath)) {
    generatedLookupCache.set(key, null);
    return null;
  }
  const rows = fs
    .readFileSync(filePath, 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [id, weight, payoutMultiplier] = line.split(',');
      return { id: Number(id), weight: Number(weight), payoutMultiplier: Number(payoutMultiplier) };
    });
  const totalWeight = rows.reduce((sum, row) => sum + row.weight, 0);
  const lookup = { rows, totalWeight };
  generatedLookupCache.set(key, lookup);
  return lookup;
};

const pickWeightedBookId = (game, mode = 'BASE', seed = Date.now()) => {
  const lookup = loadGeneratedLookup(game, mode);
  if (!lookup || !lookup.rows.length || !lookup.totalWeight) return null;
  const normalizedSeed = Math.abs(Number(seed) || Date.now());
  let roll = normalizedSeed % lookup.totalWeight;
  for (const row of lookup.rows) {
    roll -= row.weight;
    if (roll < 0) return row.id;
  }
  return lookup.rows[lookup.rows.length - 1]?.id ?? null;
};

const getRoundFromGeneratedBooks = (game, mode = 'BASE', seed = Date.now()) => {
  const books = loadGeneratedBooks(game, mode);
  if (!books || books.length === 0) return null;
  const weightedBookId = pickWeightedBookId(game, mode, seed);
  const normalizedSeed = Math.abs(Number(seed) || Date.now());
  const book = (weightedBookId != null ? books.find((entry) => Number(entry.id) === Number(weightedBookId)) : null)
    || books[normalizedSeed % books.length];
  return {
    seed: normalizedSeed,
    payoutMultiplier: Number(book.payoutMultiplier || 0) / 100,
    events: book.events || [],
    bookId: book.id,
    criteria: book.criteria || null,
  };
};

const buildRound = ({ game, amountMicro, mode, seed }) => {
  const roundData = getRoundFromGeneratedBooks(game, mode, seed) || game.getRoundForMode(mode, seed);
  const payoutMultiplier = roundData.payoutMultiplier;
  const stakeMultiplier = game.modeCostMultipliers[mode] || 1;
  const stakeAmount = amountMicro * stakeMultiplier;
  const payout = Math.round(amountMicro * payoutMultiplier);
  const round = {
    betID: nextBetId++,
    amount: stakeAmount,
    payout,
    payoutMultiplier,
    active: false,
    state: roundData.events,
    mode,
    event: roundData.bookId ?? null,
    meta: roundData.criteria
      ? { criteria: roundData.criteria, source: roundData.bookId != null ? 'math-sdk-books' : 'proto-math', gameID: game.gameID }
      : { source: roundData.bookId != null ? 'math-sdk-books' : 'proto-math', gameID: game.gameID },
  };
  replayStore.set(`${game.slug}:${round.betID}`, round);
  return round;
};

const server = https.createServer(
  {
    key: fs.readFileSync(path.join(__dirname, 'certs/localhost-key.pem')),
    cert: fs.readFileSync(path.join(__dirname, 'certs/localhost-cert.pem')),
  },
  async (req, res) => {
    const url = new URL(req.url, `https://localhost:${PORT}`);
    const route = getRouteContext(url.pathname);
    const pathname = route.pathname;
    const game = route.game;

    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'access-control-allow-origin': '*',
        'access-control-allow-methods': 'GET,POST,OPTIONS',
        'access-control-allow-headers': 'content-type',
      });
      res.end();
      return;
    }

    if (req.method === 'GET' && pathname === '/health') {
      send(res, 200, { ok: true, service: 'mock-rgs', port: PORT, game: game.slug });
      return;
    }

    if (req.method === 'POST' && pathname === '/wallet/authenticate') {
      const body = await readJson(req).catch(() => ({}));
      send(res, 200, {
        balance: { amount: balance, currency: 'USD' },
        config: game.buildConfig(),
        round: null,
        meta: { sessionID: body.sessionID || 'test', gameID: game.gameID },
      });
      return;
    }

    if (req.method === 'POST' && pathname === '/wallet/play') {
      const body = await readJson(req).catch(() => ({}));
      const amountMicro = Number(body.amount || API_AMOUNT_MULTIPLIER);
      const mode = String(body.mode || 'BASE').toUpperCase();
      const seed = Number(body.seed || url.searchParams.get('seed') || Date.now());
      const stakeMultiplier = game.modeCostMultipliers[mode] || 1;
      const stakeAmount = amountMicro * stakeMultiplier;
      const round = buildRound({ game, amountMicro, mode, seed });
      balance = balance - stakeAmount + round.payout;
      send(res, 200, {
        balance: { amount: balance, currency: 'USD' },
        round,
      });
      return;
    }

    if (req.method === 'POST' && pathname === '/wallet/end-round') {
      send(res, 200, { balance: { amount: balance, currency: 'USD' } });
      return;
    }

    if (req.method === 'POST' && pathname === '/bet/event') {
      const body = await readJson(req).catch(() => ({}));
      send(res, 200, { ok: true, event: body.event || null, gameID: game.gameID });
      return;
    }

    if (req.method === 'GET' && pathname.startsWith('/bet/replay/')) {
      const [, , , routeGame, version, mode, event] = pathname.split('/');
      const replayGame = routeGame === '0_0_magnetic' ? GAME_REGISTRY.magnetic : game;
      const stored = replayStore.get(`${replayGame.slug}:${event}`);
      const replaySeed = Number(url.searchParams.get('seed') || Date.now());
      const fallback = getRoundFromGeneratedBooks(replayGame, mode, replaySeed) || replayGame.getReplayRound({ mode, seed: replaySeed });
      const payload = stored || {
        betID: Number(event) || 999,
        amount: API_AMOUNT_MULTIPLIER,
        payout: Math.round(API_AMOUNT_MULTIPLIER * fallback.payoutMultiplier),
        payoutMultiplier: fallback.payoutMultiplier,
        active: false,
        state: fallback.events,
        mode,
        event: fallback.bookId ?? null,
        meta: fallback.criteria
          ? { criteria: fallback.criteria, source: fallback.bookId != null ? 'math-sdk-books' : 'proto-math', gameID: replayGame.gameID, version }
          : { source: fallback.bookId != null ? 'math-sdk-books' : 'proto-math', gameID: replayGame.gameID, version },
      };
      send(res, 200, payload);
      return;
    }

    send(res, 404, { error: 'not_found', path: url.pathname, game: game.slug });
  },
);

server.listen(PORT, HOST, () => {
  console.log(`mock-rgs https://localhost:${PORT}`);
  console.log(`health     https://localhost:${PORT}/health`);
  console.log(`magnetic   https://localhost:${PORT}/magnetic/health`);
  console.log('accept self-signed cert in browser first');
});
