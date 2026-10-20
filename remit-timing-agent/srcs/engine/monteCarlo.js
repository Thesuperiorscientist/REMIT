
let rng = Math.random;


export function setSeed(seed) {
  if (seed === null || seed === undefined) { rng = Math.random; return; }
  let a = seed >>> 0;
  rng = function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}


export function random() { return rng(); }

export function gaussianRandom() {
  const u1 = rng() || 1e-9;
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

/**
 * Generate a single random-walk path.
 * @param {number} startRate
 * @param {number} horizonDays
 * @param {number} dailyVolatility
 * @returns {number[]} path with length horizonDays + 1 (includes start)
 */
export function generatePath(startRate, horizonDays, dailyVolatility) {
  const path = [startRate];
  let rate = startRate;
  for (let d = 0; d < horizonDays; d++) {
    const shock = gaussianRandom();
    rate = rate * (1 + dailyVolatility * shock);
    path.push(rate);
  }
  return path;
}

/**
 * Generate many paths.
 * @param {Object} opts
 * @param {number} opts.startRate
 * @param {number} opts.horizonDays
 * @param {number} opts.dailyVolatility
 * @param {number} opts.simulations
 * @returns {number[][]}
 */
export function generatePaths({ startRate, horizonDays, dailyVolatility, simulations }) {
  const paths = [];
  for (let s = 0; s < simulations; s++) {
    paths.push(generatePath(startRate, horizonDays, dailyVolatility));
  }
  return paths;
}

/**
 * Compute percentiles from a sorted array.
 */
export function percentile(sortedArr, p) {
  if (sortedArr.length === 0) return 0;
  const idx = Math.floor((p / 100) * (sortedArr.length - 1));
  return sortedArr[idx];
}

/**
 * Build a histogram from numeric samples.
 * @param {number[]} samples
 * @param {number} bins
 * @returns {{ counts: number[], min: number, max: number, width: number }}
 */
export function histogram(samples, bins = 20) {
  if (samples.length === 0) return { counts: [], min: 0, max: 0, width: 0 };
  const min = samples[0];
  const max = samples[samples.length - 1];
  const width = (max - min) / bins || 1;
  const counts = new Array(bins).fill(0);

  for (const v of samples) {
    let idx = Math.floor((v - min) / width);
    if (idx >= bins) idx = bins - 1;
    if (idx < 0) idx = 0;
    counts[idx]++;
  }

  return { counts, min, max, width };
}