
import { generatePaths, percentile } from './monteCarlo.js';
import { DEFAULT_PAIR } from './currencies.js';

const REFERENCE_RATES = {
  'MYR:MMK': { rate: 514.517, source: 'wise.com', date: '2026-10-15' },
  'CNY:MMK': { rate: 314.066, source: 'wise.com', date: '2026-10-16' },
  'MYR:IDR': { rate: 3300.00, source: 'reference', date: '2026-10-16' },
  'MYR:VND': { rate: 5400.00, source: 'reference', date: '2026-10-16' },
  'MYR:THB': { rate: 7.60, source: 'reference', date: '2026-10-16' },
  'MYR:PHP': { rate: 12.80, source: 'reference', date: '2026-10-16' },
  'MYR:INR': { rate: 18.50, source: 'reference', date: '2026-10-16' },
  'MYR:BDT': { rate: 25.50, source: 'reference', date: '2026-10-16' },
  'MYR:NPR': { rate: 29.60, source: 'reference', date: '2026-10-16' },
  'MYR:LKR': { rate: 68.00, source: 'reference', date: '2026-10-16' },
  'MYR:CNY': { rate: 1.63, source: 'reference', date: '2026-10-16' },
  'MYR:USD': { rate: 0.23, source: 'reference', date: '2026-10-16' },
  'MYR:SGD': { rate: 0.30, source: 'reference', date: '2026-10-16' },
  'MYR:AUD': { rate: 0.35, source: 'reference', date: '2026-10-16' },
  'MYR:GBP': { rate: 0.17, source: 'reference', date: '2026-10-16' },
  'MYR:EUR': { rate: 0.21, source: 'reference', date: '2026-10-16' },
  'CNY:VND': { rate: 3450.00, source: 'reference', date: '2026-10-16' },
  'CNY:IDR': { rate: 2140.00, source: 'reference', date: '2026-10-16' },
  'CNY:THB': { rate: 4.85, source: 'reference', date: '2026-10-16' },
  'CNY:PHP': { rate: 7.85, source: 'reference', date: '2026-10-16' },
  'CNY:INR': { rate: 11.50, source: 'reference', date: '2026-10-16' },
  'CNY:BDT': { rate: 15.80, source: 'reference', date: '2026-10-16' },
  'CNY:NPR': { rate: 18.30, source: 'reference', date: '2026-10-16' },
  'CNY:LKR': { rate: 42.50, source: 'reference', date: '2026-10-16' },
  'CNY:USD': { rate: 0.14, source: 'reference', date: '2026-10-16' },
  'CNY:KRW': { rate: 187.00, source: 'reference', date: '2026-10-16' },
  'CNY:JPY': { rate: 20.50, source: 'reference', date: '2026-10-16' },
  'CNY:SGD': { rate: 0.185, source: 'reference', date: '2026-10-16' },
  'CNY:AUD': { rate: 0.213, source: 'reference', date: '2026-10-16' },
  'CNY:GBP': { rate: 0.109, source: 'reference', date: '2026-10-16' },
  'CNY:EUR': { rate: 0.128, source: 'reference', date: '2026-10-16' },
  'CNY:CAD': { rate: 0.189, source: 'reference', date: '2026-10-16' },
  'USD:MMK': { rate: 2100.00, source: 'reference', date: '2026-10-16' },
  'USD:IDR': { rate: 15500.00, source: 'reference', date: '2026-10-16' },
  'USD:VND': { rate: 24800.00, source: 'reference', date: '2026-10-16' },
  'USD:THB': { rate: 35.50, source: 'reference', date: '2026-10-16' },
  'USD:PHP': { rate: 56.50, source: 'reference', date: '2026-10-16' },
  'USD:INR': { rate: 83.50, source: 'reference', date: '2026-10-16' },
  'USD:CNY': { rate: 7.25, source: 'reference', date: '2026-10-16' },
  'USD:BDT': { rate: 110.00, source: 'reference', date: '2026-10-16' },
  'USD:NPR': { rate: 133.00, source: 'reference', date: '2026-10-16' },
  'USD:LKR': { rate: 305.00, source: 'reference', date: '2026-10-16' },
  'USD:KRW': { rate: 1340.00, source: 'reference', date: '2026-10-16' },
  'USD:JPY': { rate: 149.00, source: 'reference', date: '2026-10-16' },
  'USD:SGD': { rate: 1.34, source: 'reference', date: '2026-10-16' },
  'USD:AUD': { rate: 1.52, source: 'reference', date: '2026-10-16' },
  'USD:GBP': { rate: 0.79, source: 'reference', date: '2026-10-16' },
  'USD:EUR': { rate: 0.92, source: 'reference', date: '2026-10-16' },
  'USD:CAD': { rate: 1.36, source: 'reference', date: '2026-10-16' },
  'USD:NGN': { rate: 1550.00, source: 'reference', date: '2026-10-16' },
  'USD:KES': { rate: 129.00, source: 'reference', date: '2026-10-16' },
  'USD:ZAR': { rate: 18.50, source: 'reference', date: '2026-10-16' },
  'USD:BRL': { rate: 5.05, source: 'reference', date: '2026-10-16' },
  'USD:MXN': { rate: 17.20, source: 'reference', date: '2026-10-16' },
  'USD:TRY': { rate: 34.20, source: 'reference', date: '2026-10-16' },
  'SGD:MMK': { rate: 1550.00, source: 'reference', date: '2026-10-16' },
  'SGD:MYR': { rate: 3.30, source: 'reference', date: '2026-10-16' },
  'AUD:IDR': { rate: 10100.00, source: 'reference', date: '2026-10-16' },
  'AUD:VND': { rate: 16100.00, source: 'reference', date: '2026-10-16' },
  'AUD:INR': { rate: 54.00, source: 'reference', date: '2026-10-16' },
  'AUD:CNY': { rate: 4.70, source: 'reference', date: '2026-10-16' },
  'AUD:MMK': { rate: 1386.00, source: 'reference', date: '2026-10-16' },
  'GBP:INR': { rate: 105.00, source: 'reference', date: '2026-10-16' },
  'GBP:CNY': { rate: 9.15, source: 'reference', date: '2026-10-16' },
  'GBP:NGN': { rate: 1950.00, source: 'reference', date: '2026-10-16' },
  'GBP:MMK': { rate: 2650.00, source: 'reference', date: '2026-10-16' },
  'EUR:INR': { rate: 89.00, source: 'reference', date: '2026-10-16' },
  'EUR:CNY': { rate: 7.80, source: 'reference', date: '2026-10-16' },
  'EUR:MMK': { rate: 2280.00, source: 'reference', date: '2026-10-16' },
  'CAD:INR': { rate: 61.00, source: 'reference', date: '2026-10-16' },
  'CAD:CNY': { rate: 5.30, source: 'reference', date: '2026-10-16' },
  'CAD:MMK': { rate: 1540.00, source: 'reference', date: '2026-10-16' },
  'INR:USD': { rate: 0.0120, source: 'reference', date: '2026-10-16' },
  'INR:GBP': { rate: 0.0095, source: 'reference', date: '2026-10-16' },
  'INR:AUD': { rate: 0.0185, source: 'reference', date: '2026-10-16' },
  'INR:CAD': { rate: 0.0164, source: 'reference', date: '2026-10-16' },
  'INR:CNY': { rate: 0.087, source: 'reference', date: '2026-10-16' },
};

