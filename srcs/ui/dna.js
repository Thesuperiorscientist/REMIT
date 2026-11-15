// dna.js
// Decision DNA: show which input moves the recommendation, and let the user change it.
// Every result comes from runComparison() in srcs/engine/scenario.js.

import { runComparison, STRATEGIES } from '../engine/scenario.js';
import { formatNumber, escapeHtml, formatPct } from './format.js';

const FACTORS = [
  { id: 'deadline', label: 'Deadline', unit: 'days', min: 1, max: 60, step: 1 },
  { id: 'recipientNeed', label: 'Recipient minimum', unit: 'destination units', min: 0, max: 1e9, step: 1 },
  { id: 'senderReserve', label: 'Emergency reserve', unit: 'source units', min: 0, max: 1e6, step: 50 },
  { id: 'feePct', label: 'Fee (percentage points)', unit: '%', min: 0, max: 5, step: 0.1 },
  { id: 'volatilityPct', label: 'Daily volatility (percentage points)', unit: '%', min: 0.1, max: 2, step: 0.1 },
  { id: 'delayDays', label: 'Delivery delay', unit: 'days', min: 0, max: 10, step: 1 },
];

export function initDNA({ getContext, getState }) {
  const root = document.getElementById('mcDNA');
  if (!root) return;

  const render = () => {
    const ctx = getContext();
    const state = getState();
    if (!ctx || !state) return;

    const rows = runComparison({
      pair: ctx.pair, baseRate: ctx.rate, amount: state.amount,
      strategies: STRATEGIES, deadlineDays: state.deadlineDays, profile: state.profile,
      shock: state.shock,
    });

    const feasible = rows.filter((r) => !r.error && r.recipient.feasible && r.sender.feasible);
    const winner = feasible[0] || null;

    const factorsHtml = FACTORS.map((f) => `
      <div class="mc-dna-factor">
        <div class="mc-dna-factor-head">
          <span class="mc-dna-factor-label">${escapeHtml(f.label)}</span>
          <span class="mc-dna-factor-unit">${escapeHtml(f.unit)}</span>
        </div>
        <input
          class="mc-dna-input"
          type="range"
          min="${f.min}" max="${f.max}" step="${f.step}"
          value="${readFactor(f.id, state)}"
          data-factor="${f.id}"
        />
        <div class="mc-dna-factor-readout">
          current: <strong>${readFactor(f.id, state)}</strong>
        </div>
      </div>
    `).join('');

    root.innerHTML = `
      <div class="mc-section-title">Decision DNA <span class="mc-tag">EXPLORER</span></div>
      <div class="mc-dna-grid">
        <div class="mc-dna-factors">${factorsHtml}</div>
        <div class="mc-dna-result">
          <div class="mc-dna-result-title">Current recommendation</div>
          <div class="mc-dna-result-value">${winner ? escapeHtml(winner.strategy.label) : 'No feasible strategy'}</div>
          <div class="mc-dna-result-meta">
            ${winner
              ? `p50 ${formatNumber(winner.payout.p50)} ${escapeHtml(ctx.pair.to)} · P(recipient) ≈ ${formatPct(winner.recipient.probability)}`
              : 'Constraints cannot all be satisfied with the current inputs.'}
          </div>
          <div class="mc-note">Every result is computed by the deterministic engine. The LLM does not produce these numbers.</div>
        </div>
      </div>
    `;

    root.querySelectorAll('[data-factor]').forEach((el) => {
      el.addEventListener('input', (e) => {
        const key = e.target.dataset.factor;
        const val = Number(e.target.value);
        onFactorChange(key, val);
        render();
      });
    });
  };

  const onFactorChange = (key, val) => {
    const state = getState();
    if (!state) return;
    if (key === 'deadline') state.deadlineDays = val;
    else if (key === 'recipientNeed') state.profile.recipientNeed = val;
    else if (key === 'senderReserve') state.profile.senderReserve = val;
    else if (key === 'feePct') state.feeOverridePct = val;
    else if (key === 'volatilityPct') state.volatilityOverridePct = val;
    else if (key === 'delayDays') state.delayDays = val;
    if (typeof state.onChange === 'function') state.onChange();
  };

  return { render };
}

function readFactor(id, state) {
  if (!state) return 0;
  if (id === 'deadline') return state.deadlineDays;
  if (id === 'recipientNeed') return state.profile?.recipientNeed ?? 0;
  if (id === 'senderReserve') return state.profile?.senderReserve ?? 0;
  if (id === 'feePct') return state.feeOverridePct ?? 1.5;
  if (id === 'volatilityPct') return state.volatilityOverridePct ?? 0.8;
  if (id === 'delayDays') return state.delayDays ?? 0;
  return 0;
}