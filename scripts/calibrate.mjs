// scripts/calibrate.mjs
// Estimate daily volatility from REAL historical rates so the model assumption is evidence-based.
//
// Usage:  node scripts/calibrate.mjs data/cny-mmk.csv
// CSV format (header optional): date,rate      e.g.  2026-09-01,312.4
// Get history from Wise's rate history chart, XE, or your central bank, then paste it into a CSV.
//
// Prints the daily log-return volatility, the p10/p90 of N-day moves, and a suggested config value.

import fs from 'node:fs';

const file = process.argv[2];
if (!file) { console.error('usage: node scripts/calibrate.mjs <csv>'); process.exit(1); }

const rows = fs.readFileSync(file, 'utf8').trim().split(/\r?\n/)
  .map((l) => l.split(','))
  .filter((c) => c.length >= 2 && Number.isFinite(parseFloat(c[1])))
  .map((c) => ({ date: c[0], rate: parseFloat(c[1]) }))
  .sort((a, b) => a.date.localeCompare(b.date));

if (rows.length < 30) { console.error('need at least 30 observations'); process.exit(1); }

const rets = [];
for (let i = 1; i < rows.length; i++) rets.push(Math.log(rows[i].rate / rows[i - 1].rate));
const mean = rets.reduce((a, b) => a + b, 0) / rets.length;
const sd = Math.sqrt(rets.reduce((a, b) => a + (b - mean) ** 2, 0) / (rets.length - 1));

const q = (arr, p) => { const s = [...arr].sort((a, b) => a - b); return s[Math.floor(p * (s.length - 1))]; };
console.log(`observations: ${rows.length}`);
console.log(`mean daily log-return: ${(mean * 100).toFixed(4)}%  (model assumes 0)`);
console.log(`daily volatility:      ${(sd * 100).toFixed(3)}%  (model currently assumes 0.800%)`);
for (const n of [3, 7, 15]) {
  const moves = [];
  for (let i = n; i < rows.length; i++) moves.push(rows[i].rate / rows[i - n].rate - 1);
  console.log(`${String(n).padStart(2)}-day move: p10 ${(q(moves, 0.1) * 100).toFixed(2)}%  p90 ${(q(moves, 0.9) * 100).toFixed(2)}%  (model: ±${(1.2816 * sd * Math.sqrt(n) * 100).toFixed(2)}%)`);
}
console.log(`\nSuggested:  updateConfig({ dailyVolatility: ${sd.toFixed(4)} })`);
