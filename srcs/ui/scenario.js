// scenario.js
// Rendering for Mission Control: What-If, Safety Shield, Crash Button.
// All numbers come from srcs/engine/scenario.js; this module only formats them.

import { runScenario, runComparison, runCrashTest, SHOCKS, STRATEGIES } from '../engine/scenario.js';
import { formatNumber, escapeHtml, formatPct } from './format.js';

const $ = (id) => document.getElementById(id);

export function initScenario({ getContext, onChange }) {
  const deadlineEl = $('mcDeadline');
  const amountEl = $('mcAmount');
  const needEl = $('mcRecipientNeed');
  const reserveEl = $('mcReserve');
  const essentialEl = $('mcEssential');
  const balanceEl = $('mcBalance');
  const strategyEl = $('mcStrategy');
  const shockEl = $('mcShock');

  if (!deadlineEl) return; // panel not present

  const refresh = () => {
    const ctx = getContext();
    if (!ctx) return;
    const profile = {
      senderBalance: Number(balanceEl.value) || 0,
      senderEssential: Number(essentialEl.value) || 0,
      senderReserve: Number(reserveEl.value) || 0,
      recipientNeed: Number(needEl.value) || 0,
    };
    const amount = Number(amountEl.value) || 0;
    const deadlineDays = Number(deadlineEl.value) || 7;
    const shock = SHOCKS[shockEl.value] || SHOCKS.none;
    const strategy = STRATEGIES.find((s) => s.id === strategyEl.value) || STRATEGIES[0];

    const single = runScenario({
      pair: ctx.pair, baseRate: ctx.rate, amount, strategy, deadlineDays, profile, shock,
    });
    const all = runComparison({
      pair: ctx.pair, baseRate: ctx.rate, amount, strategies: STRATEGIES, deadlineDays, profile, shock,
    });

    renderShield(single, ctx);
    renderWhatIf(all, ctx, { amount, deadlineDays, shock });
    if (typeof onChange === 'function') onChange({ single, all, profile, amount, deadlineDays, shock });
  };

  [deadlineEl, amountEl, needEl, reserveEl, essentialEl, balanceEl, strategyEl, shockEl].forEach((el) => {
    el?.addEventListener('input', refresh);
    el?.addEventListener('change', refresh);
  });

  // Seed defaults from context on first call
  const ctx = getContext();
  if (ctx) {
    if (!amountEl.value) amountEl.value = '1000';
    if (!deadlineEl.value) deadlineEl.value = '7';
    if (!balanceEl.value) balanceEl.value = '3000';
    if (!essentialEl.value) essentialEl.value = '800';
    if (!reserveEl.value) reserveEl.value = '1000';
    if (!needEl.value) needEl.value = '0';
  }
  refresh();

  // Crash button
  const crashBtn = $('mcCrashBtn');
  if (crashBtn) {
    crashBtn.addEventListener('click', () => {
      const ctx2 = getContext();
      if (!ctx2) return;
      const profile = {
        senderBalance: Number(balanceEl.value) || 0,
        senderEssential: Number(essentialEl.value) || 0,
        senderReserve: Number(reserveEl.value) || 0,
        recipientNeed: Number(needEl.value) || 0,
      };
      const amount = Number(amountEl.value) || 0;
      const deadlineDays = Number(deadlineEl.value) || 7;
      const blocks = runCrashTest({
        pair: ctx2.pair, baseRate: ctx2.rate, amount,
        strategies: STRATEGIES, deadlineDays, profile,
      });
      renderCrash(blocks, ctx2);
    });
  }

  return { refresh };
}

function renderShield(single, ctx) {
  const out = $('mcShield');
  if (!out) return;
  const recip = single.recipient;
  const send = single.sender;
  out.innerHTML = `
    <div class="mc-shield-grid">
      <div class="mc-shield ${recip.feasible ? 'ok' : 'bad'}" aria-live="polite">
        <div class="mc-shield-title">Recipient protection</div>
        <div class="mc-shield-state">${recip.feasible ? 'SATISFIED' : 'AT RISK'}</div>
        <div class="mc-shield-reason">${escapeHtml(recip.reason)}</div>
        <div class="mc-shield-meta">P(meet) ≈ ${formatPct(recip.probability)} · deadline ${single.deadlineMet ? 'met' : 'missed'}</div>
      </div>
      <div class="mc-shield ${send.feasible ? 'ok' : 'bad'}" aria-live="polite">
        <div class="mc-shield-title">Sender protection</div>
        <div class="mc-shield-state">${send.feasible ? 'SATISFIED' : 'AT RISK'}</div>
        <div class="mc-shield-reason">${escapeHtml(send.reason)}</div>
        <div class="mc-shield-meta">Remaining: ${send.remaining == null ? '—' : formatNumber(send.remaining)} ${escapeHtml(ctx.pair.from)}</div>
      </div>
    </div>
  `;
}

