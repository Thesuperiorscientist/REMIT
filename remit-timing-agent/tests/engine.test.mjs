import test from 'node:test';
import assert from 'node:assert/strict';
import { freshEnv } from './helpers.mjs';
import {
  simulateRemittance, compareOptions, targetRateProbability, getLiveRate, computeReceive,
} from '../srcs/engine/rateEngine.js';
import { evaluateTarget, suggestTargets } from '../srcs/engine/targets.js';
import { compareStrategies, defaultStrategies, OBJECTIVES } from '../srcs/engine/strategies.js';
import { projectTwin } from '../srcs/engine/twin.js';

const BASE = 500;

test('send now is deterministic and applies the fee', () => {
  freshEnv();
  const r = simulateRemittance({ amountMYR: 1000, waitDays: 0, baseRate: BASE });
  assert.equal(r.mmk.p10, r.mmk.p90);
  assert.equal(Math.round(r.mmk.p50), Math.round(computeReceive(1000, BASE)));
});

test('waiting keeps the mean (zero drift) but widens the spread', () => {
  freshEnv();
  const now = simulateRemittance({ amountMYR: 1000, waitDays: 0, baseRate: BASE, simulations: 20000 });
  const w7 = simulateRemittance({ amountMYR: 1000, waitDays: 7, baseRate: BASE, simulations: 20000 });
  assert.ok(Math.abs(w7.mmk.mean - now.mmk.mean) / now.mmk.mean < 0.005, 'means within 0.5%');
  assert.ok(w7.mmk.p90 - w7.mmk.p10 > 0, 'spread must be positive');
});

test('seeded simulation is reproducible', () => {
  freshEnv();
  const a = simulateRemittance({ amountMYR: 1000, waitDays: 7, baseRate: BASE });
  freshEnv();
  const b = simulateRemittance({ amountMYR: 1000, waitDays: 7, baseRate: BASE });
  assert.equal(a.mmk.p50, b.mmk.p50);
});

test('rate unavailable is reported, not thrown', () => {
  freshEnv();
  const r = simulateRemittance({ amountMYR: 1000, waitDays: 3, baseRate: null });
  assert.equal(r.error, 'RATE_UNAVAILABLE');
});

test('target probability is 0..1 and decreases with a harder target', () => {
  freshEnv();
  const easy = targetRateProbability({ amountMYR: 1000, targetRate: BASE * 1.005, horizonDays: 7, baseRate: BASE });
  const hard = targetRateProbability({ amountMYR: 1000, targetRate: BASE * 1.05, horizonDays: 7, baseRate: BASE });
  assert.ok(easy.probability > hard.probability);
  assert.ok(easy.probability >= 0 && easy.probability <= 1);
});

test('REGRESSION: evaluateTarget works and flags a target below current', () => {
  freshEnv();
  const below = evaluateTarget({ amountMYR: 1000, targetRate: BASE * 0.99, baseRate: BASE, horizonDays: 7 });
  assert.equal(below.isBelowCurrent, true);
  assert.ok(Number.isFinite(below.probability));
  assert.match(below.advice, /already meets your target/);
  const above = evaluateTarget({ amountMYR: 1000, targetRate: BASE * 1.02, baseRate: BASE, horizonDays: 7 });
  assert.equal(above.isBelowCurrent, false);
  assert.ok(Number.isFinite(above.gapPct));
});

test('suggestTargets returns finite values', () => {
  freshEnv();
  for (const s of suggestTargets({ amountMYR: 1000, baseRate: BASE })) {
    assert.ok(Number.isFinite(s.targetRate) && Number.isFinite(s.probability));
  }
});

test('reference rate lookup supports direct, inverse and triangulated pairs', async () => {
  freshEnv();
  assert.ok((await getLiveRate('CNY', 'MMK')).rate > 0);
  assert.ok((await getLiveRate('MMK', 'CNY')).rate > 0);
  assert.ok((await getLiveRate('GBP', 'INR')).rate > 0);
  assert.equal((await getLiveRate('USD', 'USD')).rate, 1);
});

test('strategy planner: MIN_RISK with a min payout prefers sending now when it already meets it', () => {
  freshEnv();
  const strategies = defaultStrategies(20);
  const minPayout = computeReceive(1000, BASE) * 0.99;
  const out = compareStrategies({
    params: { amount: 1000, deadlineDays: 20, minPayout, objective: OBJECTIVES.MIN_RISK },
    strategies, baseRate: BASE,
  });
  assert.equal(out.recommended.strategy.type, 'now');
  assert.equal(out.recommended.probMeetMin, 1);
});

test('strategy planner: wait strategies longer than the deadline are clipped to it', () => {
  freshEnv();
  const out = compareStrategies({
    params: { amount: 1000, deadlineDays: 3, objective: OBJECTIVES.MAX_EXPECTED },
    strategies: defaultStrategies(3), baseRate: BASE,
  });
  for (const r of out.results) assert.ok((r.strategy.waitDays ?? 0) <= 3);
});

test('twin projection is bounded and risk level is consistent', () => {
  freshEnv();
  const t = projectTwin({ income: 3000, costs: 1800, savings: 1000, remit: 500, baseRate: BASE, simulations: 500 });
  assert.equal(t.monthlyNet, 700);
  assert.ok(t.simulation.ranOutProbability >= 0 && t.simulation.ranOutProbability <= 1);
  assert.equal(t.riskLevel, 'low');
});

test('REGRESSION: max_expected does not chase simulation noise (ties go to the lowest-risk option)', () => {
  freshEnv();
  const out = compareStrategies({
    params: { amount: 1000, deadlineDays: 20, objective: OBJECTIVES.MAX_EXPECTED },
    strategies: defaultStrategies(20), baseRate: BASE,
  });
  assert.equal(out.recommended.strategy.type, 'now');
  assert.match(out.reason, /statistically equal/);
});
