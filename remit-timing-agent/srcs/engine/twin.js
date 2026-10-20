
import { percentile, random, gaussianRandom } from './monteCarlo.js';
import { getPair } from './rateEngine.js';

const MONTHS = 12;

const MONTHLY_RATE_VOLATILITY = 0.02;

/**
 * Build a 12-month projection.
 * @param {Object} profile
 * @param {number} profile.income      - monthly income (source currency)
 * @param {number} profile.costs       - monthly fixed costs (source currency)
 * @param {number} profile.savings     - current savings (source currency)
 * @param {number} profile.remit       - monthly remittance (source currency)
 * @param {number} profile.baseRate    - current source -> destination rate
 * @param {number} [profile.simulations]
 * @param {Object} [profile.pair]      - optional { from, to } override
 * @returns {Object}
 */
export function projectTwin(profile) {
  const {
    income,
    costs,
    savings,
    remit,
    baseRate,
    simulations = 1000,
  } = profile;

  const pair = profile.pair || getPair();
  const monthlyNet = income - costs - remit;

  
  const deterministic = [];
  let bal = savings;
  for (let m = 1; m <= MONTHS; m++) {
    bal += monthlyNet;
    deterministic.push({
      month: m,
      balance: bal,
      totalSent: remit * m,
    });
  }

  
  const balances = [];
  const totalSentDest = [];
  let ranOut = 0;

  for (let s = 0; s < simulations; s++) {
    let b = savings;
    let sentDest = 0;
    let rate = baseRate;

    const shockMonth = random() < 0.15 ? Math.floor(random() * MONTHS) + 1 : -1;

    for (let m = 1; m <= MONTHS; m++) {
      const rShock = gaussian();
      rate = rate * (1 + MONTHLY_RATE_VOLATILITY * rShock);

      const monthCosts = (m === shockMonth) ? costs * 1.10 : costs;

      b += income - monthCosts - remit;
      sentDest += remit * (1 - 0.015) * rate;
    }

    if (b < 0) ranOut++;
    balances.push(b);
    totalSentDest.push(sentDest);
  }

  balances.sort((a, b) => a - b);
  totalSentDest.sort((a, b) => a - b);

  const p10Bal = percentile(balances, 10);
  const p50Bal = percentile(balances, 50);
  const p90Bal = percentile(balances, 90);

  const p10Dest = percentile(totalSentDest, 10);
  const p50Dest = percentile(totalSentDest, 50);
  const p90Dest = percentile(totalSentDest, 90);

  const bestMonth = pickBestMonth(baseRate);

  return {
    profile: { ...profile, pair },
    pair,
    monthlyNet,
    deterministic,
    simulation: {
      simulations,
      ranOutProbability: ranOut / simulations,
      balance: { p10: p10Bal, p50: p50Bal, p90: p90Bal },
      totalSentDest: { p10: p10Dest, p50: p50Dest, p90: p90Dest },
    },
    bestMonth,
    riskLevel: ranOut / simulations > 0.2 ? 'high' : ranOut / simulations > 0.05 ? 'medium' : 'low',
  };
}


function pickBestMonth(baseRate) {
  const sims = 500;
  const monthAvg = new Array(MONTHS + 1).fill(0);

  for (let s = 0; s < sims; s++) {
    let rate = baseRate;
    for (let m = 1; m <= MONTHS; m++) {
      rate = rate * (1 + MONTHLY_RATE_VOLATILITY * gaussian());
      monthAvg[m] += rate;
    }
  }

  let bestM = 1;
  let bestVal = monthAvg[1] / sims;
  for (let m = 2; m <= MONTHS; m++) {
    const avg = monthAvg[m] / sims;
    if (avg > bestVal) { bestVal = avg; bestM = m; }
  }

  return {
    month: bestM,
    avgRate: bestVal,
    improvementPct: ((bestVal - baseRate) / baseRate) * 100,
    isIllustrative: true,
    note: 'Illustrative only. With a zero-drift model, no month has a higher expected rate.',
  };
}

function gaussian() {
  return gaussianRandom();
}


export function narrateTwin(result) {
  const { profile, monthlyNet, simulation, bestMonth, riskLevel, pair } = result;
  const from = pair?.from || 'source';
  const to = pair?.to || 'destination';
  const lines = [];

  lines.push(`Monthly net (after costs + remittance): ${monthlyNet.toFixed(0)} ${from}`);
  lines.push(`Starting savings: ${profile.savings.toFixed(0)} ${from}`);

  if (monthlyNet < 0) {
    lines.push(`WARNING: Your monthly outflow exceeds income. You will deplete savings over time.`);
  } else {
    lines.push(`You are saving ${monthlyNet.toFixed(0)} ${from} per month on average.`);
  }

  lines.push('');
  lines.push(`After 12 months (median):`);
  lines.push(`  Savings: ~${Math.round(simulation.balance.p50).toLocaleString()} ${from}`);
  lines.push(`  10–90% range: ${Math.round(simulation.balance.p10).toLocaleString()} – ${Math.round(simulation.balance.p90).toLocaleString()} ${from}`);
  lines.push('');
  lines.push(`Total ${to} sent home (median): ~${Math.round(simulation.totalSentDest.p50).toLocaleString()} ${to}`);
  lines.push('');
  lines.push(`Risk of running out of money: ${(simulation.ranOutProbability * 100).toFixed(1)}% (${riskLevel})`);
  lines.push(
    `Illustrative month with highest simulated average rate: Month ${bestMonth.month} (+${bestMonth.improvementPct.toFixed(2)}%). ` +
    `This is NOT a forecast: with a zero-drift model, no month has a higher expected rate.`
  );

  return lines.join('\n');
}