const BOARD_REELS = 7;
const BOARD_ROWS = 7;
const TOTAL_FS = 10;
const FEATURE_FS = 1;
const MAX_WIN_X = 20000;

const PAY_SYMBOLS = ['FOX', 'WOLF', 'BEAR', 'RABBIT', 'SQUIRREL', 'A', 'K', 'Q', 'J', 'T'];
const SYMBOL_WEIGHTS = [
  ['T', 18],
  ['J', 16],
  ['Q', 14],
  ['K', 12],
  ['A', 10],
  ['SQUIRREL', 8],
  ['RABBIT', 6],
  ['BEAR', 4],
  ['WOLF', 3],
  ['FOX', 2],
];
const MAGNET_MULTIPLIERS = [
  [1, 54],
  [2, 26],
  [3, 14],
  [4, 6],
];

const PAYTABLE_BANDS = {
  FOX: [[5, 7, 1.5], [8, 11, 4], [12, 19, 10], [20, 49, 40]],
  WOLF: [[5, 7, 1.25], [8, 11, 3.5], [12, 19, 8], [20, 49, 30]],
  BEAR: [[5, 7, 1], [8, 11, 3], [12, 19, 7], [20, 49, 24]],
  RABBIT: [[5, 7, 0.8], [8, 11, 2.2], [12, 19, 5], [20, 49, 18]],
  SQUIRREL: [[5, 7, 0.7], [8, 11, 2], [12, 19, 4.5], [20, 49, 14]],
  A: [[5, 7, 0.6], [8, 11, 1.7], [12, 19, 4], [20, 49, 12]],
  K: [[5, 7, 0.5], [8, 11, 1.5], [12, 19, 3.5], [20, 49, 10]],
  Q: [[5, 7, 0.4], [8, 11, 1.3], [12, 19, 3], [20, 49, 8]],
  J: [[5, 7, 0.35], [8, 11, 1.1], [12, 19, 2.5], [20, 49, 7]],
  T: [[5, 7, 0.3], [8, 11, 1], [12, 19, 2.2], [20, 49, 6]],
};

const BASE_MODE_SETTINGS = {
  triggerBonusRate: 0.024,
  triggerSuperRate: 0.009,
  magnetSpinRate: 0.24,
  magnetRespinRate: 0.18,
  targetBoost: 0.28,
  scatterRange: [0, 2],
};

const MODE_SETTINGS = {
  BASE: { ...BASE_MODE_SETTINGS },
  CHANCE: {
    ...BASE_MODE_SETTINGS,
    triggerBonusRate: BASE_MODE_SETTINGS.triggerBonusRate * 3,
    triggerSuperRate: BASE_MODE_SETTINGS.triggerSuperRate * 3,
    magnetSpinRate: 0.26,
    magnetRespinRate: 0.2,
    targetBoost: 0.3,
  },
  FEATURE: {
    magnetSpinRate: 1,
    magnetRespinRate: 0.24,
    targetBoost: 0.38,
    scatterRange: [0, 0],
  },
  BONUS: {
    magnetSpinRate: 0.56,
    magnetRespinRate: 0.26,
    targetBoost: 0.38,
    scatterRange: [0, 0],
  },
  SUPER: {
    magnetSpinRate: 1,
    magnetRespinRate: 0.34,
    targetBoost: 0.42,
    scatterRange: [0, 0],
  },
};

