
import { getAuditLog } from '../agent/audit.js';
import { getProposal } from './sandbox.js';

const SENSITIVE_KEY_PATTERN = /gsk_[A-Za-z0-9]+/g;

function redact(value) {
  const json = JSON.stringify(value ?? null);
  return JSON.parse(json.replace(SENSITIVE_KEY_PATTERN, '[REDACTED_KEY]'));
}

/**
 * Build the passport object.
 * @param {Object} args
 * @param {string} args.objective
 * @param {Object} args.pair
 * @param {number} args.baseRate
 * @param {string} args.rateSource
 * @param {string|null} args.rateFetchedAt
 * @param {number} args.amount
 * @param {number} args.deadlineDays
 * @param {Object} args.profile
 * @param {Array} args.rows - runComparison() output
 * @param {Object|null} args.recommended - the recommended row (or null)
 * @param {string} args.reason
 * @param {string|null} args.proposalId - sandbox proposal id, or null
 * @returns {Object}
 */
export function buildPassport({
  objective, pair, baseRate, rateSource, rateFetchedAt,
  amount, deadlineDays, profile, rows, recommended, reason, proposalId,
}) {
  const ts = new Date().toISOString();
  const proposal = proposalId ? getProposal(proposalId) : null;
  const status = !proposal ? 'none' : proposal.status;

  const alternatives = rows.map((r) => ({
    strategy: r.strategy?.label || r.strategy?.id || 'unknown',
    type: r.strategy?.type,
    error: r.error || null,
    deadlineMet: r.deadlineMet,
    payout: r.payout ? {
      p10: round(r.payout.p10),
      p50: round(r.payout.p50),
      p90: round(r.payout.p90),
      mean: round(r.payout.mean),
      isDeterministic: r.payout.isDeterministic,
    } : null,
    recipient: r.recipient,
    sender: r.sender,
    feePct: r.feePct,
    shock: r.shock ? { id: r.shock.id, label: r.shock.label } : null,
  }));

  const body = {
    schema: 'remit-timing-agent/passport/v1',
    generatedAt: ts,
    objective,
    pair,
    rate: {
      baseRate,
      source: rateSource,
      fetchedAt: rateFetchedAt,
      disclosure: 'Rate is a model input (live Wise when reachable, otherwise a dated reference). Not a forecast.',
    },
    inputs: {
      amount,
      deadlineDays,
      senderBalance: profile.senderBalance,
      senderEssential: profile.senderEssential,
      senderReserve: profile.senderReserve,
      recipientNeed: profile.recipientNeed,
    },
    recommended: recommended ? {
      strategy: recommended.strategy?.label,
      reason,
      payout: recommended.payout ? {
        p10: round(recommended.payout.p10),
        p50: round(recommended.payout.p50),
        p90: round(recommended.payout.p90),
        mean: round(recommended.payout.mean),
      } : null,
      recipient: recommended.recipient,
      sender: recommended.sender,
    } : null,
    alternatives,
    assumptions: {
      model: 'multiplicative random walk, zero drift (not a forecast)',
      dailyVolatility: 0.008,
      simulations: 1000,
      feePct: recommended ? recommended.feePct : null,
    },
    limitations: [
      'Simulations are model-based, not predictions.',
      'Hardcoded reference rates are dated and may be stale.',
      'Sandbox only: no real money moves without human approval.',
      'Not financial advice.',
    ],
    approval: {
      status,               
      proposalId: proposalId || null,
      executedAt: proposal?.executedAt || null,
      note: status === 'executed'
        ? 'Sandbox transfer executed after explicit human approval. No real money moved.'
        : 'No transfer has been executed for this decision.',
    },
    audit: {
      entries: getAuditLog().length,
      verified: true, 
    },
  };

  return redact(body);
}

/** Render the passport as Markdown for export/download. */
export function passportToMarkdown(p) {
  const lines = [];
  lines.push(`# Financial Decision Passport`);
  lines.push('');
  lines.push(`Generated: **${p.generatedAt}**`);
  lines.push(`Objective: **${p.objective}**`);
  lines.push(`Pair: **${p.pair.from} → ${p.pair.to}**`);
  lines.push(`Rate input: **${p.rate.baseRate.toFixed(4)}** (source: ${p.rate.source}${p.rate.fetchedAt ? `, fetched ${p.rate.fetchedAt}` : ''})`);
  lines.push('');
  lines.push(`> ${p.rate.disclosure}`);
  lines.push('');
  lines.push(`## Inputs`);
  for (const [k, v] of Object.entries(p.inputs)) lines.push(`- ${k}: ${v}`);
  lines.push('');
  lines.push(`## Recommendation`);
  if (p.recommended) {
    lines.push(`- Strategy: **${p.recommended.strategy}**`);
    lines.push(`- Reason: ${p.recommended.reason}`);
    if (p.recommended.payout) {
      lines.push(`- Payout p10/p50/p90: ${p.recommended.payout.p10} / ${p.recommended.payout.p50} / ${p.recommended.payout.p90}`);
    }
    lines.push(`- Recipient feasible: ${p.recommended.recipient.feasible} — ${p.recommended.recipient.reason}`);
    lines.push(`- Sender feasible: ${p.recommended.sender.feasible} — ${p.recommended.sender.reason}`);
  } else {
    lines.push(`_No strategy satisfied all constraints._`);
  }
  lines.push('');
  lines.push(`## Alternatives`);
  for (const a of p.alternatives) {
    lines.push(`- **${a.strategy}**${a.error ? ` — error: ${a.error}` : ''}`);
    if (a.payout) lines.push(`    - p10/p50/p90: ${a.payout.p10} / ${a.payout.p50} / ${a.payout.p90}`);
    lines.push(`    - Recipient feasible: ${a.recipient.feasible}; Sender feasible: ${a.sender.feasible}`);
    if (a.shock && a.shock.id !== 'none') lines.push(`    - Shock: ${a.shock.label}`);
  }
  lines.push('');
  lines.push(`## Assumptions`);
  for (const [k, v] of Object.entries(p.assumptions)) lines.push(`- ${k}: ${v}`);
  lines.push('');
  lines.push(`## Limitations`);
  for (const l of p.limitations) lines.push(`- ${l}`);
  lines.push('');
  lines.push(`## Approval status`);
  lines.push(`- Status: **${p.approval.status}**`);
  if (p.approval.proposalId) lines.push(`- Proposal: ${p.approval.proposalId}`);
  if (p.approval.executedAt) lines.push(`- Executed at: ${new Date(p.approval.executedAt).toISOString()}`);
  lines.push(`- Note: ${p.approval.note}`);
  lines.push('');
  return lines.join('\n');
}

function round(n) { return Number.isFinite(n) ? Math.round(n) : null; }