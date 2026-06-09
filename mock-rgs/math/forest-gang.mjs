const PAYLINES = {
  1: [0, 0, 0, 0, 0],
  2: [1, 1, 1, 1, 1],
  3: [2, 2, 2, 2, 2],
  4: [3, 3, 3, 3, 3],
  5: [0, 1, 2, 1, 0],
  6: [3, 2, 1, 2, 3],
  7: [0, 0, 1, 0, 0],
  8: [3, 3, 2, 3, 3],
  9: [1, 2, 3, 2, 1],
  10: [2, 1, 0, 1, 2],
  11: [0, 1, 1, 1, 0],
  12: [3, 2, 2, 2, 3],
  13: [1, 1, 2, 1, 1],
  14: [2, 2, 1, 2, 2],
  15: [1, 0, 1, 0, 1],
  16: [2, 3, 2, 3, 2],
  17: [0, 1, 0, 1, 0],
  18: [3, 2, 3, 2, 3],
  19: [1, 2, 1, 2, 1],
  20: [2, 1, 2, 1, 2],
};

const PREMIUMS = ['FOX', 'WOLF', 'BEAR', 'RABBIT', 'SQUIRREL'];
const LOWS = ['A', 'K', 'Q', 'J', 'T'];
const PAY_SYMBOLS = [...PREMIUMS, ...LOWS];
const WILD = 'WILD';
const SCATTER = 'SCATTER';
const MAX_WIN_X = 20000;
const BONUS_TOTAL_FS = 10;

const BASE_HIT_RATE = 0.24;
const BASE_TRIGGER_RATE = 1 / 180;
const SUPER_TRIGGER_SHARE = 0.19;
const SUPER_TRIGGER_RATE = BASE_TRIGGER_RATE * SUPER_TRIGGER_SHARE;
const DEAL_TRIGGER_RATE = BASE_TRIGGER_RATE - SUPER_TRIGGER_RATE;
const BASE_LINE_WIN_SCALE = 1.032;
const BASE_TRIGGER_BONUS_SCALE = 0.97;

const BASE_NON_TRIGGER_TABLE = [
  [0.4, 8000],
  [0.8, 4000],
  [1.2, 3200],
  [1.5, 2400],
  [2, 2000],
  [3, 1500],
  [5, 1000],
  [8, 600],
  [12, 350],
  [20, 180],
  [35, 120],
  [60, 60],
  [100, 20],
  [250, 10],
  [500, 4],
].map(([x, w]) => [+(x * BASE_LINE_WIN_SCALE).toFixed(3), w]);

const DEAL_TRIGGER_TOTAL_TABLE = [
  [10, 18000],
  [20, 18000],
  [30, 19000],
  [40, 15000],
  [50, 9000],
  [75, 9000],
  [100, 5000],
  [150, 3500],
  [250, 1700],
  [500, 500],
  [1000, 200],
  [5000, 100],
].map(([x, w]) => [+(x * BASE_TRIGGER_BONUS_SCALE).toFixed(3), w]);

const SUPER_TRIGGER_TOTAL_TABLE = [
  [20, 12000],
  [40, 14000],
  [60, 15000],
  [80, 12000],
  [100, 10000],
  [150, 12000],
  [200, 9000],
  [300, 7000],
  [500, 5000],
  [1000, 2000],
  [2500, 800],
  [5000, 180],
  [20000, 20],
].map(([x, w]) => [+(x * BASE_TRIGGER_BONUS_SCALE).toFixed(3), w]);

const BUY_VALUE_SCALE = 0.8807;

const BUY_BONUS_TOTAL_TABLE_RAW = [
  [5, 4000],
  [10, 10000],
  [20, 12000],
  [30, 13000],
  [40, 11000],
  [50, 10000],
  [75, 10000],
  [100, 10000],
  [150, 9000],
  [250, 6000],
  [400, 3000],
  [750, 1500],
  [1200, 1000],
  [2500, 500],
];

