import assert from 'node:assert/strict';

import {
  generateRoundForMode,
  getRoundForMode,
  getReplayRound,
} from '../../mock-rgs/math/forest-gang.mjs';

const sum = (values) => values.reduce((acc, value) => acc + value, 0);

const findLast = (events, type) => [...events].reverse().find((event) => event.type === type);

const validateRoundShape = ({ mode, seed, round }) => {
  assert.ok(Array.isArray(round.events), `${mode}:${seed} events array`);
  assert.ok(round.events.length > 0, `${mode}:${seed} non-empty events`);

  const finalWin = findLast(round.events, 'finalWin');
  assert.ok(finalWin, `${mode}:${seed} finalWin exists`);
  assert.ok(finalWin.amount >= 0, `${mode}:${seed} finalWin non-negative`);
  assert.ok(finalWin.amount <= 20000 * 100, `${mode}:${seed} finalWin capped`);
  assert.equal(round.payoutMultiplier, finalWin.amount / 100, `${mode}:${seed} payoutMultiplier matches finalWin`);

  for (let i = 1; i < round.events.length; i++) {
    assert.ok(round.events[i].index > round.events[i - 1].index, `${mode}:${seed} event indexes strictly increasing`);
  }

  const allTotals = round.events.filter((event) => event.type === 'setTotalWin');
  for (const event of allTotals) {
    assert.ok(event.amount >= 0, `${mode}:${seed} total win non-negative`);
    assert.ok(event.amount <= 20000 * 100, `${mode}:${seed} total win capped`);
  }

  if (mode !== 'BASE') {
    assert.ok(round.events.some((event) => event.type === 'freeSpinTrigger'), `${mode}:${seed} freeSpinTrigger`);
    assert.ok(round.events.some((event) => event.type === 'bonusSymbolSelected'), `${mode}:${seed} bonusSymbolSelected`);
    assert.ok(round.events.some((event) => event.type === 'freeSpinEnd'), `${mode}:${seed} freeSpinEnd`);

    const fsUpdates = round.events.filter((event) => event.type === 'updateFreeSpin');
    assert.equal(fsUpdates.length, 10, `${mode}:${seed} ten free spin updates`);
    assert.deepEqual(fsUpdates.map((event) => event.amount), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], `${mode}:${seed} free spin counter sequence`);
  }
};

const verifyDeterminism = () => {
  for (const mode of ['BASE', 'BONUS', 'SUPER']) {
    for (const seed of [1, 2, 3, 11, 97, 777, 4096]) {
      const a = generateRoundForMode({ mode, seed });
      const b = getRoundForMode(mode, seed);
      const c = getReplayRound({ mode, seed });
      assert.deepEqual(a, b, `${mode}:${seed} getRoundForMode deterministic`);
      assert.deepEqual(a, c, `${mode}:${seed} replay deterministic`);
      validateRoundShape({ mode, seed, round: a });
    }
  }
};

const verifyBaseMetrics = (spins = 50000) => {
  let total = 0;
  let hits = 0;
  let triggers = 0;
  let baseOnly = 0;

  for (let seed = 1; seed <= spins; seed++) {
    const round = generateRoundForMode({ mode: 'BASE', seed });
    total += round.payoutMultiplier;
    if (round.payoutMultiplier > 0) hits += 1;
    if (round.events.some((event) => event.type === 'freeSpinTrigger')) triggers += 1;
    const firstTotal = round.events.find((event) => event.type === 'setTotalWin')?.amount ?? 0;
    baseOnly += firstTotal / 100;
  }

  const rtp = total / spins;
  const hitRate = hits / spins;
  const triggerRate = triggers / spins;
  const baseContribution = baseOnly / spins;

  assert.ok(rtp > 0.94 && rtp < 0.98, `BASE rtp in band: ${rtp}`);
  assert.ok(hitRate > 0.22 && hitRate < 0.26, `BASE hit rate in band: ${hitRate}`);
  assert.ok(triggerRate > 0.0048 && triggerRate < 0.0062, `BASE trigger rate in band: ${triggerRate}`);
  assert.ok(baseContribution > 0.54 && baseContribution < 0.58, `BASE contribution in band: ${baseContribution}`);

  return { rtp, hitRate, triggerRate, baseContribution };
};

const verifyBuyMetrics = (spins = 30000) => {
  const sampleMode = (mode, cost) => {
    const payouts = [];
    for (let seed = 1; seed <= spins; seed++) {
      payouts.push(generateRoundForMode({ mode, seed }).payoutMultiplier);
    }
    const total = sum(payouts);
    const rtp = total / (spins * cost);
    assert.ok(rtp > 0.93 && rtp < 0.99, `${mode} rtp in band: ${rtp}`);
    return rtp;
  };

  return {
    bonusRtp: sampleMode('BONUS', 100),
    superRtp: sampleMode('SUPER', 400),
  };
};

verifyDeterminism();
const baseMetrics = verifyBaseMetrics();
const buyMetrics = verifyBuyMetrics();

console.log(
  JSON.stringify(
    {
      ok: true,
      baseMetrics,
      buyMetrics,
    },
    null,
    2,
  ),
);
