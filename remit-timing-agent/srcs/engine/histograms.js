
import { histogram as rawHistogram } from './monteCarlo.js';

/**
 * Prepare histogram data for rendering.
 * @param {number[]} samples - sorted array of outcomes
 * @param {number} bins
 */
export function buildHistogram(samples, bins = 20) {
  const { counts, min, max, width } = rawHistogram(samples, bins);
  const total = samples.length;
  const maxCount = Math.max(...counts, 1);

  return {
    counts,
    min,
    max,
    width,
    total,
    maxCount,
    bars: counts.map((c, i) => ({
      count: c,
      fraction: c / total,
      xStart: min + i * width,
      xEnd: min + (i + 1) * width,
      heightPct: (c / maxCount) * 100,
    })),
  };
}

/**
 * Build a comparison bar chart from a set of options.
 * @param {Array<Object>} comparison - output of compareOptions()
 * @param {string} metric - 'p50' | 'p10' | 'p90' | 'mean'
 */
export function buildComparisonBars(comparison, metric = 'p50') {
  const values = comparison.map((c) => c.mmk[metric]);
  const max = Math.max(...values, 1);
  const min = Math.min(...values);

  return comparison.map((c) => {
    const value = c.mmk[metric];
    return {
      label: c.waitDays === 0 ? 'Now' : `+${c.waitDays}d`,
      value,
      heightPct: (value / max) * 100,
      isBest: value === max && max !== min,
      formatted: Math.round(value).toLocaleString() + ' MMK',
    };
  });
}


export function summarize(samples) {
  const n = samples.length;
  if (n === 0) return null;
  const sum = samples.reduce((a, b) => a + b, 0);
  const mean = sum / n;
  const variance = samples.reduce((acc, v) => acc + (v - mean) ** 2, 0) / n;
  const stddev = Math.sqrt(variance);

  return {
    n,
    min: samples[0],
    max: samples[n - 1],
    mean,
    median: samples[Math.floor(n / 2)],
    stddev,
    cv: stddev / mean,
  };
}