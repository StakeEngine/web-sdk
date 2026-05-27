import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getRoundForMode, getReplayRound } from './math/forest-gang.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MATH_SDK_BOOKS_DIR = process.env.MATH_SDK_BOOKS_DIR || path.resolve(__dirname, '../apps/forest-gang/library/books');
const MATH_SDK_LOOKUPS_DIR = process.env.MATH_SDK_LOOKUPS_DIR || path.resolve(__dirname, '../apps/forest-gang/library/publish_files');
const generatedBooksCache = new Map();
const generatedLookupCache = new Map();
const PORT = Number(process.env.PORT || 8787);
const HOST = process.env.HOST || '0.0.0.0';
const API_AMOUNT_MULTIPLIER = 1_000_000;

let nextBetId = 1;
let balance = 1000 * API_AMOUNT_MULTIPLIER;
const replayStore = new Map();

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

const buildConfig = () => ({
  gameID: '0_0_forest_gang',
  minBet: 1 * API_AMOUNT_MULTIPLIER,
  maxBet: 100 * API_AMOUNT_MULTIPLIER,
  stepBet: 1 * API_AMOUNT_MULTIPLIER,
  defaultBetLevel: 1 * API_AMOUNT_MULTIPLIER,
  betLevels: [1, 2, 5, 10, 20, 50, 100].map((v) => v * API_AMOUNT_MULTIPLIER),
  betModes: {
    BASE: { type: 'default' },
    BONUS: { type: 'buy' },
    SUPER: { type: 'buy' },
  },
  jurisdiction: {
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
  },
});

const MODE_COST_MULTIPLIER = { BASE: 1, BONUS: 100, SUPER: 400 };


const loadGeneratedBooks = (mode) => {
  const key = String(mode || 'BASE').toUpperCase();
  if (generatedBooksCache.has(key)) return generatedBooksCache.get(key);
  const filePath = path.join(MATH_SDK_BOOKS_DIR, `books_${key}.jsonl`);
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

const loadGeneratedLookup = (mode) => {
  const key = String(mode || 'BASE').toUpperCase();
  if (generatedLookupCache.has(key)) return generatedLookupCache.get(key);
  const filePath = path.join(MATH_SDK_LOOKUPS_DIR, `lookUpTable_${key}_0.csv`);
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

const pickWeightedBookId = (mode = 'BASE', seed = Date.now()) => {
  const lookup = loadGeneratedLookup(mode);
  if (!lookup || !lookup.rows.length || !lookup.totalWeight) return null;
  const normalizedSeed = Math.abs(Number(seed) || Date.now());
  let roll = normalizedSeed % lookup.totalWeight;
  for (const row of lookup.rows) {
    roll -= row.weight;
    if (roll < 0) return row.id;
  }
  return lookup.rows[lookup.rows.length - 1]?.id ?? null;
};

const getRoundFromGeneratedBooks = (mode = 'BASE', seed = Date.now()) => {
  const books = loadGeneratedBooks(mode);
  if (!books || books.length === 0) return null;
  const weightedBookId = pickWeightedBookId(mode, seed);
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


const buildRound = ({ amountMicro, mode, seed }) => {
  const roundData = getRoundFromGeneratedBooks(mode, seed) || getRoundForMode(mode, seed);
  const payoutMultiplier = roundData.payoutMultiplier;
  const stakeMultiplier = MODE_COST_MULTIPLIER[mode] || 1;
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
    meta: roundData.criteria ? { criteria: roundData.criteria, source: roundData.bookId != null ? 'math-sdk-books' : 'proto-math' } : { source: roundData.bookId != null ? 'math-sdk-books' : 'proto-math' },
  };
  replayStore.set(String(round.betID), round);
  return round;
};

const server = https.createServer(
  {
    key: fs.readFileSync(path.join(__dirname, 'certs/localhost-key.pem')),
    cert: fs.readFileSync(path.join(__dirname, 'certs/localhost-cert.pem')),
  },
  async (req, res) => {
    const url = new URL(req.url, `https://localhost:${PORT}`);

    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'access-control-allow-origin': '*',
        'access-control-allow-methods': 'GET,POST,OPTIONS',
        'access-control-allow-headers': 'content-type',
      });
      res.end();
      return;
    }

    if (req.method === 'GET' && url.pathname === '/health') {
      send(res, 200, { ok: true, service: 'mock-rgs', port: PORT });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/wallet/authenticate') {
      const body = await readJson(req).catch(() => ({}));
      send(res, 200, {
        balance: { amount: balance, currency: 'USD' },
        config: buildConfig(),
        round: null,
        meta: { sessionID: body.sessionID || 'test' },
      });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/wallet/play') {
      const body = await readJson(req).catch(() => ({}));
      const amountMicro = Number(body.amount || API_AMOUNT_MULTIPLIER);
      const mode = body.mode || 'BASE';
      const seed = Number(body.seed || url.searchParams.get('seed') || Date.now());
      const stakeMultiplier = MODE_COST_MULTIPLIER[mode] || 1;
      const stakeAmount = amountMicro * stakeMultiplier;
      const round = buildRound({ amountMicro, mode, seed });
      balance = balance - stakeAmount + round.payout;
      send(res, 200, {
        balance: { amount: balance, currency: 'USD' },
        round,
      });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/wallet/end-round') {
      send(res, 200, {
        balance: { amount: balance, currency: 'USD' },
      });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/bet/event') {
      const body = await readJson(req).catch(() => ({}));
      send(res, 200, { ok: true, event: body.event || null });
      return;
    }

    if (req.method === 'GET' && url.pathname.startsWith('/bet/replay/')) {
      const [, , , game, version, mode, event] = url.pathname.split('/');
      const stored = replayStore.get(event);
      const replaySeed = Number(url.searchParams.get('seed') || Date.now());
      const fallback = getRoundFromGeneratedBooks(mode, replaySeed) || getReplayRound({ mode, seed: replaySeed });
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
          ? { criteria: fallback.criteria, source: fallback.bookId != null ? 'math-sdk-books' : 'proto-math' }
          : { source: fallback.bookId != null ? 'math-sdk-books' : 'proto-math' },
      };
      send(res, 200, payload);
      return;
    }

    send(res, 404, { error: 'not_found', path: url.pathname });
  },
);

server.listen(PORT, HOST, () => {
  console.log(`mock-rgs https://localhost:${PORT}`);
  console.log(`health     https://localhost:${PORT}/health`);
  console.log('accept self-signed cert in browser first');
});