const mulberry32 = (seed) => () => {
  let t = (seed += 0x6d2b79f5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const randInt = (rng, max) => Math.floor(rng() * max);
const chance = (rng, value) => rng() < value;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const posKey = ({ reel, row }) => `${reel}:${row}`;
const clonePos = ({ reel, row }) => ({ reel, row });
const clonePositions = (positions) => positions.map(clonePos);
const uniqPositions = (positions) => {
  const seen = new Set();
  const out = [];
  for (const position of positions) {
    const key = posKey(position);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(clonePos(position));
  }
  return out;
};

const weightedChoice = (rng, entries) => {
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = rng() * total;
  for (const [value, weight] of entries) {
    roll -= weight;
    if (roll < 0) return value;
  }
  return entries.at(-1)?.[0];
};

const makePaySymbol = (name) => ({ name });
const makeScatter = () => ({ name: 'SCATTER', scatter: true });
const makeMagnet = (multiplier) => ({
  name: 'MAGNET',
  magnet: true,
  ...(multiplier > 1 ? { multiplier } : {}),
});

const randomPaySymbol = (rng, targetSymbol = null, boost = 0) => {
  if (!targetSymbol || boost <= 0 || !PAY_SYMBOLS.includes(targetSymbol)) {
    return weightedChoice(rng, SYMBOL_WEIGHTS);
  }
  const boosted = SYMBOL_WEIGHTS.map(([symbol, weight]) => [symbol, symbol === targetSymbol ? weight * (1 + boost * 4) : weight]);
  return weightedChoice(rng, boosted);
};

const emptyBoard = () => Array.from({ length: BOARD_REELS }, () => Array.from({ length: BOARD_ROWS }, () => makePaySymbol('T')));
const cloneBoard = (board) => board.map((reel) => reel.map((cell) => ({ ...cell })));

const getNeighbors = ({ reel, row }) => {
  const neighbors = [];
  if (reel > 0) neighbors.push({ reel: reel - 1, row });
  if (reel < BOARD_REELS - 1) neighbors.push({ reel: reel + 1, row });
  if (row > 0) neighbors.push({ reel, row: row - 1 });
  if (row < BOARD_ROWS - 1) neighbors.push({ reel, row: row + 1 });
  return neighbors;
};

const boardPositions = () => {
  const out = [];
  for (let reel = 0; reel < BOARD_REELS; reel += 1) {
    for (let row = 0; row < BOARD_ROWS; row += 1) out.push({ reel, row });
  }
  return out;
};

const ALL_POSITIONS = boardPositions();

const samplePositions = (rng, count, blocked = new Set()) => {
  const pool = ALL_POSITIONS.filter((position) => !blocked.has(posKey(position)));
  const out = [];
  for (let i = 0; i < count && pool.length; i += 1) {
    const index = randInt(rng, pool.length);
    const [pick] = pool.splice(index, 1);
    out.push(pick);
  }
  return out;
};

const randomScatterCount = (rng, mode) => {
  const [min, max] = MODE_SETTINGS[mode]?.scatterRange ?? [0, 0];
  return min + randInt(rng, max - min + 1);
};

const randomMagnetCount = (rng, rate) => {
  if (!chance(rng, rate)) return 0;
  if (chance(rng, 0.18)) return 2;
  return 1;
};

const createBoard = ({
  rng,
  mode,
  scatterCount = 0,
  magnetCount = 0,
  lockedMap = new Map(),
  targetSymbol = null,
  targetBoost = 0,
}) => {
  const board = emptyBoard();
  const lockedKeys = new Set([...lockedMap.keys()]);

  for (let reel = 0; reel < BOARD_REELS; reel += 1) {
    for (let row = 0; row < BOARD_ROWS; row += 1) {
      const key = `${reel}:${row}`;
      if (lockedMap.has(key)) {
        board[reel][row] = makePaySymbol(lockedMap.get(key));
        continue;
      }
      board[reel][row] = makePaySymbol(randomPaySymbol(rng, targetSymbol, targetBoost));
    }
  }

  const scatterPositions = samplePositions(rng, scatterCount, lockedKeys);
  for (const position of scatterPositions) board[position.reel][position.row] = makeScatter();

  const blocked = new Set([...lockedKeys, ...scatterPositions.map(posKey)]);
  const magnetPositions = samplePositions(rng, magnetCount, blocked);
  for (const position of magnetPositions) {
    const multiplier = weightedChoice(rng, MAGNET_MULTIPLIERS);
    board[position.reel][position.row] = makeMagnet(multiplier);
  }

  return board;
};

const forceScatters = (board, positions) => {
  const out = cloneBoard(board);
  for (const position of positions) out[position.reel][position.row] = makeScatter();
  return out;
};

const getSymbolAt = (board, position) => board[position.reel]?.[position.row]?.name;
const isPaySymbolAt = (board, position) => PAY_SYMBOLS.includes(getSymbolAt(board, position));
const getMagnetPositions = (board) => {
  const positions = [];
  for (let reel = 0; reel < BOARD_REELS; reel += 1) {
    for (let row = 0; row < BOARD_ROWS; row += 1) {
      if (board[reel][row].name === 'MAGNET') positions.push({ reel, row, multiplier: board[reel][row].multiplier ?? 1 });
    }
  }
  return positions;
};
const getScatterPositions = (board) => {
  const positions = [];
  for (let reel = 0; reel < BOARD_REELS; reel += 1) {
    for (let row = 0; row < BOARD_ROWS; row += 1) {
      if (board[reel][row].name === 'SCATTER') positions.push({ reel, row });
    }
  }
  return positions;
};

const getVisiblePaySymbols = (board) => {
  const symbols = [];
  for (let reel = 0; reel < BOARD_REELS; reel += 1) {
    for (let row = 0; row < BOARD_ROWS; row += 1) {
      const name = board[reel][row].name;
      if (PAY_SYMBOLS.includes(name)) symbols.push(name);
    }
  }
  return symbols;
};

const chooseMagnetTargetSymbol = (rng, board) => {
  const visible = getVisiblePaySymbols(board);
  if (!visible.length) return weightedChoice(rng, SYMBOL_WEIGHTS);
  return visible[randInt(rng, visible.length)];
};

const getPayForSize = (symbol, size) => {
  for (const [from, to, value] of PAYTABLE_BANDS[symbol] ?? []) {
    if (size >= from && size <= to) return value;
  }
  const last = PAYTABLE_BANDS[symbol]?.at(-1);
  return last && size >= last[0] ? last[2] : 0;
};

const getComponentsForSymbol = (board, symbol) => {
  const visited = new Set();
  const components = [];
  for (let reel = 0; reel < BOARD_REELS; reel += 1) {
    for (let row = 0; row < BOARD_ROWS; row += 1) {
      const position = { reel, row };
      const key = posKey(position);
      if (visited.has(key) || getSymbolAt(board, position) !== symbol) continue;
      const queue = [position];
      const component = [];
      visited.add(key);
      while (queue.length) {
        const current = queue.shift();
        component.push(current);
        for (const neighbor of getNeighbors(current)) {
          const neighborKey = posKey(neighbor);
          if (visited.has(neighborKey)) continue;
          if (getSymbolAt(board, neighbor) !== symbol) continue;
          visited.add(neighborKey);
          queue.push(neighbor);
        }
      }
      components.push(component);
    }
  }
  return components;
};

const getQualifyingNaturalSeries = (board) => {
  const groups = [];
  for (const symbol of PAY_SYMBOLS) {
    for (const component of getComponentsForSymbol(board, symbol)) {
      if (component.length >= 5) groups.push({ symbol, positions: component });
    }
  }
  return groups;
};

const snapshotOf = (series) => ({
  id: series.id,
  symbol: series.symbol,
  kind: series.kind,
  anchorPositions: clonePositions(series.anchorPositions),
  lockedPositions: clonePositions(series.lockedPositions),
  multiplier: series.multiplier,
  persistent: series.persistent,
});

const seriesKeySet = (positions) => new Set(positions.map(posKey));

const reconcileSeriesComponents = ({ prevSeries, nextComponents, kind, multiplier, persistent, allowNewAnchors }) => {
  const nextSeries = [];
  let newSerial = 1;
  const prevById = new Map(prevSeries.map((series) => [series.id, series]));

  for (const component of nextComponents) {
    const componentKeys = new Set(component.map(posKey));
    const matched = prevSeries.filter((series) => series.lockedPositions.some((position) => componentKeys.has(posKey(position))));
    if (!matched.length && !allowNewAnchors) continue;
    const id = matched.length ? matched.map((series) => series.id).sort()[0] : `${kind}-${newSerial++}`;
    const anchorPositions = uniqPositions([
      ...matched.flatMap((series) => series.anchorPositions),
      ...(matched.length ? [] : component),
    ]);
    nextSeries.push({
      id,
      symbol: matched[0]?.symbol ?? null,
      kind,
      anchorPositions,
      lockedPositions: uniqPositions(component),
      multiplier,
      persistent,
    });
  }

  const assigned = new Set(nextSeries.map((series) => series.id));
  for (const prev of prevSeries) {
    if (assigned.has(prev.id)) continue;
    if (!allowNewAnchors) {
      nextSeries.push({
        ...prev,
        multiplier,
        persistent,
      });
    }
  }

  const decorated = nextSeries
    .map((series, index) => ({
      ...series,
      id: series.id || `${kind}-${index + 1}`,
      symbol: series.symbol ?? prevById.get(series.id)?.symbol,
      multiplier,
      persistent,
    }))
    .filter((series) => series.symbol);

  return decorated.sort((a, b) => a.id.localeCompare(b.id));
};

const didSeriesGrow = (prevSeries, nextSeries) => {
  const prevMap = new Map(prevSeries.map((series) => [series.id, series.lockedPositions.length]));
  if (prevSeries.length !== nextSeries.length) return true;
  return nextSeries.some((series) => (prevMap.get(series.id) ?? 0) !== series.lockedPositions.length);
};

const renderSeriesWins = ({ series, totalMultiplier, kind }) => {
  const wins = [];
  for (const entry of series) {
    const baseX = getPayForSize(entry.symbol, entry.lockedPositions.length);
    if (baseX <= 0) continue;
    const baseAmount = Math.round(baseX * 100);
    wins.push({
      seriesId: entry.id,
      symbol: entry.symbol,
      size: entry.lockedPositions.length,
      positions: clonePositions(entry.lockedPositions),
      amount: baseAmount * totalMultiplier,
      meta: {
        baseAmount,
        totalMultiplier,
        seriesKind: kind,
        anchors: clonePositions(entry.anchorPositions),
      },
    });
  }
  return wins;
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

const paddingPositions = () => Array.from({ length: BOARD_REELS }, (_, index) => index * 2 + 1);
const anticipation = () => Array.from({ length: BOARD_REELS }, () => 0);

const emitReveal = (events, board, gameType) => {
  events.push({
    index: events.length,
    type: 'reveal',
    board: cloneBoard(board),
    paddingPositions: paddingPositions(),
    anticipation: anticipation(),
    gameType,
  });
};

const emitSetTotal = (events, amount) => {
  events.push({ index: events.length, type: 'setTotalWin', amount });
};
const emitSetWin = (events, amount) => {
  events.push({ index: events.length, type: 'setWin', amount, winLevel: winLevelFromAmount(amount) });
};
const emitFinalWin = (events, amount) => {
  events.push({ index: events.length, type: 'finalWin', amount });
};
const emitSeriesUpdate = (events, series, magnetTargetSymbol, totalMultiplier) => {
  events.push({
    index: events.length,
    type: 'clusterSeriesUpdate',
    series: series.map(snapshotOf),
    magnetTargetSymbol,
    totalMultiplier,
  });
};
const emitSeriesResolved = (events, wins) => {
  for (const win of wins) {
    events.push({
      index: events.length,
      type: 'clusterSeriesResolved',
      seriesId: win.seriesId,
      symbol: win.symbol,
      positions: clonePositions(win.positions),
      amount: win.amount,
      multiplier: win.meta.totalMultiplier,
    });
  }
};
const emitWinInfo = (events, wins) => {
  const totalWin = wins.reduce((sum, win) => sum + win.amount, 0);
  events.push({ index: events.length, type: 'winInfo', totalWin, wins });
  return totalWin;
};
const emitMagnetActivated = (events, { seriesId, symbol, positions, multiplier, totalMultiplier, persistent }) => {
  events.push({
    index: events.length,
    type: 'magnetActivated',
    seriesId,
    symbol,
    positions: clonePositions(positions),
    multiplier,
    totalMultiplier,
    persistent,
  });
};
const emitSuperCarry = (events, series, magnetTargetSymbol, totalMultiplier) => {
  events.push({
    index: events.length,
    type: 'superSeriesCarry',
    series: series ? snapshotOf(series) : null,
    magnetTargetSymbol,
    totalMultiplier,
  });
};

const getLockedMap = (series) => {
  const map = new Map();
  for (const entry of series) {
    for (const position of entry.lockedPositions) map.set(posKey(position), entry.symbol);
  }
  return map;
};

const getTargetComponents = ({ board, targetSymbol, prevSeries, allowNewAnchors }) => {
  const components = getComponentsForSymbol(board, targetSymbol);
  if (allowNewAnchors) return components;
  const prevKeys = new Set(prevSeries.flatMap((entry) => entry.lockedPositions.map(posKey)));
  return components.filter((component) => component.some((position) => prevKeys.has(posKey(position))));
};

const createNaturalSeries = (board) => {
  return getQualifyingNaturalSeries(board).map((group, index) => ({
    id: `natural-${index + 1}`,
    symbol: group.symbol,
    kind: 'natural',
    anchorPositions: clonePositions(group.positions),
    lockedPositions: clonePositions(group.positions),
    multiplier: 1,
    persistent: false,
  }));
};

const createMagnetSeriesFromBoard = ({ board, targetSymbol, kind, totalMultiplier, persistent }) => {
  return getComponentsForSymbol(board, targetSymbol).map((component, index) => ({
    id: `${kind}-${index + 1}`,
    symbol: targetSymbol,
    kind,
    anchorPositions: clonePositions(component),
    lockedPositions: clonePositions(component),
    multiplier: totalMultiplier,
    persistent,
  }));
};

const respinBoard = ({ rng, mode, board, lockedMap, targetSymbol = null, targetBoost = 0, magnetRate = 0 }) => {
  const magnetCount = randomMagnetCount(rng, magnetRate);
  const out = cloneBoard(board);
  for (let reel = 0; reel < BOARD_REELS; reel += 1) {
    for (let row = 0; row < BOARD_ROWS; row += 1) {
      const key = `${reel}:${row}`;
      if (lockedMap.has(key)) {
        out[reel][row] = makePaySymbol(lockedMap.get(key));
        continue;
      }
      out[reel][row] = makePaySymbol(randomPaySymbol(rng, targetSymbol, targetBoost));
    }
  }
  const blocked = new Set([...lockedMap.keys()]);
  const magnetPositions = samplePositions(rng, magnetCount, blocked);
  for (const position of magnetPositions) out[position.reel][position.row] = makeMagnet(weightedChoice(rng, MAGNET_MULTIPLIERS));
  return out;
};

const resolveNaturalSequence = ({ rng, board, mode, gameType }) => {
  const events = [];
  let activeSeries = createNaturalSeries(board);
  if (!activeSeries.length) return { events, totalWin: 0, finalBoard: board, series: [] };

  emitSeriesUpdate(events, activeSeries, null, 1);
  let currentBoard = cloneBoard(board);
  while (true) {
    const nextBoard = respinBoard({
      rng,
      mode,
      board: currentBoard,
      lockedMap: getLockedMap(activeSeries),
      targetSymbol: null,
      targetBoost: 0.18,
      magnetRate: 0,
    });
    emitReveal(events, nextBoard, gameType);

    const nextSeriesBySymbol = [];
    for (const symbol of [...new Set(activeSeries.map((entry) => entry.symbol))]) {
      const prevSymbolSeries = activeSeries.filter((entry) => entry.symbol === symbol);
      const nextComponents = getTargetComponents({ board: nextBoard, targetSymbol: symbol, prevSeries: prevSymbolSeries, allowNewAnchors: false });
      const reconciled = reconcileSeriesComponents({
        prevSeries: prevSymbolSeries,
        nextComponents,
        kind: 'natural',
        multiplier: 1,
        persistent: false,
        allowNewAnchors: false,
      });
      nextSeriesBySymbol.push(...reconciled);
    }

    const grew = didSeriesGrow(activeSeries, nextSeriesBySymbol);
    activeSeries = nextSeriesBySymbol;
    currentBoard = nextBoard;
    emitSeriesUpdate(events, activeSeries, null, 1);
    if (!grew) break;
  }

  const wins = renderSeriesWins({ series: activeSeries, totalMultiplier: 1, kind: 'natural' });
  emitSeriesResolved(events, wins);
  const totalWin = wins.length ? emitWinInfo(events, wins) : 0;
  return { events, totalWin, finalBoard: currentBoard, series: activeSeries };
};

const resolveMagnetSequence = ({ rng, board, mode, gameType, targetSymbol = null, persistent = false, carrySeries = [], carryMultiplier = 1 }) => {
  const events = [];
  let currentBoard = cloneBoard(board);
  let seriesTarget = targetSymbol ?? chooseMagnetTargetSymbol(rng, currentBoard);
  let totalMultiplier = carryMultiplier;
  const kind = persistent ? 'super' : 'magnet';
  let activeSeries = carrySeries.length
    ? carrySeries.map((entry) => ({
        ...entry,
        kind,
        multiplier: totalMultiplier,
        persistent,
        anchorPositions: clonePositions(entry.anchorPositions),
        lockedPositions: clonePositions(entry.lockedPositions),
      }))
    : createMagnetSeriesFromBoard({ board: currentBoard, targetSymbol: seriesTarget, kind, totalMultiplier, persistent });

  const initialMagnets = getMagnetPositions(currentBoard);
  const initialMagnetMult = initialMagnets.reduce((acc, magnet) => acc * (magnet.multiplier || 1), 1);
  totalMultiplier *= initialMagnetMult;
  activeSeries = activeSeries.map((entry) => ({ ...entry, multiplier: totalMultiplier }));
  emitMagnetActivated(events, {
    seriesId: activeSeries[0]?.id ?? `${kind}-1`,
    symbol: seriesTarget,
    positions: initialMagnets.length ? initialMagnets : activeSeries[0]?.anchorPositions ?? [],
    multiplier: initialMagnetMult,
    totalMultiplier,
    persistent,
  });
  emitSeriesUpdate(events, activeSeries, seriesTarget, totalMultiplier);

  const nonTargetWins = getQualifyingNaturalSeries(currentBoard)
    .filter((group) => group.symbol !== seriesTarget)
    .map((group, index) => ({
      seriesId: `side-${index + 1}`,
      symbol: group.symbol,
      size: group.positions.length,
      positions: clonePositions(group.positions),
      amount: Math.round(getPayForSize(group.symbol, group.positions.length) * 100),
      meta: {
        baseAmount: Math.round(getPayForSize(group.symbol, group.positions.length) * 100),
        totalMultiplier: 1,
        seriesKind: kind,
        anchors: clonePositions(group.positions),
      },
    }))
    .filter((entry) => entry.amount > 0);

  while (true) {
    const nextBoard = respinBoard({
      rng,
      mode,
      board: currentBoard,
      lockedMap: getLockedMap(activeSeries),
      targetSymbol: seriesTarget,
      targetBoost: MODE_SETTINGS[mode].targetBoost,
      magnetRate: MODE_SETTINGS[mode].magnetRespinRate,
    });
    emitReveal(events, nextBoard, gameType);

    const respinMagnets = getMagnetPositions(nextBoard);
    const respinMagnetMult = respinMagnets.reduce((acc, magnet) => acc * (magnet.multiplier || 1), 1);
    if (respinMagnets.length) {
      totalMultiplier *= respinMagnetMult;
      emitMagnetActivated(events, {
        seriesId: activeSeries[0]?.id ?? `${kind}-1`,
        symbol: seriesTarget,
        positions: respinMagnets,
        multiplier: respinMagnetMult,
        totalMultiplier,
        persistent,
      });
    }

    const allowNewAnchors = respinMagnets.length > 0;
    const nextComponents = getTargetComponents({ board: nextBoard, targetSymbol: seriesTarget, prevSeries: activeSeries, allowNewAnchors });
    const nextSeries = reconcileSeriesComponents({
      prevSeries: activeSeries,
      nextComponents,
      kind,
      multiplier: totalMultiplier,
      persistent,
      allowNewAnchors,
    }).map((entry) => ({ ...entry, symbol: seriesTarget }));

    const grew = didSeriesGrow(activeSeries, nextSeries);
    const multiplierChanged = activeSeries.some((entry) => entry.multiplier !== totalMultiplier) || (activeSeries.length === 0 && nextSeries.length > 0);
    activeSeries = nextSeries;
    currentBoard = nextBoard;
    emitSeriesUpdate(events, activeSeries, seriesTarget, totalMultiplier);
    if (!grew && !multiplierChanged) break;
  }

  const targetWins = renderSeriesWins({ series: activeSeries, totalMultiplier, kind });
  emitSeriesResolved(events, targetWins);
  const allWins = [...nonTargetWins, ...targetWins];
  const totalWin = allWins.length ? emitWinInfo(events, allWins) : 0;
  return {
    events,
    totalWin,
    finalBoard: currentBoard,
    targetSymbol: seriesTarget,
    totalMultiplier,
    series: activeSeries,
  };
};

const createTriggerBoard = ({ rng, superBonus = false }) => {
  const scatterPositions = superBonus
    ? [{ reel: 0, row: 1 }, { reel: 2, row: 2 }, { reel: 4, row: 3 }, { reel: 6, row: 4 }]
    : [{ reel: 0, row: 2 }, { reel: 3, row: 3 }, { reel: 6, row: 1 }];
  return forceScatters(createBoard({ rng, mode: 'BASE' }), scatterPositions);
};

const buildBaseSpin = ({ rng, mode }) => {
  const events = [];
  let totalWin = 0;

  const settings = MODE_SETTINGS[mode];
  const triggerRoll = rng();
  const triggerSuper = triggerRoll < settings.triggerSuperRate;
  const triggerBonus = !triggerSuper && triggerRoll < settings.triggerSuperRate + settings.triggerBonusRate;

  const board = triggerSuper || triggerBonus
    ? createTriggerBoard({ rng, superBonus: triggerSuper })
    : createBoard({
        rng,
        mode,
        scatterCount: randomScatterCount(rng, mode),
        magnetCount: randomMagnetCount(rng, settings.magnetSpinRate),
      });

  emitReveal(events, board, 'basegame');

  const hasMagnet = getMagnetPositions(board).length > 0;
  if (hasMagnet) {
    const resolved = resolveMagnetSequence({ rng, board, mode, gameType: 'basegame' });
    events.push(...resolved.events.map((event) => ({ ...event, index: events.length + event.index })));
    totalWin += resolved.totalWin;
  } else {
    const resolved = resolveNaturalSequence({ rng, board, mode, gameType: 'basegame' });
    events.push(...resolved.events.map((event) => ({ ...event, index: events.length + event.index })));
    totalWin += resolved.totalWin;
  }

  emitSetTotal(events, totalWin);
  if (totalWin > 0) emitSetWin(events, totalWin);

  if (triggerBonus || triggerSuper) {
    const bonus = buildBonusSequence({ rng, mode: triggerSuper ? 'SUPER' : 'BONUS', triggerPositions: getScatterPositions(board), runningTotal: totalWin, fromBaseTrigger: true });
    events.push(...bonus.events.map((event) => ({ ...event, index: events.length + event.index })));
    totalWin = bonus.finalAmount;
  }

  emitFinalWin(events, totalWin);
  return { events, payoutMultiplier: totalWin / 100 };
};

const buildNormalBonusSpin = ({ rng, runningTotal, spinIndex }) => {
  const events = [];
  const board = createBoard({
    rng,
    mode: 'BONUS',
    scatterCount: 0,
    magnetCount: randomMagnetCount(rng, MODE_SETTINGS.BONUS.magnetSpinRate),
  });
  emitReveal(events, board, 'freegame');
  const hasMagnet = getMagnetPositions(board).length > 0;
  const resolved = hasMagnet
    ? resolveMagnetSequence({ rng, board, mode: 'BONUS', gameType: 'freegame' })
    : resolveNaturalSequence({ rng, board, mode: 'BONUS', gameType: 'freegame' });
  events.push(...resolved.events.map((event) => ({ ...event, index: events.length + event.index })));
  const spinWin = resolved.totalWin;
  const nextTotal = clamp(runningTotal + spinWin, 0, MAX_WIN_X * 100);
  emitSetTotal(events, nextTotal);
  if (spinWin > 0) emitSetWin(events, spinWin);
  return { events, nextTotal, spinIndex };
};

const buildSuperBonusSpin = ({ rng, spinIndex, persistentState, runningTotal }) => {
  const events = [];
  emitSuperCarry(events, persistentState.series[0] ?? null, persistentState.targetSymbol, persistentState.totalMultiplier);

  const settings = MODE_SETTINGS.SUPER;
  const magnetCount = spinIndex === 0 ? 1 : randomMagnetCount(rng, settings.magnetSpinRate * (spinIndex === 0 ? 1 : 0.72));
  const board = createBoard({
    rng,
    mode: 'SUPER',
    scatterCount: 0,
    magnetCount,
    lockedMap: getLockedMap(persistentState.series),
    targetSymbol: persistentState.targetSymbol,
    targetBoost: settings.targetBoost,
  });
  emitReveal(events, board, 'superspin');

  const resolved = resolveMagnetSequence({
    rng,
    board,
    mode: 'SUPER',
    gameType: 'superspin',
    targetSymbol: persistentState.targetSymbol,
    persistent: true,
    carrySeries: persistentState.series,
    carryMultiplier: persistentState.totalMultiplier,
  });
  events.push(...resolved.events.map((event) => ({ ...event, index: events.length + event.index })));

  const nextState = {
    targetSymbol: resolved.targetSymbol,
    totalMultiplier: resolved.totalMultiplier,
    series: resolved.series,
  };
  emitSuperCarry(events, nextState.series[0] ?? null, nextState.targetSymbol, nextState.totalMultiplier);
  emitSetTotal(events, runningTotal);
  return { events, nextState };
};

const buildFeatureSequence = ({ rng }) => {
  const events = [];
  let runningTotal = 0;
  events.push({ index: events.length, type: 'freeSpinTrigger', totalFs: FEATURE_FS, positions: [] });
  events.push({ index: events.length, type: 'updateFreeSpin', amount: 0, total: FEATURE_FS });

  const board = createBoard({
    rng,
    mode: 'FEATURE',
    scatterCount: 0,
    magnetCount: 1,
  });
  emitReveal(events, board, 'feature');
  const resolved = resolveMagnetSequence({ rng, board, mode: 'FEATURE', gameType: 'feature' });
  events.push(...resolved.events.map((event) => ({ ...event, index: events.length + event.index })));
  runningTotal += resolved.totalWin;
  emitSetTotal(events, runningTotal);
  if (runningTotal > 0) emitSetWin(events, runningTotal);
  events.push({ index: events.length, type: 'freeSpinEnd', amount: runningTotal, winLevel: winLevelFromAmount(runningTotal) });
  emitFinalWin(events, runningTotal);
  return { events, payoutMultiplier: runningTotal / 100 };
};

function buildBonusSequence({ rng, mode, triggerPositions = [], runningTotal = 0, fromBaseTrigger = false }) {
  const events = [];
  const isSuper = mode === 'SUPER';
  if (!fromBaseTrigger) {
    const triggerBoard = createTriggerBoard({ rng, superBonus: isSuper });
    emitReveal(events, triggerBoard, 'basegame');
  }
  events.push({ index: events.length, type: 'freeSpinTrigger', totalFs: TOTAL_FS, positions: clonePositions(triggerPositions.length ? triggerPositions : (isSuper ? [{ reel: 0, row: 1 }, { reel: 2, row: 2 }, { reel: 4, row: 3 }, { reel: 6, row: 4 }] : [{ reel: 0, row: 2 }, { reel: 3, row: 3 }, { reel: 6, row: 1 }])) });

  if (!isSuper) {
    for (let spinIndex = 0; spinIndex < TOTAL_FS; spinIndex += 1) {
      events.push({ index: events.length, type: 'updateFreeSpin', amount: spinIndex, total: TOTAL_FS });
      const spin = buildNormalBonusSpin({ rng, runningTotal, spinIndex });
      events.push(...spin.events.map((event) => ({ ...event, index: events.length + event.index })));
      runningTotal = spin.nextTotal;
      if (runningTotal >= MAX_WIN_X * 100) break;
    }
    events.push({ index: events.length, type: 'freeSpinEnd', amount: runningTotal, winLevel: winLevelFromAmount(runningTotal) });
    return { events, finalAmount: runningTotal };
  }

  let persistentState = { targetSymbol: null, totalMultiplier: 1, series: [] };
  for (let spinIndex = 0; spinIndex < TOTAL_FS; spinIndex += 1) {
    events.push({ index: events.length, type: 'updateFreeSpin', amount: spinIndex, total: TOTAL_FS });
    const spin = buildSuperBonusSpin({ rng, spinIndex, persistentState, runningTotal });
    events.push(...spin.events.map((event) => ({ ...event, index: events.length + event.index })));
    persistentState = spin.nextState;
  }

  const finalWins = renderSeriesWins({ series: persistentState.series, totalMultiplier: persistentState.totalMultiplier, kind: 'super' });
  emitSeriesResolved(events, finalWins);
  const finalAward = finalWins.length ? emitWinInfo(events, finalWins) : 0;
  runningTotal = clamp(runningTotal + finalAward, 0, MAX_WIN_X * 100);
  emitSetTotal(events, runningTotal);
  if (finalAward > 0) emitSetWin(events, finalAward);
  events.push({ index: events.length, type: 'freeSpinEnd', amount: runningTotal, winLevel: winLevelFromAmount(runningTotal) });
  return { events, finalAmount: runningTotal };
}

export function generateRoundForMode({ mode = 'BASE', seed = Date.now() } = {}) {
  const normalizedMode = String(mode || 'BASE').toUpperCase();
  const rng = mulberry32(typeof seed === 'number' ? seed : Number(seed) || Date.now());

  if (normalizedMode === 'FEATURE') return { seed, ...buildFeatureSequence({ rng }) };
  if (normalizedMode === 'BONUS' || normalizedMode === 'SUPER') {
    const bonus = buildBonusSequence({ rng, mode: normalizedMode, runningTotal: 0, fromBaseTrigger: false });
    emitFinalWin(bonus.events, bonus.finalAmount);
    return { seed, payoutMultiplier: bonus.finalAmount / 100, events: bonus.events };
  }
  return { seed, ...buildBaseSpin({ rng, mode: normalizedMode }) };
}

export const getRoundForMode = (mode = 'BASE', seed = Date.now()) => generateRoundForMode({ mode, seed });
export const getReplayRound = ({ mode = 'BASE', seed = Date.now() } = {}) => generateRoundForMode({ mode, seed });
