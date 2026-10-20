
import { generatePaths, percentile } from './monteCarlo.js';
import { simulateRemittance, getConfig } from './rateEngine.js';

// Expected payouts closer than this are treated as equal (simulation noise is ~0.1%).
export const TIE_TOLERANCE = 0.0015;


export const OBJECTIVES = {
  MAX_EXPECTED: 'max_expected',           // maximize mean payout
  MIN_RISK: 'min_risk',                   // minimize probability of missing requirement
  MAX_WITH_DOWNSIDE_CAP: 'max_with_cap',  // maximize mean, cap downside at threshold
};


export const STRATEGY_TYPES = {
  NOW: 'now',
  WAIT: 'wait',
  SPLIT: 'split',
};

/**
 * Evaluate a single strategy.
 * @param {Object} opts
 * @param {Object} opts.params - { amount, deadlineDays, minPayout, objective, riskCapPct }
 * @param {Object} opts.strategy - { type, waitDays?, splitRatio? }
 * @param {number} opts.baseRate
 * @returns {Object} strategy result
 */
export function evaluateStrategy({ params, strategy, baseRate }) {
  const { amount, deadlineDays, minPayout } = params;
  const cfg = getConfig();

  if (!baseRate || baseRate <= 0) {
    return {
      strategy,
      error: 'RATE_UNAVAILABLE',
    };
  }

  
  if (strategy.type === STRATEGY_TYPES.NOW) {
    const result = simulateRemittance({
      amountMYR: amount,
      waitDays: 0,
      baseRate,
    });
    return buildStrategyResult({
      strategy,
      result,
      deadlineDays,
      minPayout,
      sampleCount: cfg.defaultSimulations,
    });
  }

  
  if (strategy.type === STRATEGY_TYPES.WAIT) {
    const waitDays = Math.min(strategy.waitDays ?? 0, deadlineDays);
    const result = simulateRemittance({
      amountMYR: amount,
      waitDays,
      baseRate,
    });
    return buildStrategyResult({
      strategy: { ...strategy, waitDays },
      result,
      deadlineDays,
      minPayout,
      sampleCount: cfg.defaultSimulations,
    });
  }


  if (strategy.type === STRATEGY_TYPES.SPLIT) {
    const ratio = clamp(strategy.splitRatio ?? 0.5, 0.1, 0.9);
    const waitDays = Math.min(strategy.waitDays ?? 15, deadlineDays);

    const firstAmount = amount * ratio;
    const secondAmount = amount * (1 - ratio);

    
    const firstResult = simulateRemittance({
      amountMYR: firstAmount,
      waitDays: 0,
      baseRate,
    });

    
    const secondResult = simulateRemittance({
      amountMYR: secondAmount,
      waitDays,
      baseRate,
    });

    
    const sims = Math.min(firstResult.samples.length, secondResult.samples.length);
    const combined = [];
    for (let i = 0; i < sims; i++) {
      combined.push(firstResult.samples[i] + secondResult.samples[i]);
    }
    combined.sort((a, b) => a - b);

    const mean = combined.reduce((a, b) => a + b, 0) / combined.length;
    const combinedResult = {
      amountMYR: amount,
      waitDays,
      splitRatio: ratio,
      firstAmount,
      secondAmount,
      isDeterministic: false,
      feePct: cfg.transferFeePct,
      feeMYR: amount * cfg.transferFeePct,
      baseRate,
      mmk: {
        p10: percentile(combined, 10),
        p50: percentile(combined, 50),
        p90: percentile(combined, 90),
        mean,
        min: combined[0],
        max: combined[combined.length - 1],
      },
      samples: combined,
    };

    return buildStrategyResult({
      strategy: { ...strategy, splitRatio: ratio, waitDays },
      result: combinedResult,
      deadlineDays,
      minPayout,
      sampleCount: sims,
    });
  }

  return { strategy, error: 'UNKNOWN_STRATEGY' };
}


function buildStrategyResult({ strategy, result, deadlineDays, minPayout, sampleCount }) {
  const samples = result.samples;
  const deadlineMet = (strategy.waitDays ?? 0) <= deadlineDays;

  // Probability of meeting the recipient's minimum payout
  let probMeetMin = null;
  if (minPayout && minPayout > 0) {
    const hits = samples.filter((s) => s >= minPayout).length;
    probMeetMin = hits / samples.length;
  }

  return {
    strategy,
    deadlineMet,
    expected: result.mmk.mean,
    median: result.mmk.p50,
    p10: result.mmk.p10,
    p90: result.mmk.p90,
    min: result.mmk.min,
    max: result.mmk.max,
    probMeetMin,
    samples,
    isDeterministic: result.isDeterministic,
    feeMYR: result.feeMYR,

    // Downside risk = expected shortfall below p10
    downsideMMK: result.mmk.mean - result.mmk.p10,
  };
}

/**
 * Compare multiple strategies under an explicit objective.
 * @param {Object} opts
 * @param {Object} opts.params - { amount, deadlineDays, minPayout, objective, riskCapPct }
 * @param {Array} opts.strategies - list of { type, waitDays?, splitRatio? }
 * @param {number} opts.baseRate
 * @returns {Object} { results, recommended, reason }
 */