const USD = 'USD';

function findDirectRate(from, to) {
  if (from === to) return { rate: 1, source: 'identity', date: null };
  return REFERENCE_RATES[`${from}:${to}`] || null;
}

function findInverseRate(from, to) {
  const inv = REFERENCE_RATES[`${to}:${from}`];
  if (inv && inv.rate > 0) return { rate: 1 / inv.rate, source: 'inverse', date: inv.date, refSource: inv.source };
  return null;
}

function triangulateViaUSD(from, to) {
  if (from === USD || to === USD) return null;
  const legA = REFERENCE_RATES[`${from}:${USD}`];
  const legB = REFERENCE_RATES[`${USD}:${to}`];
  if (legA && legB) return { rate: legA.rate * legB.rate, source: 'triangulated', date: legA.date, refSource: 'via USD' };
  const invA = REFERENCE_RATES[`${USD}:${from}`];
  const invB = REFERENCE_RATES[`${to}:${USD}`];
  if (invA && invB && invA.rate > 0 && invB.rate > 0)
    return { rate: (1 / invA.rate) * (1 / invB.rate), source: 'triangulated', date: invA.date, refSource: 'via USD (inverse)' };
  if (legA && invB && invB.rate > 0)
    return { rate: legA.rate * (1 / invB.rate), source: 'triangulated', date: legA.date, refSource: 'via USD' };
  if (invA && legB && invA.rate > 0)
    return { rate: (1 / invA.rate) * legB.rate, source: 'triangulated', date: legB.date, refSource: 'via USD' };
  return null;
}

