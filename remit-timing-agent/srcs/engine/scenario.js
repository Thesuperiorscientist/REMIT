
import { generatePaths, percentile } from './monteCarlo.js';
import { getConfig, getPair, getLiveRate, computeReceive, updateConfig } from './rateEngine.js';
import { OBJECTIVES, compareStrategies, defaultStrategies, narrateRecommendation } from './strategies.js';

export const SHOCKS = {
  none:        { id: 'none',        label: 'No shock',                                     ratePct: 0,   feeAddPct: 0,   delayDays: 0 },
  adverseRate: { id: 'adverseRate', label: 'Rate moves against you (−5%)',                  ratePct: -5,  feeAddPct: 0,   delayDays: 0 },
  worseRate:   { id: 'worseRate',   label: 'Rate crashes (−10%)',                          ratePct: -10, feeAddPct: 0,   delayDays: 0 },
  feeSpike:    { id: 'feeSpike',    label: 'Fees rise (+1.5 percentage points)',           ratePct: 0,   feeAddPct: 1.5, delayDays: 0 },
  delay:       { id: 'delay',       label: 'Transfer delayed (+2 days)',                    ratePct: 0,   feeAddPct: 0,   delayDays: 2 },
  combined:    { id: 'combined',    label: 'Rate −5%, fees +1.5pp, delay +2 days',          ratePct: -5,  feeAddPct: 1.5, delayDays: 2 },
};

export const STRATEGIES = [
  { id: 'now',     label: 'Send now',     type: 'now',   waitDays: 0 },
  { id: 'wait3',   label: 'Wait 3 days',  type: 'wait',  waitDays: 3 },
  { id: 'wait7',   label: 'Wait 7 days',  type: 'wait',  waitDays: 7 },
  { id: 'split60', label: 'Split 60/40',  type: 'split', splitRatio: 0.6, waitDays: 5 },
];

export const DEFAULT_PROFILE = {
  senderBalance: 3000,  
  senderEssential: 800, 
  senderReserve: 1000,  
  recipientNeed: 0,    
};

/**
 * Run ONE scenario for ONE strategy. Powers What-If, Shield, Crash Button, Judge Mode.
 *
 * @param {Object} p
 * @param {{from:string,to:string}} p.pair
 * @param {number} p.baseRate
 * @param {number} p.amount
 * @param {Object} p.strategy          // entry from STRATEGIES
 * @param {number} p.deadlineDays
 * @param {Object} p.profile           // { senderBalance, senderEssential, senderReserve, recipientNeed }
 * @param {Object} [p.shock]           // entry from SHOCKS
 * @param {number} [p.simulations]
 * @param {number} [p.feeOverridePct]  // 1.5 = 1.5%
 * @param {number} [p.volatilityOverridePct] // 0.8 = 0.8%
 * @returns {Object}
 */
export function runScenario({
  pair,
  baseRate,
  amount,
  strategy,
  deadlineDays,
  profile,
  shock = SHOCKS.none,
  simulations,
  feeOverridePct,
  volatilityOverridePct,
}) {
  const cfg = getConfig();
  const sims = simulations || cfg.defaultSimulations;
  const effShock = shock || SHOCKS.none;

  
  const effRate = baseRate * (1 + (effShock.ratePct || 0) / 100);
  const baseFeePct = Number.isFinite(feeOverridePct) ? feeOverridePct / 100 : cfg.transferFeePct;
  const effFeePct  = baseFeePct + (effShock.feeAddPct || 0) / 100;
  const baseVol    = Number.isFinite(volatilityOverridePct) ? volatilityOverridePct / 100 : cfg.dailyVolatility;
  const effWait    = Math.max(0, (strategy.waitDays || 0) + (effShock.delayDays || 0));
  const deadlineMet = effWait <= deadlineDays;
  const sendable   = Math.max(0, Math.min(amount, Number(profile.senderBalance) || 0));

  const failure = (reason, extra = {}) => ({
    strategy, shock: effShock, pair, amount: sendable, deadlineDays,
    feePct: effFeePct, effRate: null, deadlineMet,
    error: reason,
    recipient: { feasible: false, probability: 0, reason },
    sender: { feasible: false, remaining: null, reason },
    payout: null,
    ...extra,
  });

  if (!Number.isFinite(effRate) || effRate <= 0) {
    return failure('Rate unavailable.');
  }
  if (sendable <= 0) {
    return failure('Amount is zero after applying the sender balance.');
  }
  if (effFeePct < 0 || effFeePct >= 1) {
    return failure('Effective fee is outside the valid range (0–99%).');
  }

  let sim;
  try {
    if (strategy.type === 'now') {
      sim = simulate({ amount: sendable, waitDays: 0, baseRate: effRate, feePct: effFeePct, vol: baseVol, sims });
    } else if (strategy.type === 'wait') {
      sim = simulate({ amount: sendable, waitDays: effWait, baseRate: effRate, feePct: effFeePct, vol: baseVol, sims });
    } else if (strategy.type === 'split') {
      const ratio = clamp(strategy.splitRatio ?? 0.5, 0.1, 0.9);
      const a = simulate({ amount: sendable * ratio,       waitDays: 0,      baseRate: effRate, feePct: effFeePct, vol: baseVol, sims });
      const b = simulate({ amount: sendable * (1 - ratio), waitDays: effWait, baseRate: effRate, feePct: effFeePct, vol: baseVol, sims });
      sim = combine(a, b);
    } else {
      return failure(`Unknown strategy type: ${strategy.type}`);
    }
  } catch (err) {
    return failure(`Simulation failed: ${String(err.message || err).slice(0, 120)}`);
  }

  if (sim.error) return failure(sim.error);
  if (!sim.samples || sim.samples.length === 0) {
    return failure('Simulation produced no samples.');
  }

  const need = Number(profile.recipientNeed) || 0;
  let recipProb = 1;
  let recipientFeasible;
  let recipientReason;

  if (need <= 0) {
    recipientFeasible = deadlineMet; 
    recipientReason = deadlineMet
      ? 'No recipient minimum set, and the deadline is met.'
      : `No recipient minimum set, but the strategy would land after the ${deadlineDays}-day deadline.`;
  } else {
    const hits = sim.samples.filter((v) => v >= need).length;
    recipProb = hits / sim.samples.length;
    const deadlineOK = deadlineMet;
    recipientFeasible = deadlineOK && recipProb >= 0.5;
    recipientReason = !deadlineOK
      ? `Strategy would land after the ${deadlineDays}-day deadline.`
      : recipProb >= 0.5
        ? `Payout meets the recipient minimum on ${(recipProb * 100).toFixed(1)}% of simulated paths.`
        : `Payout meets the recipient minimum on only ${(recipProb * 100).toFixed(1)}% of simulated paths (needs ≥50%).`;
  }

  const remaining   = (Number(profile.senderBalance) || 0) - sendable;
  const senderFloor = (Number(profile.senderEssential) || 0) + (Number(profile.senderReserve) || 0);
  const senderFeasible = remaining >= senderFloor;
  const senderReason = senderFeasible
    ? `Leaves ${remaining.toFixed(0)} ${pair.from}, which covers essentials (${Number(profile.senderEssential||0).toFixed(0)}) plus reserve (${Number(profile.senderReserve||0).toFixed(0)}).`
    : `Leaves ${remaining.toFixed(0)} ${pair.from} after sending, below essentials (${Number(profile.senderEssential||0).toFixed(0)}) + reserve (${Number(profile.senderReserve||0).toFixed(0)}) = ${senderFloor.toFixed(0)}.`;

  return {
    strategy,
    shock: effShock,
    pair,
    amount: sendable,
    deadlineDays,
    feePct: effFeePct,
    effRate,
    deadlineMet,
    payout: {
      p10: sim.p10,
      p50: sim.p50,
      p90: sim.p90,
      mean: sim.mean,
      isDeterministic: sim.isDeterministic,
      samples: sim.samples,
    },
    recipient: { feasible: recipientFeasible, probability: recipProb, reason: recipientReason },
    sender:    { feasible: senderFeasible,    remaining,               reason: senderReason },
  };
}

