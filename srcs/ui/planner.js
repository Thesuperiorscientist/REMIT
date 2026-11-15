// planner.js
// UI rendering + wiring for the Transfer Planner tab.

import {
  OBJECTIVES,
  compareStrategies,
  defaultStrategies,
  narrateRecommendation,
} from '../engine/strategies.js';
import { getLiveRate, getPair } from '../engine/rateEngine.js';
import { getCurrency } from '../engine/currencies.js';
import { formatNumber, escapeHtml } from './format.js';

/**
 * Initialize the Planner tab.
 */
export function initPlanner() {
  const $ = (id) => document.getElementById(id);

  const runBtn = $('runPlannerBtn');
  if (!runBtn) return;

  runBtn.addEventListener('click', async () => {
    const amount = Number($('planAmount').value) || 0;
    const minPayout = Number($('planMinPayout').value) || 0;
    const deadlineDays = Number($('planDeadline').value) || 7;
    const objective = $('planObjective').value || OBJECTIVES.MAX_EXPECTED;

    if (amount <= 0) {
      alert('Please enter a valid amount.');
      return;
    }
    if (deadlineDays <= 0 || deadlineDays > 365) {
      alert('Deadline must be between 1 and 365 days.');
      return;
    }

    runBtn.disabled = true;
    runBtn.textContent = 'Running...';

    try {
      const pair = getPair();
      const { rate, source } = await getLiveRate(pair.from, pair.to);

      if (!rate) {
        renderError('Rate unavailable for the current pair. Please select a different pair.');
        return;
      }

      const params = {
        amount,
        deadlineDays,
        minPayout: minPayout > 0 ? minPayout : null,
        objective,
        riskCapPct: 5,
      };

      const strategies = defaultStrategies(deadlineDays);

      const comparison = compareStrategies({
        params,
        strategies,
        baseRate: rate,
      });

      renderPlannerResults({
        comparison,
        params,
        pair,
        rate,
        source,
      });
    } catch (err) {
      renderError(err.message);
    } finally {
      runBtn.disabled = false;
      runBtn.textContent = 'Run Analysis';
    }
  });
}

function renderError(message) {
  const $ = (id) => document.getElementById(id);
  const out = $('plannerResults');
  if (!out) return;
  out.classList.remove('hidden');
  out.innerHTML = `<div class="empty-state" style="color: var(--danger);">${escapeHtml(message)}</div>`;
}

function renderPlannerResults({ comparison, params, pair, rate, source }) {
  const $ = (id) => document.getElementById(id);
  const out = $('plannerResults');
  if (!out) return;

  const { results, recommended, reason } = comparison;

  out.classList.remove('hidden');
  out.innerHTML = '';

  // ---- Header card ----
  const header = document.createElement('div');
  header.className = 'planner-header-card';
  const recLabel = recommended
    ? (recommended.strategy.label || recommended.strategy.type)
    : 'None';

  header.innerHTML = `
    <div class="planner-rec-label">RECOMMENDATION</div>
    <div class="planner-rec-value">${escapeHtml(recLabel)}</div>
    <div class="planner-rec-reason">${escapeHtml(reason)}</div>
    <div class="planner-meta">
      <span>${escapeHtml(pair.from)} → ${escapeHtml(pair.to)}</span>
      <span>·</span>
      <span>1 ${pair.from} = ${rate.toFixed(2)} ${pair.to}</span>
      <span>·</span>
      <span>Source: ${escapeHtml(source === 'wise' ? 'Wise live' : source === 'reference' ? 'Reference' : source)}</span>
    </div>
  `;
  out.appendChild(header);

  // ---- Strategy cards ----
  const grid = document.createElement('div');
  grid.className = 'strategy-grid';

  const maxExpected = Math.max(...results.filter((r) => !r.error).map((r) => r.expected));

  for (const r of results) {
    if (r.error) {
      const errCard = document.createElement('div');
      errCard.className = 'strategy-card error';
      errCard.innerHTML = `
        <div class="strategy-name">${escapeHtml(r.strategy.label || r.strategy.type)}</div>
        <div class="strategy-err">Rate unavailable</div>
      `;
      grid.appendChild(errCard);
      continue;
    }

    const isRec = r === recommended;
    const card = document.createElement('div');
    card.className = 'strategy-card' + (isRec ? ' recommended' : '');

    const expectedStr = formatNumber(Math.round(r.expected));
    const p10Str = formatNumber(Math.round(r.p10));
    const p90Str = formatNumber(Math.round(r.p90));
    const probStr = r.probMeetMin !== null ? (r.probMeetMin * 100).toFixed(1) + '%' : '—';
    const deadlineIcon = r.deadlineMet ? '✓' : '✗';

    const barPct = maxExpected > 0 ? (r.expected / maxExpected) * 100 : 0;

    card.innerHTML = `
      <div class="strategy-header">
        <div class="strategy-name">${escapeHtml(r.strategy.label || r.strategy.type)}</div>
        ${isRec ? '<div class="strategy-badge">RECOMMENDED</div>' : ''}
      </div>

      <div class="strategy-expected">${expectedStr} <span class="unit">${escapeHtml(pair.to)}</span></div>
      <div class="strategy-bar-wrap">
        <div class="strategy-bar" style="width: ${barPct}%"></div>
      </div>

      <div class="strategy-kv">
        <span class="k">10th pct</span>
        <span class="v">${p10Str}</span>
      </div>
      <div class="strategy-kv">
        <span class="k">90th pct</span>
        <span class="v">${p90Str}</span>
      </div>
      ${params.minPayout ? `
        <div class="strategy-kv">
          <span class="k">P(meet ${formatNumber(params.minPayout)})</span>
          <span class="v ${r.probMeetMin >= 0.9 ? 'good' : r.probMeetMin >= 0.7 ? 'warn' : 'bad'}">${probStr}</span>
        </div>
      ` : ''}
      <div class="strategy-kv">
        <span class="k">Deadline (${params.deadlineDays}d)</span>
        <span class="v ${r.deadlineMet ? 'good' : 'bad'}">${deadlineIcon}</span>
      </div>
    `;

    grid.appendChild(card);
  }

  out.appendChild(grid);

  // ---- Narrative ----
  const narrative = document.createElement('div');
  narrative.className = 'narrative';
  narrative.textContent = narrateRecommendation({
    results,
    recommended,
    reason,
    params,
  });
  out.appendChild(narrative);

  // ---- Assumptions box ----
  const assumptions = document.createElement('div');
  assumptions.className = 'insight-card';
  assumptions.innerHTML = `
    <h4>Assumptions & Method</h4>
    <div class="kv"><span class="k">Model</span><span class="v">GBM random walk</span></div>
    <div class="kv"><span class="k">Paths</span><span class="v">1,000 per strategy</span></div>
    <div class="kv"><span class="k">Volatility</span><span class="v">0.8%/day (assumed)</span></div>
    <div class="kv"><span class="k">Drift</span><span class="v">0 (no directional bias)</span></div>
    <div class="kv"><span class="k">Fee</span><span class="v">1.5% deducted from source</span></div>
    <div class="kv"><span class="k">Objective</span><span class="v">${escapeHtml(params.objective)}</span></div>
    <div class="sub" style="margin-top:8px;">
      Probabilities are model-based, not empirically verified. This is a decision-support tool, not financial advice.
    </div>
  `;
  out.appendChild(assumptions);
}