function lookupReferenceRate(from, to) {
  if (from === to) return { rate: 1, source: 'identity', date: null };
  return findDirectRate(from, to) || findInverseRate(from, to) || triangulateViaUSD(from, to) || null;
}

const DEFAULT_CONFIG = {
  dailyVolatility: 0.008,
  transferFeePct: 0.015,
  defaultSimulations: 1000,
  defaultHorizonDays: 7,
  pair: { from: DEFAULT_PAIR.from, to: DEFAULT_PAIR.to },
};

let config = { ...DEFAULT_CONFIG };
export function getConfig() { return { ...config }; }
export function updateConfig(partial) { config = { ...config, ...partial }; }
export function setPair({ from, to }) {
  config.pair = { from: from.toUpperCase(), to: to.toUpperCase() };
  cachedRate = null;
  cachedRateTimestamp = 0;
}
export function getPair() { return { ...config.pair }; }

const CORS_PROXIES = [
  (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url) => `https://corsproxy.io/?url=${encodeURIComponent(url)}`,
];
const FETCH_TIMEOUT_MS = 5000;
const RATE_CACHE_MS = 5 * 60 * 1000;

let cachedRate = null;
let cachedRateTimestamp = 0;
let fetchInFlight = null;
let liveFetchEnabled = true;

export function setLiveFetchEnabled(enabled) {
  liveFetchEnabled = !!enabled;
  cachedRate = null;
  cachedRateTimestamp = 0;
}

const MAX_LIVE_DEVIATION = 0.25;
function isPlausibleLiveRate(rate, from, to) {
  const ref = lookupReferenceRate(from, to);
  if (!ref || !ref.rate) return true;
  return Math.abs(rate - ref.rate) / ref.rate <= MAX_LIVE_DEVIATION;
}
function buildWiseUrl(from, to) {
  return `https://wise.com/zh-cn/currency-converter/${from.toLowerCase()}-to-${to.toLowerCase()}-rate`;
}
function fetchWithTimeout(url, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timeout')), ms);
    fetch(url).then((res) => { clearTimeout(timer); resolve(res); }).catch((err) => { clearTimeout(timer); reject(err); });
  });
}
function extractRate(html, from, to) {
  const f = from.toUpperCase(), t = to.toUpperCase();
  const patterns = [
    new RegExp(`1\\s*${f}\\s*=\\s*([\\d.,]+)\\s*${t}`, 'i'),
    new RegExp(`${f}\\s*=\\s*([\\d.,]+)\\s*${t}`, 'i'),
    /"rate":\s*([\d.]+)/,
    /"exchangeRate":\s*([\d.]+)/,
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m && m[1]) {
      const v = parseFloat(m[1].replace(/,/g, ''));
      if (!isNaN(v) && v > 0) return v;
    }
  }
  return null;
}
async function tryProxy(proxyFn, url) {
  const proxied = proxyFn(url);
  const res = await fetchWithTimeout(proxied, FETCH_TIMEOUT_MS);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.text();
}

function isE2E() {
  try { return typeof window !== 'undefined' && window.__E2E__ === true; } catch { return false; }
}

export async function fetchWiseRate(from = config.pair.from, to = config.pair.to) {
  const now = Date.now();
  if (cachedRate && now - cachedRateTimestamp < RATE_CACHE_MS
      && cachedRate.pair.from === from && cachedRate.pair.to === to) {
    return cachedRate;
  }
  if (fetchInFlight) return fetchInFlight;

  fetchInFlight = (async () => {
    // In Playwright E2E, skip the live scrape entirely so the test is deterministic.
    if (!isE2E()) {
      const url = buildWiseUrl(from, to);
      for (let i = 0; liveFetchEnabled && i < CORS_PROXIES.length; i++) {
        try {
          const html = await tryProxy(CORS_PROXIES[i], url);
          const rate = extractRate(html, from, to);
          if (rate && !isPlausibleLiveRate(rate, from, to)) {
            console.warn(`[rateEngine] rejected implausible live rate ${rate} for ${from}->${to}`);
            continue;
          }
          if (rate) {
            cachedRate = { rate, source: 'wise', pair: { from, to }, fetchedAt: new Date().toISOString() };
            cachedRateTimestamp = now;
            return cachedRate;
          }
        } catch (err) {
          console.warn(`[rateEngine] proxy ${i} failed: ${err.message}`);
        }
      }
    }

    const ref = lookupReferenceRate(from, to);
    if (ref) {
      cachedRate = {
        rate: ref.rate,
        source: ref.source === 'identity' ? 'identity' : 'reference',
        method: ref.source,
        pair: { from, to },
        fetchedAt: ref.date,
        refSource: ref.refSource || 'reference',
      };
      cachedRateTimestamp = now;
      return cachedRate;
    }
    return null;
  })();

  try { return await fetchInFlight; } finally { fetchInFlight = null; }
}