export function runComparison({
  pair, baseRate, amount, strategies, deadlineDays, profile, shock,
  feeOverridePct, volatilityOverridePct,
}) {
  return strategies.map((s) =>
    runScenario({
      pair, baseRate, amount, strategy: s, deadlineDays, profile, shock,
      feeOverridePct, volatilityOverridePct,
    }),
  );
}


export function runCrashTest({
  pair, baseRate, amount, strategies, deadlineDays, profile,
  feeOverridePct, volatilityOverridePct,
}) {
  const shocks = [SHOCKS.adverseRate, SHOCKS.feeSpike, SHOCKS.delay, SHOCKS.combined];
  return shocks.map((shock) => {
    const rows = runComparison({
      pair, baseRate, amount, strategies, deadlineDays, profile, shock,
      feeOverridePct, volatilityOverridePct,
    });
    const anyFeasible = rows.some(
      (r) => !r.error && r.recipient.feasible && r.sender.feasible,
    );
    return { shock, rows, anyFeasible };
  });
}

export function runObjectiveComparison({ amount, deadlineDays, minPayout, objective, baseRate }) {
  const params = {
    amount,
    deadlineDays,
    minPayout: minPayout > 0 ? minPayout : null,
    objective: objective || OBJECTIVES.MAX_EXPECTED,
    riskCapPct: 5,
  };
  const strategies = defaultStrategies(deadlineDays);
  const comparison = compareStrategies({ params, strategies, baseRate });
  return {
    comparison,
    narrative: narrateRecommendation({
      results: comparison.results,
      recommended: comparison.recommended,
      reason: comparison.reason,
      params,
    }),
    params,
  };
}


function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }


function simulate({ amount, waitDays, baseRate, feePct, vol, sims }) {
  if (!Number.isFinite(baseRate) || baseRate <= 0) return { error: 'RATE_UNAVAILABLE' };
  if (!Number.isFinite(vol) || vol < 0) return { error: 'INVALID_VOLATILITY' };
  const horizonDays = Math.max(waitDays, 1);
  const paths = generatePaths({
    startRate: baseRate,
    horizonDays,
    dailyVolatility: vol,
    simulations: sims,
  });
  const outcomes = paths
    .map((path) => amount * (1 - feePct) * path[waitDays])
    .sort((a, b) => a - b);
  const mean = outcomes.reduce((s, v) => s + v, 0) / outcomes.length;
  return {
    isDeterministic: waitDays === 0,
    p10: percentile(outcomes, 10),
    p50: percentile(outcomes, 50),
    p90: percentile(outcomes, 90),
    mean,
    samples: outcomes,
  };
}

function combine(a, b) {
  const n = Math.min(a.samples.length, b.samples.length);
  const combined = new Array(n);
  for (let i = 0; i < n; i++) combined[i] = a.samples[i] + b.samples[i];
  combined.sort((x, y) => x - y);
  const mean = combined.reduce((s, v) => s + v, 0) / n;
  return {
    isDeterministic: false,
    p10: percentile(combined, 10),
    p50: percentile(combined, 50),
    p90: percentile(combined, 90),
    mean,
    samples: combined,
  };
}

export { getPair, getLiveRate, computeReceive, updateConfig };