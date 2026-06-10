import { generateRoundForMode } from '../../mock-rgs/math/forest-gang.mjs';

const spins = Number(process.argv[2] || 100000);

const simMode = (mode, cost) => {
  let total = 0;
  let hits = 0;
  let triggers = 0;
  let max = 0;
  let baseOnly = 0;

  for (let i = 1; i <= spins; i++) {
    const round = generateRoundForMode({ mode, seed: i });
    total += round.payoutMultiplier;
    if (round.payoutMultiplier > 0) hits += 1;
    max = Math.max(max, round.payoutMultiplier);

    if (mode === 'BASE') {
      const trigger = round.events.some((event) => event.type === 'freeSpinTrigger');
      if (trigger) triggers += 1;
      const firstTotal = round.events.find((event) => event.type === 'setTotalWin')?.amount ?? 0;
      baseOnly += firstTotal / 100;
    }
  }

  return {
    mode,
    spins,
    avgPayoutX: +(total / spins).toFixed(4),
    rtp: +(total / (spins * cost)).toFixed(6),
    hitRate: +(hits / spins).toFixed(6),
    triggerRate: mode === 'BASE' ? +(triggers / spins).toFixed(6) : undefined,
    avgBaseOnlyX: mode === 'BASE' ? +(baseOnly / spins).toFixed(4) : undefined,
    maxWinX: max,
  };
};

const report = {
  BASE: simMode('BASE', 1),
  BONUS: simMode('BONUS', 100),
  SUPER: simMode('SUPER', 400),
};

console.log(JSON.stringify(report, null, 2));