export function compareStrategies({ params, strategies, baseRate }) {
  const results = strategies.map((s) =>
    evaluateStrategy({ params, strategy: s, baseRate })
  );

  // Filter out failed strategies
  const valid = results.filter((r) => !r.error && r.deadlineMet);

  if (valid.length === 0) {
    return {
      results,
      recommended: null,
      reason: 'No valid strategy meets the deadline.',
    };
  }

  const objective = params.objective || OBJECTIVES.MAX_EXPECTED;

  let recommended = null;
  let reason = '';

  if (objective === OBJECTIVES.MAX_EXPECTED) {
    const best = valid.reduce((a, b) => (a.expected > b.expected ? a : b));
    
    const tied = valid.filter((r) => (best.expected - r.expected) / best.expected <= TIE_TOLERANCE);
    recommended = tied.reduce((a, b) => {
      if (b.p10 !== a.p10) return b.p10 > a.p10 ? b : a;
      return (b.strategy.waitDays ?? 0) < (a.strategy.waitDays ?? 0) ? b : a;
    });
    reason = tied.length > 1
      ? `Expected payouts are statistically equal (within ${(TIE_TOLERANCE * 100).toFixed(2)}%), so the lowest-risk option wins (best 10th percentile ${Math.round(recommended.p10).toLocaleString()}).`
      : `Highest expected payout (${Math.round(recommended.expected).toLocaleString()}).`;
  } else if (objective === OBJECTIVES.MIN_RISK) {
    if (params.minPayout && params.minPayout > 0) {
      recommended = valid.reduce((a, b) =>
        (a.probMeetMin > b.probMeetMin ? a : b)
      );
      reason = `Highest probability of meeting the recipient's requirement (${(recommended.probMeetMin * 100).toFixed(1)}%).`;
    } else {
      recommended = valid.reduce((a, b) => (a.p10 > b.p10 ? a : b));
      reason = `Best worst-case payout (${Math.round(recommended.p10).toLocaleString()} at 10th percentile).`;
    }
  } else if (objective === OBJECTIVES.MAX_WITH_DOWNSIDE_CAP) {
    const cap = (params.riskCapPct || 5) / 100;
    
    const withinCap = valid.filter((r) => r.downsideMMK / r.expected <= cap);
    if (withinCap.length > 0) {
      recommended = withinCap.reduce((a, b) => (a.expected > b.expected ? a : b));
      reason = `Highest expected payout within ${(cap * 100).toFixed(1)}% downside cap.`;
    } else {
      recommended = valid.reduce((a, b) => (a.p10 > b.p10 ? a : b));
      reason = `No strategy within cap; choosing best worst-case.`;
    }
  }

  return { results, recommended, reason };
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}


export function defaultStrategies(deadlineDays) {
  const strategies = [
    { type: STRATEGY_TYPES.NOW, label: 'Send now' },
  ];

  if (deadlineDays >= 3) {
    strategies.push({
      type: STRATEGY_TYPES.WAIT,
      waitDays: Math.min(3, deadlineDays),
      label: `Wait 3 days`,
    });
  }
  if (deadlineDays >= 7) {
    strategies.push({
      type: STRATEGY_TYPES.WAIT,
      waitDays: Math.min(7, deadlineDays),
      label: `Wait 7 days`,
    });
  }
  if (deadlineDays >= 15) {
    strategies.push({
      type: STRATEGY_TYPES.WAIT,
      waitDays: Math.min(15, deadlineDays),
      label: `Wait 15 days`,
    });
  }
  if (deadlineDays >= 10) {
    strategies.push({
      type: STRATEGY_TYPES.SPLIT,
      splitRatio: 0.6,
      waitDays: Math.min(Math.floor(deadlineDays / 2), 15),
      label: `Split 60/40`,
    });
  }
  if (deadlineDays >= 20) {
    strategies.push({
      type: STRATEGY_TYPES.SPLIT,
      splitRatio: 0.5,
      waitDays: Math.min(Math.floor(deadlineDays / 2), 20),
      label: `Split 50/50`,
    });
  }

  return strategies;
}


export function narrateRecommendation({ results, recommended, reason, params }) {
  if (!recommended) return 'No valid strategy meets the constraints.';

  const lines = [];
  lines.push(`RECOMMENDATION: ${recommended.strategy.label || recommended.strategy.type}`);
  lines.push('');
  lines.push(reason);
  lines.push('');

  for (const r of results) {
    if (r.error) {
      lines.push(`  ${r.strategy.label || r.strategy.type}: rate unavailable`);
      continue;
    }
    const flag = r === recommended ? ' ⭐' : '';
    const probStr = r.probMeetMin !== null
      ? ` | P(meet): ${(r.probMeetMin * 100).toFixed(1)}%`
      : '';
    lines.push(
      `  ${r.strategy.label || r.strategy.type}${flag}: ~${Math.round(r.expected).toLocaleString()} MMK${probStr}`
    );
  }

  return lines.join('\n');
}