const BUY_BONUS_TOTAL_TABLE = BUY_BONUS_TOTAL_TABLE_RAW.map(([x, w]) => [+(x * BUY_VALUE_SCALE).toFixed(3), w]);
const BUY_SUPER_TOTAL_TABLE = BUY_BONUS_TOTAL_TABLE_RAW.map(([x, w]) => [+(x * BUY_VALUE_SCALE * 4).toFixed(3), w]);

const mulberry32 = (seed) => () => {
  let t = (seed += 0x6D2B79F5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const randomInt = (rng, max) => Math.floor(rng() * max);
const choice = (rng, arr) => arr[randomInt(rng, arr.length)];
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const uniqSorted = (arr) => [...new Set(arr)].sort((a, b) => a - b);
const toAmount = (x) => Math.round(x * 100);

const weightedChoice = (rng, entries) => {
  const totalWeight = entries.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = rng() * totalWeight;
  for (const [value, weight] of entries) {
    roll -= weight;
    if (roll < 0) return value;
  }
  return entries.at(-1)?.[0];
};

const sampleBaseOutcomeKind = (rng) => {
  const roll = rng();
  if (roll < SUPER_TRIGGER_RATE) return 'superTrigger';
  if (roll < SUPER_TRIGGER_RATE + DEAL_TRIGGER_RATE) return 'dealTrigger';
  if (roll < BASE_HIT_RATE) return 'lineWin';
  return 'lose';
};

const randomVisibleSymbol = (rng) => {
  const roll = rng();
  if (roll < 0.04) return WILD;
  return choice(rng, PAY_SYMBOLS);
};

const createBoard = ({ rng, scatterPositions = [], forcedPositions = [], expandedReels = [], expandedSymbol = null }) => {
  const board = Array.from({ length: 5 }, () =>
    Array.from({ length: 6 }, () => ({ name: randomVisibleSymbol(rng) })),
  );

  for (let reel = 0; reel < 5; reel++) {
    for (let row = 1; row <= 4; row++) {
      board[reel][row] = { name: randomVisibleSymbol(rng) };
    }
  }

  for (const { reel, row, name } of forcedPositions) {
    board[reel][row] = { name };
  }

  for (const { reel, row } of scatterPositions) {
    board[reel][row] = { name: SCATTER };
  }

  if (expandedSymbol) {
    for (const reel of expandedReels) {
      for (let row = 1; row <= 4; row++) {
        board[reel][row] = { name: expandedSymbol };
      }
    }
  }

  return board;
};

const positionsForLine = (lineIndex) =>
  PAYLINES[lineIndex].map((row, reel) => ({ reel, row: row + 1 }));

const makeRevealEvent = (index, board, gameType, rng) => {
  const base = randomInt(rng, 2) === 0 ? 1 : 2;
  return {
    index,
    type: 'reveal',
    board,
    paddingPositions: [base, base + 2, base + 4, base + 6, base + 8],
    anticipation: [0, 0, 0, 0, 0],
    gameType,
  };
};

const makeLineWin = ({ symbol, positions, win, lineIndex, globalMult = 1 }) => ({
  symbol,
  kind: positions.length,
  win,
  positions,
  meta: {
    lineIndex,
    multiplier: 1,
    winWithoutMult: win,
    globalMult,
    lineMultiplier: 1,
  },
});

const splitAmount = (rng, total, parts) => {
  if (parts <= 1) return [total];
  let remaining = total;
  const out = [];
  for (let i = 0; i < parts - 1; i++) {
    const minLeft = parts - i - 1;
    const minHere = 1;
    const maxHere = remaining - minLeft;
    const slice = minHere + randomInt(rng, Math.max(1, maxHere - minHere + 1));
    out.push(slice);
    remaining -= slice;
  }
  out.push(remaining);
  return out;
};

const winLevelFromAmount = (amount) => {
  const x = amount / 100;
  if (x <= 0) return 1;
  if (x < 2) return 2;
  if (x < 5) return 3;
  if (x < 10) return 4;
  if (x < 20) return 5;
  if (x < 50) return 6;
  if (x < 100) return 7;
  if (x < 250) return 8;
  if (x < 1000) return 9;
  return 10;
};

const randomLineIndex = (rng) => randomInt(rng, 20) + 1;

const buildBaseLineWin = (rng, amount) => {
  const lineIndex = randomLineIndex(rng);
  const positions = positionsForLine(lineIndex);
  const symbol = choice(rng, PAY_SYMBOLS);
  const board = createBoard({
    rng,
    forcedPositions: positions.map((position) => ({ ...position, name: symbol })),
  });

  return {
    board,
    wins: [makeLineWin({ symbol, positions, win: amount, lineIndex })],
  };
};

const randomExpandedReels = (rng, minCount = 2, maxCount = 5) => {
  const count = clamp(minCount + randomInt(rng, maxCount - minCount + 1), minCount, maxCount);
  const reels = [];
  while (reels.length < count) {
    const reel = randomInt(rng, 5);
    if (!reels.includes(reel)) reels.push(reel);
  }
  return reels.sort((a, b) => a - b);
};

const expandedPositionsForReels = (reels) =>
  reels.flatMap((reel) => [1, 2, 3, 4].map((row) => ({ reel, row })));

const chooseBonusSpinCount = (rng, mode) =>
  weightedChoice(rng, mode === 'superspin'
    ? [[2, 8], [3, 24], [4, 32], [5, 24], [6, 12]]
    : [[2, 15], [3, 35], [4, 30], [5, 20]]);

const chooseTempMultiplier = (rng) => weightedChoice(rng, [[2, 70], [3, 25], [5, 5]]);

const createBonusSpinPlan = ({ rng, mode, totalAmount }) => {
  if (totalAmount <= 0) return [];
  const spinCount = chooseBonusSpinCount(rng, mode);
  const slices = splitAmount(rng, totalAmount, spinCount).sort((a, b) => b - a);
  const uniqueSpinIndexes = [];
  while (uniqueSpinIndexes.length < spinCount) {
    const spin = randomInt(rng, BONUS_TOTAL_FS);
    if (!uniqueSpinIndexes.includes(spin)) uniqueSpinIndexes.push(spin);
  }
  uniqueSpinIndexes.sort((a, b) => a - b);
  return uniqueSpinIndexes.map((spinIndex, idx) => ({
    spinIndex,
    amount: slices[idx],
  }));
};

function generateBonusEvents({ rng, mode, selectedSymbol, totalPayoutX, initialTotalWinAmount = 0, scatterPositions = null }) {
  const events = [];
  let idx = 0;
  let runningTotal = initialTotalWinAmount;
  let reelMultipliers = [1, 1, 1, 1, 1];
  const totalBonusAmount = clamp(toAmount(totalPayoutX), 0, MAX_WIN_X * 100 - initialTotalWinAmount);
  const winPlan = createBonusSpinPlan({ rng, mode, totalAmount: totalBonusAmount });
  const planMap = new Map(winPlan.map((entry) => [entry.spinIndex, entry.amount]));

  const triggerPositions = scatterPositions ?? (mode === 'superspin'
    ? [{ reel: 0, row: 1 }, { reel: 1, row: 2 }, { reel: 2, row: 3 }, { reel: 3, row: 2 }]
    : [{ reel: 0, row: 1 }, { reel: 1, row: 2 }, { reel: 2, row: 3 }]);

  events.push({
    index: idx++,
    type: 'freeSpinTrigger',
    totalFs: BONUS_TOTAL_FS,
    positions: triggerPositions,
  });
  events.push({ index: idx++, type: 'bonusSymbolSelected', symbol: selectedSymbol, mode });

  for (let spinIndex = 0; spinIndex < BONUS_TOTAL_FS; spinIndex++) {
    const plannedAmount = planMap.get(spinIndex) ?? 0;
    const expandedReels = plannedAmount > 0
      ? randomExpandedReels(rng, mode === 'superspin' ? 2 : 2, mode === 'superspin' ? 5 : 4)
      : [];
    const expandedPositions = expandedPositionsForReels(expandedReels);
    const board = createBoard({
      rng,
      expandedReels,
      expandedSymbol: plannedAmount > 0 ? selectedSymbol : null,
    });

    events.push({ index: idx++, type: 'updateFreeSpin', amount: spinIndex, total: BONUS_TOTAL_FS });
    events.push(makeRevealEvent(idx++, board, mode, rng));

    if (plannedAmount > 0) {
      events.push({
        index: idx++,
        type: 'expandedSymbolReveal',
        symbol: selectedSymbol,
        reels: expandedReels,
        positions: expandedPositions,
      });

      if (mode === 'freegame') {
        const useTempMultiplier = rng() < 0.45;
        const tempMultiplier = useTempMultiplier ? chooseTempMultiplier(rng) : null;
        const baseWin = tempMultiplier ? Math.max(1, Math.round(plannedAmount / tempMultiplier)) : plannedAmount;
        const lineIndex = randomLineIndex(rng);
        const positions = positionsForLine(lineIndex);
        events.push({
          index: idx++,
          type: 'winInfo',
          totalWin: baseWin,
          wins: [makeLineWin({ symbol: selectedSymbol, positions, win: baseWin, lineIndex })],
        });
        if (tempMultiplier) {
          events.push({
            index: idx++,
            type: 'applyTempMultiplier',
            multiplier: tempMultiplier,
            winBefore: baseWin,
            winAfter: plannedAmount,
          });
        }
        runningTotal = clamp(runningTotal + plannedAmount, 0, MAX_WIN_X * 100);
        events.push({ index: idx++, type: 'setWin', amount: plannedAmount, winLevel: winLevelFromAmount(plannedAmount) });
      } else {
        const contributingReels = expandedReels;
        const globalMult = Math.max(...contributingReels.map((reel) => reelMultipliers[reel]));
        const baseWin = Math.max(1, Math.round(plannedAmount / globalMult));
        const lineIndex = randomLineIndex(rng);
        const positions = positionsForLine(lineIndex);
        events.push({
          index: idx++,
          type: 'winInfo',
          totalWin: baseWin,
          wins: [makeLineWin({ symbol: selectedSymbol, positions, win: baseWin, lineIndex, globalMult })],
        });
        runningTotal = clamp(runningTotal + plannedAmount, 0, MAX_WIN_X * 100);
        events.push({ index: idx++, type: 'setWin', amount: plannedAmount, winLevel: winLevelFromAmount(plannedAmount) });
        reelMultipliers = reelMultipliers.map((multiplier, reel) =>
          contributingReels.includes(reel) ? clamp(multiplier * 2, 1, 32) : multiplier,
        );
        events.push({
          index: idx++,
          type: 'updateReelMultipliers',
          multipliers: [...reelMultipliers],
          changedReels: [...contributingReels],
        });
      }
    }

    events.push({ index: idx++, type: 'setTotalWin', amount: runningTotal });
  }

  events.push({ index: idx++, type: 'freeSpinEnd', amount: runningTotal, winLevel: winLevelFromAmount(runningTotal) });
  events.push({ index: idx++, type: 'finalWin', amount: runningTotal });
  return events;
}

function generateBaseRound(rng) {
  const outcomeKind = sampleBaseOutcomeKind(rng);
  const events = [];
  let idx = 0;

  if (outcomeKind === 'lose') {
    const board = createBoard({ rng });
    events.push(makeRevealEvent(idx++, board, 'basegame', rng));
    events.push({ index: idx++, type: 'setTotalWin', amount: 0 });
    events.push({ index: idx++, type: 'finalWin', amount: 0 });
    return events;
  }

  if (outcomeKind === 'lineWin') {
    const amount = toAmount(weightedChoice(rng, BASE_NON_TRIGGER_TABLE));
    const { board, wins } = buildBaseLineWin(rng, amount);
    events.push(makeRevealEvent(idx++, board, 'basegame', rng));
    events.push({ index: idx++, type: 'winInfo', totalWin: amount, wins });
    events.push({ index: idx++, type: 'setWin', amount, winLevel: winLevelFromAmount(amount) });
    events.push({ index: idx++, type: 'setTotalWin', amount });
    events.push({ index: idx++, type: 'finalWin', amount });
    return events;
  }

  const isSuper = outcomeKind === 'superTrigger';
  const selectedSymbol = choice(rng, PREMIUMS);
  const totalRoundX = weightedChoice(rng, isSuper ? SUPER_TRIGGER_TOTAL_TABLE : DEAL_TRIGGER_TOTAL_TABLE);
  const baseSpinX = choice(rng, [0, 0.4, 0.8, 1.2, 2]);
  const baseSpinAmount = Math.min(toAmount(baseSpinX), toAmount(totalRoundX));
  const bonusOnlyX = Math.max(0, totalRoundX - baseSpinX);
  const triggerScatterPositions = isSuper
    ? [{ reel: 0, row: 1 }, { reel: 1, row: 2 }, { reel: 2, row: 3 }, { reel: 3, row: 2 }]
    : [{ reel: 0, row: 1 }, { reel: 1, row: 2 }, { reel: 2, row: 3 }];

  let baseWins = [];
  let forcedPositions = [];
  if (baseSpinAmount > 0) {
    const lineIndex = randomLineIndex(rng);
    const positions = positionsForLine(lineIndex);
    const symbol = choice(rng, PAY_SYMBOLS);
    baseWins = [makeLineWin({ symbol, positions, win: baseSpinAmount, lineIndex })];
    forcedPositions = positions.map((position) => ({ ...position, name: symbol }));
  }

  const board = createBoard({
    rng,
    scatterPositions: triggerScatterPositions,
    forcedPositions,
  });

  events.push(makeRevealEvent(idx++, board, 'basegame', rng));
  if (baseSpinAmount > 0) {
    events.push({ index: idx++, type: 'winInfo', totalWin: baseSpinAmount, wins: baseWins });
    events.push({ index: idx++, type: 'setWin', amount: baseSpinAmount, winLevel: winLevelFromAmount(baseSpinAmount) });
  }
  events.push({ index: idx++, type: 'setTotalWin', amount: baseSpinAmount });

  const bonusEvents = generateBonusEvents({
    rng,
    mode: isSuper ? 'superspin' : 'freegame',
    selectedSymbol,
    totalPayoutX: bonusOnlyX,
    initialTotalWinAmount: baseSpinAmount,
    scatterPositions: triggerScatterPositions,
  });

  for (const event of bonusEvents) {
    events.push({ ...event, index: idx++ });
  }

  return events;
}

function generateBuyRound(rng, mode) {
  const selectedSymbol = choice(rng, PREMIUMS);
  const totalPayoutX = weightedChoice(rng, mode === 'SUPER' ? BUY_SUPER_TOTAL_TABLE : BUY_BONUS_TOTAL_TABLE);
  const bonusMode = mode === 'SUPER' ? 'superspin' : 'freegame';

  const cinematicScatterPositions = bonusMode === 'superspin'
    ? [{ reel: 0, row: 1 }, { reel: 1, row: 3 }, { reel: 3, row: 2 }, { reel: 4, row: 1 }]
    : [{ reel: 0, row: 2 }, { reel: 2, row: 1 }, { reel: 4, row: 3 }];

  const cinematicBoard = createBoard({ rng, scatterPositions: cinematicScatterPositions });
  const revealEvent = makeRevealEvent(0, cinematicBoard, 'basegame', rng);

  const bonusEvents = generateBonusEvents({
    rng,
    mode: bonusMode,
    selectedSymbol,
    totalPayoutX,
    initialTotalWinAmount: 0,
    scatterPositions: cinematicScatterPositions,
  });

  return [revealEvent, ...bonusEvents.map((e, i) => ({ ...e, index: i + 1 }))];
}

export function generateRoundForMode({ mode = 'BASE', seed = Date.now() } = {}) {
  const rng = mulberry32(typeof seed === 'number' ? seed : Number(seed) || Date.now());
  const events = mode === 'BASE' ? generateBaseRound(rng) : generateBuyRound(rng, mode);
  const finalWin = events.filter((event) => event.type === 'finalWin').at(-1)?.amount ?? 0;
  return { seed, payoutMultiplier: finalWin / 100, events };
}

export const getRoundForMode = (mode = 'BASE', seed = Date.now()) => generateRoundForMode({ mode, seed });
export const getReplayRound = ({ mode = 'BASE', seed = Date.now() } = {}) => generateRoundForMode({ mode, seed });