export async function getLiveRate(from = config.pair.from, to = config.pair.to) {
  const result = await fetchWiseRate(from, to);
  if (result) return result;
  return { rate: null, source: 'unavailable', pair: { from, to }, fetchedAt: null };
}

export function computeReceive(amountFrom, rate) {
  return amountFrom * (1 - config.transferFeePct) * rate;
}

export function simulateRemittance({ amountMYR, waitDays = 0, simulations = config.defaultSimulations, baseRate = null }) {
  if (baseRate === null || !isFinite(baseRate) || baseRate <= 0) {
    return { error: 'RATE_UNAVAILABLE', amountMYR, waitDays, mmk: null, samples: [], isDeterministic: waitDays === 0 };
  }
  const horizonDays = Math.max(waitDays, 1);
  const paths = generatePaths({ startRate: baseRate, horizonDays, dailyVolatility: config.dailyVolatility, simulations });
  const outcomes = paths.map((path) => computeReceive(amountMYR, path[waitDays])).sort((a, b) => a - b);
  const mean = outcomes.reduce((a, b) => a + b, 0) / outcomes.length;
  const feeMYR = amountMYR * config.transferFeePct;
  const expectedRate = mean / (amountMYR * (1 - config.transferFeePct));
  return {
    amountMYR, waitDays, feePct: config.transferFeePct, feeMYR, baseRate, expectedRate,
    isDeterministic: waitDays === 0,
    mmk: { p10: percentile(outcomes, 10), p50: percentile(outcomes, 50), p90: percentile(outcomes, 90), mean, min: outcomes[0], max: outcomes[outcomes.length - 1] },
    samples: outcomes,
  };
}

export function compareOptions({ amountMYR, options = [0, 3, 7], baseRate = null }) {
  return options.map((waitDays) => simulateRemittance({ amountMYR, waitDays, baseRate }));
}

export function targetRateProbability({ amountMYR, targetRate, horizonDays = 7, simulations = config.defaultSimulations, baseRate = null }) {
  if (baseRate === null || !isFinite(baseRate) || baseRate <= 0) {
    return { error: 'RATE_UNAVAILABLE', amountMYR, targetRate, horizonDays, probability: null, avgDaysToHit: null, currentRate: null, gapPct: null };
  }
  const paths = generatePaths({ startRate: baseRate, horizonDays, dailyVolatility: config.dailyVolatility, simulations });
  let hit = 0, hitDaySum = 0;
  for (const path of paths) {
    for (let d = 1; d < path.length; d++) {
      if (path[d] >= targetRate) { hit++; hitDaySum += d; break; }
    }
  }
  return {
    amountMYR, targetRate, horizonDays, probability: hit / simulations,
    avgDaysToHit: hit > 0 ? hitDaySum / hit : null,
    currentRate: baseRate, gapPct: ((targetRate - baseRate) / baseRate) * 100,
  };
}

export function recommend(comparison) {
  const valid = comparison.filter((c) => c.mmk !== null);
  if (valid.length === 0) return 'Rate unavailable.';
  const now = valid.find((c) => c.waitDays === 0);
  const best = valid.reduce((a, b) => (a.mmk.mean > b.mmk.mean ? a : b));
  const gain = best.mmk.mean - now.mmk.mean;
  const gainPct = (gain / now.mmk.mean) * 100;
  const lines = [];
  lines.push(`Send now: ~${Math.round(now.mmk.mean).toLocaleString()}`);
  lines.push(`Best: wait ${best.waitDays}d → ~${Math.round(best.mmk.mean).toLocaleString()}`);
  lines.push(`Gain vs now: ${gain > 0 ? '+' : ''}${Math.round(gain).toLocaleString()} (${gainPct.toFixed(2)}%)`);
  if (gainPct > 1.5) lines.push('Waiting is favorable.');
  else if (gainPct < -1.5) lines.push('Sending now is favorable.');
  else lines.push('Differences are small.');
  return lines.join('\n');
}