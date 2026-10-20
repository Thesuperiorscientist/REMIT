// passport.js
// Render + export the Financial Decision Passport.

import { buildPassport, passportToMarkdown } from '../engine/passport.js';
import { formatNumber, escapeHtml } from './format.js';

export function initPassport({ getContext, getState }) {
  const renderBtn = document.getElementById('mcPassportRender');
  const exportBtn = document.getElementById('mcPassportExport');
  const out = document.getElementById('mcPassportOut');
  if (!renderBtn || !out) return;

  let last = null;

  renderBtn.addEventListener('click', () => {
    const ctx = getContext();
    const state = getState();
    if (!ctx || !state) return;
    const rows = state.lastRows || [];
    const recommended = state.lastRecommended || null;
    last = buildPassport({
      objective: state.objective || 'max_expected',
      pair: ctx.pair,
      baseRate: ctx.rate,
      rateSource: ctx.source,
      rateFetchedAt: ctx.fetchedAt,
      amount: state.amount,
      deadlineDays: state.deadlineDays,
      profile: state.profile,
      rows,
      recommended,
      reason: state.lastReason || '',
      proposalId: state.proposalId || null,
    });
    out.innerHTML = renderPassportHtml(last);
  });

  exportBtn?.addEventListener('click', () => {
    if (!last) {
      alert('Click "Build passport" first.');
      return;
    }
    const md = passportToMarkdown(last);
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `decision-passport-${Date.now()}.md`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
}

function renderPassportHtml(p) {
  const alts = p.alternatives.map((a) => `
    <li>
      <strong>${escapeHtml(a.strategy)}</strong>${a.error ? ` — ${escapeHtml(a.error)}` : ''}
      ${a.payout ? `<br><span class="small">p10/p50/p90: ${formatNumber(a.payout.p10)} / ${formatNumber(a.payout.p50)} / ${formatNumber(a.payout.p90)}</span>` : ''}
      <br><span class="small">Recipient: ${a.recipient.feasible ? 'OK' : 'FAIL'} · Sender: ${a.sender.feasible ? 'OK' : 'FAIL'}</span>
    </li>
  `).join('');
  return `
    <div class="mc-passport">
      <h3>Financial Decision Passport</h3>
      <div class="kv"><span class="k">Generated</span><span class="v">${escapeHtml(p.generatedAt)}</span></div>
      <div class="kv"><span class="k">Objective</span><span class="v">${escapeHtml(p.objective)}</span></div>
      <div class="kv"><span class="k">Pair</span><span class="v">${escapeHtml(p.pair.from)} → ${escapeHtml(p.pair.to)}</span></div>
      <div class="kv"><span class="k">Rate source</span><span class="v">${escapeHtml(p.rate.source)}${p.rate.fetchedAt ? ' · ' + escapeHtml(p.rate.fetchedAt) : ''}</span></div>
      <div class="kv"><span class="k">Rate used</span><span class="v">${p.rate.baseRate.toFixed(4)}</span></div>
      <div class="kv"><span class="k">Approval status</span><span class="v">${escapeHtml(p.approval.status)}</span></div>
      <h4>Recommended</h4>
      ${p.recommended ? `
        <div class="kv"><span class="k">Strategy</span><span class="v">${escapeHtml(p.recommended.strategy)}</span></div>
        <div class="kv"><span class="k">Reason</span><span class="v">${escapeHtml(p.recommended.reason)}</span></div>
        ${p.recommended.payout ? `<div class="kv"><span class="k">p10 / p50 / p90</span><span class="v">${formatNumber(p.recommended.payout.p10)} / ${formatNumber(p.recommended.payout.p50)} / ${formatNumber(p.recommended.payout.p90)}</span></div>` : ''}
      ` : `<div class="empty-state">No feasible strategy.</div>`}
      <h4>Alternatives</h4>
      <ul class="mc-passport-alts">${alts || '<li>None</li>'}</ul>
      <h4>Assumptions</h4>
      ${Object.entries(p.assumptions).map(([k, v]) => `<div class="kv"><span class="k">${escapeHtml(k)}</span><span class="v">${escapeHtml(String(v))}</span></div>`).join('')}
      <h4>Limitations</h4>
      <ul>${p.limitations.map((l) => `<li>${escapeHtml(l)}</li>`).join('')}</ul>
      <div class="mc-note">${escapeHtml(p.approval.note)}</div>
    </div>
  `;
}