function renderWhatIf(rows, ctx, inputs) {
  const out = $('mcWhatIf');
  if (!out) return;
  const need = Number(inputs.amount) || 0;
  const cards = rows.map((r) => {
    if (r.error) {
      return `<div class="mc-card error"><div class="mc-card-title">${escapeHtml(r.strategy.label)}</div><div class="mc-card-err">${escapeHtml(r.error)}</div></div>`;
    }
    const both = r.recipient.feasible && r.sender.feasible;
    const badge = both ? '<span class="mc-badge ok">FEASIBLE</span>'
      : (r.recipient.feasible || r.sender.feasible) ? '<span class="mc-badge warn">PARTIAL</span>'
      : '<span class="mc-badge bad">INFEASIBLE</span>';
    return `
      <div class="mc-card ${both ? 'ok' : 'warn'}">
        <div class="mc-card-head">
          <div class="mc-card-title">${escapeHtml(r.strategy.label)}</div>
          ${badge}
        </div>
        <div class="mc-card-payout">${formatNumber(r.payout.p50)} <span class="unit">${escapeHtml(ctx.pair.to)}</span></div>
        <div class="mc-card-sub">p10 ${formatNumber(r.payout.p10)} · p90 ${formatNumber(r.payout.p90)}${r.payout.isDeterministic ? ' · deterministic' : ''}</div>
        <div class="mc-card-kv"><span>Recipient</span><span class="${r.recipient.feasible ? 'good' : 'bad'}">${r.recipient.feasible ? 'OK' : 'FAIL'}</span></div>
        <div class="mc-card-kv"><span>Sender</span><span class="${r.sender.feasible ? 'good' : 'bad'}">${r.sender.feasible ? 'OK' : 'FAIL'}</span></div>
        <div class="mc-card-kv"><span>Deadline</span><span class="${r.deadlineMet ? 'good' : 'bad'}">${r.deadlineMet ? 'MET' : 'MISSED'}</span></div>
      </div>
    `;
  }).join('');
  out.innerHTML = `
    <div class="mc-section-title">What-If Comparison <span class="mc-tag">HYPOTHETICAL</span></div>
    <div class="mc-grid">${cards}</div>
    <div class="mc-note">All figures come from the deterministic engine. Hypothetical rate shocks are labelled and never presented as forecasts. Amount used: ${formatNumber(need)} ${escapeHtml(ctx.pair.from)}.</div>
  `;
}

function renderCrash(blocks, ctx) {
  const out = $('mcCrash');
  if (!out) return;
  const rowsHtml = blocks.map((block) => {
    const head = `<div class="mc-crash-head"><strong>${escapeHtml(block.shock.label)}</strong> <span class="mc-tag ${block.anyFeasible ? 'ok' : 'bad'}">${block.anyFeasible ? 'SOME FEASIBLE' : 'NONE FEASIBLE'}</span></div>`;
    const cards = block.rows.map((r) => {
      if (r.error) return `<div class="mc-crash-card error">${escapeHtml(r.strategy.label)}: ${escapeHtml(r.error)}</div>`;
      const both = r.recipient.feasible && r.sender.feasible;
      return `<div class="mc-crash-card ${both ? 'ok' : 'bad'}">
        <div>${escapeHtml(r.strategy.label)}</div>
        <div class="small">p50 ${formatNumber(r.payout.p50)} · p10 ${formatNumber(r.payout.p10)}</div>
        <div class="small">Recipient ${r.recipient.feasible ? 'OK' : 'FAIL'} · Sender ${r.sender.feasible ? 'OK' : 'FAIL'}</div>
      </div>`;
    }).join('');
    return `<div class="mc-crash-block">${head}<div class="mc-crash-grid">${cards}</div></div>`;
  }).join('');
  out.innerHTML = `
    <div class="mc-section-title">Stress Test <span class="mc-tag">HYPOTHETICAL — NOT A FORECAST</span></div>
    ${rowsHtml}
    <div class="mc-note">Adverse scenarios are hypothetical inputs. They do not predict future rates, fees or delivery times, and the product does not guarantee any outcome.</div>
  `;
}