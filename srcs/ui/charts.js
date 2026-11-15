
import {
  buildHistogram,
  buildComparisonBars,
} from '../engine/histograms.js';

import {
  formatCompact,
  formatMMK,
  escapeHtml,
} from './format.js';
import { approveProposal, rejectProposal, getProposal } from '../engine/sandbox.js';

export function renderHistogram(container, samples, title = 'Distribution of outcomes') {
  const hist = buildHistogram(samples, 20);

  const card = document.createElement('div');
  card.className = 'result-card';

  const h = document.createElement('h3');
  h.textContent = title;
  card.appendChild(h);

  const chart = document.createElement('div');
  chart.className = 'chart';

  for (const bar of hist.bars) {
    const wrap = document.createElement('div');
    wrap.className = 'chart-bar';

    const barEl = document.createElement('div');
    barEl.className = 'bar';
    barEl.style.height = `${bar.heightPct}%`;
    barEl.title = `${formatMMK(bar.xStart)} – ${formatMMK(bar.xEnd)} (${bar.count})`;

    wrap.appendChild(barEl);
    chart.appendChild(wrap);
  }

  card.appendChild(chart);

  const labels = document.createElement('div');
  labels.className = 'sub';
  labels.textContent = `${formatMMK(hist.min)} ← → ${formatMMK(hist.max)}`;
  card.appendChild(labels);

  container.appendChild(card);
}

export function renderComparisonChart(container, comparison, metric = 'p50') {
  const bars = buildComparisonBars(comparison, metric);

  // Recover the destination currency from any comparison row that carries a pair.
  const toCode = comparison.find((c) => c && c.pair && c.pair.to)?.pair?.to || '';

  const card = document.createElement('div');
  card.className = 'result-card';

  const h = document.createElement('h3');
  h.textContent = `Median comparison (${metric})`;
  card.appendChild(h);

  const chart = document.createElement('div');
  chart.className = 'chart';

  for (const bar of bars) {
    const wrap = document.createElement('div');
    wrap.className = 'chart-bar';

    const value = document.createElement('div');
    value.className = 'value';
    value.textContent = formatCompact(bar.value);

    const barEl = document.createElement('div');
    barEl.className = 'bar';
    barEl.style.height = `${bar.heightPct}%`;
    barEl.title = bar.formatted;

    const label = document.createElement('div');
    label.className = 'label';
    label.textContent = bar.label + (bar.isBest ? ' ⭐' : '');

    wrap.appendChild(value);
    wrap.appendChild(barEl);
    wrap.appendChild(label);
    chart.appendChild(wrap);
  }

  card.appendChild(chart);

  if (toCode) {
    const sub = document.createElement('div');
    sub.className = 'sub';
    sub.textContent = `Values in ${toCode}`;
    card.appendChild(sub);
  }

  container.appendChild(card);
}


export function renderSingleCard(container, r) {
  const card = document.createElement('div');
  card.className = 'result-card';

  const fromCode = r.pair?.from || '';
  const toCode   = r.pair?.to   || '';

  const amountLabel = fromCode
    ? `${r.amountMYR.toLocaleString()} ${fromCode}`
    : r.amountMYR.toLocaleString();

  const feeLabel = fromCode
    ? `fee ${r.feeMYR.toFixed(2)} ${fromCode} (${(r.feePct * 100).toFixed(2)}%)`
    : `fee ${r.feeMYR.toFixed(2)} (${(r.feePct * 100).toFixed(2)}%)`;

  const rateLabel = fromCode && toCode
    ? `${r.expectedRate.toFixed(2)} ${toCode}/${fromCode}`
    : r.expectedRate.toFixed(2);

  const destUnit = toCode || 'MMK';

  const deterministicNote = r.isDeterministic
    ? `<div class="sub" style="color:#d29922;margin-top:6px;">Deterministic — sending today uses the current rate with no uncertainty.</div>`
    : '';

  card.innerHTML = `
    <h3>Wait ${r.waitDays} day${r.waitDays === 1 ? '' : 's'}</h3>
    <div class="big-num">${Math.round(r.mmk.p50).toLocaleString()}<span class="unit"> ${escapeHtml(destUnit)} (median)</span></div>
    <div class="sub">Sending ${escapeHtml(amountLabel)} · ${escapeHtml(feeLabel)}</div>
    <div class="kv"><span class="k">10th percentile</span><span class="v bad">${Math.round(r.mmk.p10).toLocaleString()} ${escapeHtml(destUnit)}</span></div>
    <div class="kv"><span class="k">Median</span><span class="v good">${Math.round(r.mmk.p50).toLocaleString()} ${escapeHtml(destUnit)}</span></div>
    <div class="kv"><span class="k">90th percentile</span><span class="v good">${Math.round(r.mmk.p90).toLocaleString()} ${escapeHtml(destUnit)}</span></div>
    <div class="kv"><span class="k">Expected rate</span><span class="v">${escapeHtml(rateLabel)}</span></div>
    ${deterministicNote}
  `;
  container.appendChild(card);
}

