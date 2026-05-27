const lineWin = (symbol, positions, win, lineIndex = 1, globalMult = 1) => ({
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

const makeReveal = (index, board, gameType, paddingPositions = [1, 3, 5, 7, 9]) => ({
  index,
  type: 'reveal',
  board,
  paddingPositions,
  gameType,
  anticipation: [0, 0, 0, 0, 0],
});

const baseRounds = [
  {
    payoutMultiplier: 3,
    events: [
      makeReveal(0, [
        [{ name: 'K' }, { name: 'FOX' }, { name: 'A' }, { name: 'J' }, { name: 'Q' }, { name: 'T' }],
        [{ name: 'A' }, { name: 'FOX' }, { name: 'K' }, { name: 'WOLF' }, { name: 'J' }, { name: 'Q' }],
        [{ name: 'Q' }, { name: 'FOX' }, { name: 'A' }, { name: 'BEAR' }, { name: 'K' }, { name: 'J' }],
        [{ name: 'J' }, { name: 'RABBIT' }, { name: 'Q' }, { name: 'A' }, { name: 'WOLF' }, { name: 'K' }],
        [{ name: 'T' }, { name: 'SQUIRREL' }, { name: 'J' }, { name: 'Q' }, { name: 'A' }, { name: 'K' }],
      ], 'basegame'),
      { index: 1, type: 'winInfo', totalWin: 300, wins: [lineWin('FOX', [{ reel: 0, row: 1 }, { reel: 1, row: 1 }, { reel: 2, row: 1 }], 300)] },
      { index: 2, type: 'setWin', amount: 300, winLevel: 3 },
      { index: 3, type: 'setTotalWin', amount: 300 },
      { index: 4, type: 'finalWin', amount: 300 },
    ],
  },
  {
    payoutMultiplier: 5,
    events: [
      makeReveal(0, [
        [{ name: 'A' }, { name: 'Q' }, { name: 'BEAR' }, { name: 'J' }, { name: 'T' }, { name: 'A' }],
        [{ name: 'Q' }, { name: 'K' }, { name: 'BEAR' }, { name: 'T' }, { name: 'J' }, { name: 'Q' }],
        [{ name: 'J' }, { name: 'A' }, { name: 'BEAR' }, { name: 'K' }, { name: 'T' }, { name: 'J' }],
        [{ name: 'K' }, { name: 'T' }, { name: 'RABBIT' }, { name: 'A' }, { name: 'Q' }, { name: 'K' }],
        [{ name: 'T' }, { name: 'J' }, { name: 'SQUIRREL' }, { name: 'Q' }, { name: 'A' }, { name: 'T' }],
      ], 'basegame', [2, 4, 6, 8, 10]),
      { index: 1, type: 'winInfo', totalWin: 500, wins: [lineWin('BEAR', [{ reel: 0, row: 2 }, { reel: 1, row: 2 }, { reel: 2, row: 2 }], 500, 6)] },
      { index: 2, type: 'setWin', amount: 500, winLevel: 4 },
      { index: 3, type: 'setTotalWin', amount: 500 },
      { index: 4, type: 'finalWin', amount: 500 },
    ],
  },
  {
    payoutMultiplier: 0,
    events: [
      makeReveal(0, [
        [{ name: 'A' }, { name: 'Q' }, { name: 'K' }, { name: 'J' }, { name: 'T' }, { name: 'A' }],
        [{ name: 'Q' }, { name: 'K' }, { name: 'A' }, { name: 'T' }, { name: 'J' }, { name: 'Q' }],
        [{ name: 'J' }, { name: 'A' }, { name: 'Q' }, { name: 'K' }, { name: 'T' }, { name: 'J' }],
        [{ name: 'K' }, { name: 'T' }, { name: 'J' }, { name: 'A' }, { name: 'Q' }, { name: 'K' }],
        [{ name: 'T' }, { name: 'J' }, { name: 'K' }, { name: 'Q' }, { name: 'A' }, { name: 'T' }],
      ], 'basegame', [2, 4, 6, 8, 10]),
      { index: 1, type: 'setTotalWin', amount: 0 },
      { index: 2, type: 'finalWin', amount: 0 },
    ],
  },
];

const freegameBoards = [
  [
    [{ name: 'A' }, { name: 'FOX' }, { name: 'FOX' }, { name: 'J' }, { name: 'FOX' }, { name: 'Q' }],
    [{ name: 'K' }, { name: 'FOX' }, { name: 'A' }, { name: 'RABBIT' }, { name: 'WOLF' }, { name: 'J' }],
    [{ name: 'Q' }, { name: 'FOX' }, { name: 'A' }, { name: 'BEAR' }, { name: 'K' }, { name: 'T' }],
    [{ name: 'J' }, { name: 'FOX' }, { name: 'Q' }, { name: 'A' }, { name: 'WOLF' }, { name: 'K' }],
    [{ name: 'T' }, { name: 'FOX' }, { name: 'J' }, { name: 'Q' }, { name: 'A' }, { name: 'K' }],
  ],
  [
    [{ name: 'A' }, { name: 'FOX' }, { name: 'J' }, { name: 'Q' }, { name: 'K' }, { name: 'T' }],
    [{ name: 'Q' }, { name: 'FOX' }, { name: 'RABBIT' }, { name: 'A' }, { name: 'J' }, { name: 'K' }],
    [{ name: 'K' }, { name: 'FOX' }, { name: 'BEAR' }, { name: 'Q' }, { name: 'T' }, { name: 'A' }],
    [{ name: 'J' }, { name: 'FOX' }, { name: 'WOLF' }, { name: 'K' }, { name: 'A' }, { name: 'Q' }],
    [{ name: 'T' }, { name: 'SQUIRREL' }, { name: 'J' }, { name: 'A' }, { name: 'Q' }, { name: 'K' }],
  ],
  [
    [{ name: 'A' }, { name: 'RABBIT' }, { name: 'J' }, { name: 'Q' }, { name: 'FOX' }, { name: 'T' }],
    [{ name: 'Q' }, { name: 'FOX' }, { name: 'K' }, { name: 'A' }, { name: 'J' }, { name: 'K' }],
    [{ name: 'K' }, { name: 'FOX' }, { name: 'A' }, { name: 'Q' }, { name: 'T' }, { name: 'A' }],
    [{ name: 'J' }, { name: 'FOX' }, { name: 'WOLF' }, { name: 'K' }, { name: 'A' }, { name: 'Q' }],
    [{ name: 'T' }, { name: 'FOX' }, { name: 'J' }, { name: 'A' }, { name: 'Q' }, { name: 'K' }],
  ],
  [
    [{ name: 'A' }, { name: 'Q' }, { name: 'K' }, { name: 'J' }, { name: 'T' }, { name: 'A' }],
    [{ name: 'Q' }, { name: 'K' }, { name: 'A' }, { name: 'T' }, { name: 'J' }, { name: 'Q' }],
    [{ name: 'J' }, { name: 'A' }, { name: 'Q' }, { name: 'K' }, { name: 'T' }, { name: 'J' }],
    [{ name: 'K' }, { name: 'T' }, { name: 'J' }, { name: 'A' }, { name: 'Q' }, { name: 'K' }],
    [{ name: 'T' }, { name: 'J' }, { name: 'K' }, { name: 'Q' }, { name: 'A' }, { name: 'T' }],
  ],
];

const superspinBoards = [
  [
    [{ name: 'A' }, { name: 'WOLF' }, { name: 'WOLF' }, { name: 'FOX' }, { name: 'WOLF' }, { name: 'Q' }],
    [{ name: 'K' }, { name: 'WOLF' }, { name: 'A' }, { name: 'RABBIT' }, { name: 'WOLF' }, { name: 'J' }],
    [{ name: 'Q' }, { name: 'WOLF' }, { name: 'A' }, { name: 'BEAR' }, { name: 'K' }, { name: 'T' }],
    [{ name: 'J' }, { name: 'WOLF' }, { name: 'Q' }, { name: 'A' }, { name: 'WOLF' }, { name: 'K' }],
    [{ name: 'T' }, { name: 'WOLF' }, { name: 'J' }, { name: 'Q' }, { name: 'A' }, { name: 'K' }],
  ],
  [
    [{ name: 'A' }, { name: 'WOLF' }, { name: 'J' }, { name: 'Q' }, { name: 'K' }, { name: 'T' }],
    [{ name: 'Q' }, { name: 'WOLF' }, { name: 'RABBIT' }, { name: 'A' }, { name: 'J' }, { name: 'K' }],
    [{ name: 'K' }, { name: 'WOLF' }, { name: 'BEAR' }, { name: 'Q' }, { name: 'T' }, { name: 'A' }],
    [{ name: 'J' }, { name: 'WOLF' }, { name: 'FOX' }, { name: 'K' }, { name: 'A' }, { name: 'Q' }],
    [{ name: 'T' }, { name: 'SQUIRREL' }, { name: 'J' }, { name: 'A' }, { name: 'Q' }, { name: 'K' }],
  ],
  [
    [{ name: 'A' }, { name: 'RABBIT' }, { name: 'J' }, { name: 'Q' }, { name: 'WOLF' }, { name: 'T' }],
    [{ name: 'Q' }, { name: 'WOLF' }, { name: 'K' }, { name: 'A' }, { name: 'J' }, { name: 'K' }],
    [{ name: 'K' }, { name: 'WOLF' }, { name: 'A' }, { name: 'Q' }, { name: 'T' }, { name: 'A' }],
    [{ name: 'J' }, { name: 'WOLF' }, { name: 'FOX' }, { name: 'K' }, { name: 'A' }, { name: 'Q' }],
    [{ name: 'T' }, { name: 'WOLF' }, { name: 'J' }, { name: 'A' }, { name: 'Q' }, { name: 'K' }],
  ],
  [
    [{ name: 'A' }, { name: 'Q' }, { name: 'K' }, { name: 'J' }, { name: 'T' }, { name: 'A' }],
    [{ name: 'Q' }, { name: 'K' }, { name: 'A' }, { name: 'T' }, { name: 'J' }, { name: 'Q' }],
    [{ name: 'J' }, { name: 'A' }, { name: 'Q' }, { name: 'K' }, { name: 'T' }, { name: 'J' }],
    [{ name: 'K' }, { name: 'T' }, { name: 'J' }, { name: 'A' }, { name: 'Q' }, { name: 'K' }],
    [{ name: 'T' }, { name: 'J' }, { name: 'K' }, { name: 'Q' }, { name: 'A' }, { name: 'T' }],
  ],
];

function buildBonusEvents({ symbol, mode, totalWin, multiplierType = null }) {
  const isSuper = mode === 'superspin';
  const boards = isSuper ? superspinBoards : freegameBoards;
  const events = [
    { index: 0, type: 'freeSpinTrigger', totalFs: 10, positions: isSuper ? [{ reel: 0, row: 1 }, { reel: 1, row: 2 }, { reel: 2, row: 3 }, { reel: 4, row: 4 }] : [{ reel: 0, row: 1 }, { reel: 1, row: 2 }, { reel: 2, row: 3 }] },
    { index: 1, type: 'bonusSymbolSelected', symbol, mode },
  ];

  let idx = 2;
  let runningTotal = 0;
  const winningSpinMap = isSuper
    ? {
        0: { win: 3000, reels: [0,1,2,3,4], positions: [{ reel:0,row:1},{ reel:1,row:1},{ reel:2,row:1},{ reel:3,row:1},{ reel:4,row:1 }], mults: [1,2,4,8,16], changedReels: [1,2,3,4], globalMult: 16, level: 8, finalAmount: 12000 },
        4: { win: 1500, reels: [1,2,3], positions: [{ reel:1,row:1},{ reel:2,row:1},{ reel:3,row:1 }], mults: [1,4,8,16,16], changedReels: [1,2], globalMult: 8, level: 5, finalAmount: 3000 },
        8: { win: 750, reels: [0,2,4], positions: [{ reel:0,row:4},{ reel:2,row:1},{ reel:4,row:4 }], mults: [2,4,16,16,32], changedReels: [0,2,4], globalMult: 16, level: 4, finalAmount: 2250 },
      }
    : {
        0: { win: 1500, reels: [0,1,2,3,4], positions: [{ reel:0,row:1},{ reel:1,row:1},{ reel:2,row:1},{ reel:3,row:1},{ reel:4,row:1 }], mult: 3, level: 6, finalAmount: 4500 },
        3: { win: 500, reels: [1,2,3], positions: [{ reel:1,row:1},{ reel:2,row:1},{ reel:3,row:1 }], mult: 2, level: 4, finalAmount: 1000 },
        7: { win: 600, reels: [1,2,3,4], positions: [{ reel:1,row:1},{ reel:2,row:1},{ reel:3,row:1 },{ reel:4,row:1 }], mult: 5, level: 5, finalAmount: 3000 },
      };

  for (let spin = 0; spin < 10; spin++) {
    events.push({ index: idx++, type: 'updateFreeSpin', amount: spin, total: 10 });
    events.push(makeReveal(idx++, boards[spin % boards.length], mode, spin % 2 === 0 ? [1,3,5,7,9] : [2,4,6,8,10]));

    const winData = winningSpinMap[spin];
    if (winData) {
      events.push({ index: idx++, type: 'expandedSymbolReveal', symbol, reels: winData.reels, positions: winData.positions });
      if (isSuper) {
        events.push({ index: idx++, type: 'updateReelMultipliers', multipliers: winData.mults, changedReels: winData.changedReels });
        events.push({ index: idx++, type: 'winInfo', totalWin: winData.win, wins: [lineWin(symbol, winData.positions, winData.win, 1, winData.globalMult)] });
        events.push({ index: idx++, type: 'setWin', amount: winData.finalAmount, winLevel: winData.level });
        runningTotal += winData.finalAmount;
      } else {
        events.push({ index: idx++, type: 'winInfo', totalWin: winData.win, wins: [lineWin(symbol, winData.positions, winData.win)] });
        events.push({ index: idx++, type: 'applyTempMultiplier', multiplier: winData.mult, winBefore: winData.win, winAfter: winData.finalAmount });
        events.push({ index: idx++, type: 'setWin', amount: winData.finalAmount, winLevel: winData.level });
        runningTotal += winData.finalAmount;
      }
    }

    events.push({ index: idx++, type: 'setTotalWin', amount: runningTotal });
  }

  events.push({ index: idx++, type: 'freeSpinEnd', amount: runningTotal, winLevel: isSuper ? 8 : 6 });
  events.push({ index: idx++, type: 'finalWin', amount: runningTotal });
  return { payoutMultiplier: totalWin, events };
}

const bonusRounds = [buildBonusEvents({ symbol: 'FOX', mode: 'freegame', totalWin: 85 })];
const superRounds = [buildBonusEvents({ symbol: 'WOLF', mode: 'superspin', totalWin: 172.5 })];

const randomPick = (arr) => arr[Math.floor(Math.random() * arr.length)];

export const getRoundForMode = (mode = 'BASE') => {
  if (mode === 'BONUS') return structuredClone(randomPick(bonusRounds));
  if (mode === 'SUPER') return structuredClone(randomPick(superRounds));
  return structuredClone(randomPick(baseRounds));
};

export const getReplayRound = ({ mode = 'BASE' } = {}) => getRoundForMode(mode);
