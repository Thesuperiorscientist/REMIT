
import { targetRateProbability } from './rateEngine.js';

/**
 * Evaluate a user's target rate goal.
 * @param {Object} opts
 * @param {number} opts.amountMYR   amount in source currency
 * @param {number} opts.targetRate  desired rate (destination per source)
 * @param {number} opts.baseRate    current rate (REQUIRED)
 * @param {number} opts.horizonDays
 */
export function evaluateTarget({ amountMYR, targetRate, baseRate, horizonDays = 7 }) {
  const result = targetRateProbability({
    amountMYR,
    targetRate,
    horizonDays,
    baseRate,
  });

  if (result.error) {
    return { ...result, isBelowCurrent: false, isUnrealistic: false, advice: 'Rate unavailable, cannot evaluate the target.' };
  }

  const isBelowCurrent = targetRate <= baseRate;
  const isUnrealistic = Math.abs(result.gapPct) > 5;
  const advice = buildAdvice(result, isBelowCurrent, isUnrealistic);

  return { ...result, isBelowCurrent, isUnrealistic, advice };
}

function buildAdvice(result, isBelowCurrent, isUnrealistic) {
  const p = result.probability;
  const lines = [];

  if (isBelowCurrent) {
    lines.push(`The current rate (${result.currentRate.toFixed(2)}) already meets your target.`);
    lines.push(`Sending now locks it in. Waiting does not raise the expected payout, it only adds risk.`);
    return lines.join('\n');
  }

  if (isUnrealistic) {
    lines.push(`Your target is ${result.gapPct.toFixed(2)}% above the current rate.`);
    lines.push(`That is a large move for a ${result.horizonDays}-day window. Probability: ${(p * 100).toFixed(1)}%.`);
    lines.push(`Consider extending the horizon or lowering the target.`);
    return lines.join('\n');
  }

  if (p >= 0.75) {
    lines.push(`High chance (${(p * 100).toFixed(1)}%) of hitting your target within ${result.horizonDays} days.`);
    if (result.avgDaysToHit) {
      lines.push(`On average, the rate reaches the target in ${result.avgDaysToHit.toFixed(1)} days.`);
    }
    lines.push(`Waiting is reasonable if you are not in a hurry.`);
  } else if (p >= 0.4) {
    lines.push(`Moderate chance (${(p * 100).toFixed(1)}%) of hitting your target.`);
    lines.push(`It is a coin-flip scenario. Consider splitting the transfer.`);
  } else {
    lines.push(`Low chance (${(p * 100).toFixed(1)}%) of hitting your target within ${result.horizonDays} days.`);
    lines.push(`Waiting may not pay off. Sending sooner is safer.`);
  }

  return lines.join('\n');
}


export function suggestTargets({ amountMYR, baseRate, horizonDays = 7 }) {
  const suggestions = [];
  for (const pct of [0.5, 1, 2, 3]) {
    const targetRate = baseRate * (1 + pct / 100);
    const prob = targetRateProbability({ amountMYR, targetRate, horizonDays, baseRate }).probability;
    suggestions.push({ targetRate, gapPct: pct, probability: prob });
  }
  return suggestions;
}