export function renderTargetCard(container, result) {
  const probPct = (result.probability * 100).toFixed(1);
  const probClass = result.probability >= 0.6 ? 'good' : result.probability >= 0.35 ? 'warn' : 'bad';
  const fromCode = result.pair?.from || '';
  const toCode   = result.pair?.to   || '';
  const rateUnit = fromCode && toCode ? ` ${toCode}/${fromCode}` : '';

  const card = document.createElement('div');
  card.className = 'result-card';
  card.innerHTML = `
    <h3>Target rate: ${result.targetRate.toFixed(2)}${escapeHtml(rateUnit)}</h3>
    <div class="big-num">${probPct}<span class="unit">% chance within ${result.horizonDays}d</span></div>
    <div class="sub">Current rate: ${result.currentRate.toFixed(2)} · Gap: ${result.gapPct >= 0 ? '+' : ''}${result.gapPct.toFixed(2)}%</div>
    <div class="kv"><span class="k">Probability</span><span class="v ${probClass}">${probPct}%</span></div>
    ${result.avgDaysToHit ? `<div class="kv"><span class="k">Avg days to hit</span><span class="v">${result.avgDaysToHit.toFixed(1)}</span></div>` : ''}
    <div class="narrative">${escapeHtml(result.advice).replace(/\n/g, "<br>")}</div>
  `;
  container.appendChild(card);
}


export function renderProposalCard(container, ui) {
  const { proposal, pair } = ui;
  const card = document.createElement('div');
  card.className = 'result-card';

  const draw = (msg = '') => {
    const p = getProposal(proposal.id) || proposal;
    const pending = p.status === 'pending';
    card.innerHTML = `
      <h3>Transfer proposal ${escapeHtml(p.id)} <span class="unit">(sandbox)</span></h3>
      <div class="big-num">${Math.round(p.receive).toLocaleString()}<span class="unit"> ${escapeHtml(pair.to)} (estimate)</span></div>
      <div class="sub">Send ${p.amount.toLocaleString()} ${escapeHtml(pair.from)} at ${p.rate.toFixed(2)} · fee ${(p.feePct * 100).toFixed(2)}%</div>
      <div class="kv"><span class="k">Status</span><span class="v ${p.status === 'executed' ? 'good' : p.status === 'pending' ? 'warn' : 'bad'}">${escapeHtml(p.status.toUpperCase())}</span></div>
      ${p.note ? `<div class="kv"><span class="k">Note</span><span class="v">${escapeHtml(p.note)}</span></div>` : ''}
      ${msg ? `<div class="sub" style="margin-top:6px;">${escapeHtml(msg)}</div>` : ''}
      ${pending ? '<div class="proposal-actions" style="display:flex;gap:8px;margin-top:10px;"><button class="primary" data-act="approve">Approve</button><button class="primary" data-act="reject">Reject</button></div>' : ''}
      <div class="sub" style="margin-top:8px;">Simulated wallet. No real money moves. Only you can approve.</div>
    `;
    card.querySelector('[data-act="approve"]')?.addEventListener('click', () => {
      const r = approveProposal(p.id);
      draw(r.ok ? 'Executed in the sandbox wallet.' : `Could not execute: ${r.error}`);
    });
    card.querySelector('[data-act="reject"]')?.addEventListener('click', () => {
      rejectProposal(p.id);
      draw('Proposal rejected.');
    });
  };

  draw();
  container.appendChild(card);
}