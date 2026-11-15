
import { audit } from '../agent/audit.js';

export const LIMITS = {
  maxSingleTransfer: 5000,   // per-transfer in source currency
  maxDailyTotal: 10000,      // per-day in source currency
  proposalTtlMs: 10 * 60 * 1000,
};

const state = {
  balances: { MYR: 8000, CNY: 20000, USD: 2000, SGD: 3000 },
  proposals: new Map(),
  ledger: [],
  seq: 0,
};

export function getBalances() { return { ...state.balances }; }
export function getLedger() { return state.ledger.map((l) => ({ ...l })); }
export function getProposal(id) { return state.proposals.get(id) || null; }

export function resetSandbox() {
  state.balances = { MYR: 8000, CNY: 20000, USD: 2000, SGD: 3000 };
  state.proposals = new Map();
  state.ledger = [];
  state.seq = 0;
}

export function setBalance(code, amount) { state.balances[code] = amount; }

function todaysTotal(currency) {
  const day = new Date().toISOString().slice(0, 10);
  return state.ledger
    .filter((l) => l.currency === currency && l.at.slice(0, 10) === day)
    .reduce((a, l) => a + l.amount, 0);
}

/**
 * Tier 1: create a pending proposal. Never changes balances.
 * @returns {{ok:boolean, proposal?:object, error?:string}}
 */
export function proposeTransfer({ from, to, amount, rate, feePct, waitDays = 0, note = '' }) {
  if (!Number.isFinite(amount) || amount <= 0) return { ok: false, error: 'INVALID_AMOUNT' };
  if (!Number.isFinite(rate) || rate <= 0) return { ok: false, error: 'RATE_UNAVAILABLE' };
  if (amount > LIMITS.maxSingleTransfer) return { ok: false, error: 'EXCEEDS_SINGLE_TRANSFER_LIMIT' };
  if (!(from in state.balances)) return { ok: false, error: 'NO_WALLET_FOR_CURRENCY' };
  if (amount > state.balances[from]) return { ok: false, error: 'INSUFFICIENT_FUNDS' };
  if (todaysTotal(from) + amount > LIMITS.maxDailyTotal) return { ok: false, error: 'EXCEEDS_DAILY_LIMIT' };

  const id = `P${String(++state.seq).padStart(4, '0')}`;
  const proposal = {
    id, from, to, amount, rate, feePct, waitDays,
    receive: amount * (1 - feePct) * rate,
    note: String(note).slice(0, 140),
    status: 'pending',
    createdAt: Date.now(),
  };
  state.proposals.set(id, proposal);
  audit('proposal_created', { id, from, to, amount, rate });
  return { ok: true, proposal };
}


export function approveProposal(id) {
  const p = state.proposals.get(id);
  if (!p) return { ok: false, error: 'NOT_FOUND' };
  if (p.status !== 'pending') return { ok: false, error: 'NOT_PENDING' };
  if (Date.now() - p.createdAt > LIMITS.proposalTtlMs) {
    p.status = 'expired';
    audit('proposal_expired', { id });
    return { ok: false, error: 'EXPIRED' };
  }
  if (p.amount > state.balances[p.from]) return { ok: false, error: 'INSUFFICIENT_FUNDS' };
  if (todaysTotal(p.from) + p.amount > LIMITS.maxDailyTotal) return { ok: false, error: 'EXCEEDS_DAILY_LIMIT' };

  state.balances[p.from] -= p.amount;
  state.balances[p.to] = (state.balances[p.to] || 0) + p.receive;
  p.status = 'executed';
  p.executedAt = Date.now();
  state.ledger.push({
    id: p.id, currency: p.from, amount: p.amount, to: p.to, receive: p.receive,
    at: new Date().toISOString(),
  });
  audit('proposal_approved', { id, from: p.from, to: p.to, amount: p.amount });
  return { ok: true, proposal: { ...p }, balances: getBalances() };
}

export function rejectProposal(id) {
  const p = state.proposals.get(id);
  if (!p) return { ok: false, error: 'NOT_FOUND' };
  if (p.status !== 'pending') return { ok: false, error: 'NOT_PENDING' };
  p.status = 'rejected';
  audit('proposal_rejected', { id });
  return { ok: true, proposal: { ...p } };
}
