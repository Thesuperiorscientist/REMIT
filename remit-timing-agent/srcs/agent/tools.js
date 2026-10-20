
import {
  simulateRemittance,
  compareOptions,
  getLiveRate,
  getPair,
  getConfig,
} from '../engine/rateEngine.js';
import { evaluateTarget } from '../engine/targets.js';
import { proposeTransfer, getBalances, LIMITS } from '../engine/sandbox.js';
import { audit } from './audit.js';

export const TOOL_TIERS = {
  simulate_transfer: 'T0',
  compare_options: 'T0',
  check_target_rate: 'T0',
  get_wallet: 'T0',
  propose_transfer: 'T1',
};

export const TOOL_DEFINITIONS = [
  {
    type: 'function',
    function: {
      name: 'simulate_transfer',
      description: 'Simulate the outcome of sending source currency to destination currency, waiting a given number of days before sending. Uses the currently active currency pair.',
      parameters: {
        type: 'object',
        properties: {
          amount: { type: 'number', description: 'Amount in source currency to send' },
          wait_days: { type: 'number', description: 'Days to wait (0 = now)' },
        },
        required: ['amount'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'compare_options',
      description: 'Compare sending now vs waiting 3 days vs waiting 7 days, side by side. Uses the currently active currency pair.',
      parameters: {
        type: 'object',
        properties: {
          amount: { type: 'number', description: 'Amount in source currency' },
        },
        required: ['amount'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'check_target_rate',
      description: 'Check the probability that the exchange rate reaches a user-specified target within a horizon. Uses the currently active currency pair.',
      parameters: {
        type: 'object',
        properties: {
          amount: { type: 'number', description: 'Amount in source currency' },
          target_rate: { type: 'number', description: 'Target rate (destination per source)' },
          horizon_days: { type: 'number', description: 'Days to look ahead (default 7)' },
        },
        required: ['amount', 'target_rate'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_wallet',
      description: 'Read the balances of the user\'s simulated sandbox wallet.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'propose_transfer',
      description: 'Create a PENDING transfer proposal in the sandbox wallet for the active pair. This does NOT send money. The user must press Approve in the UI. Only call when the user explicitly asks to send or schedule a transfer.',
      parameters: {
        type: 'object',
        properties: {
          amount: { type: 'number', description: 'Amount in source currency' },
          wait_days: { type: 'number', description: 'Days the user chose to wait (0 = now)' },
          note: { type: 'string', description: 'Short reason, max 140 characters' },
        },
        required: ['amount'],
      },
    },
  },
];

const ALLOWED_TOOLS = new Set(Object.keys(TOOL_TIERS));


export async function executeTool(name, args) {
  if (!ALLOWED_TOOLS.has(name)) {
    audit('tool_blocked', { name, reason: 'not_in_allowlist' });
    return { toolResult: JSON.stringify({ error: `Unknown tool: ${name}` }), ui: null };
  }

  const safeArgs = args && typeof args === 'object' && !Array.isArray(args) ? args : {};
  audit('tool_call', { name, tier: TOOL_TIERS[name], args: safeArgs });

  try {
    let out;
    switch (name) {
      case 'simulate_transfer': out = await runSimulateTransfer(safeArgs); break;
      case 'compare_options':   out = await runCompareOptions(safeArgs); break;
      case 'check_target_rate': out = await runCheckTargetRate(safeArgs); break;
      case 'get_wallet':        out = runGetWallet(); break;
      case 'propose_transfer':  out = await runProposeTransfer(safeArgs); break;
    }
    audit('tool_result', { name, ok: !JSON.parse(out.toolResult).error });
    return out;
  } catch (err) {
    audit('tool_error', { name, message: String(err && err.message).slice(0, 200) });
    return { toolResult: JSON.stringify({ error: 'Tool failed. Please try again.' }), ui: null };
  }
}

export function validateAmount(v) {
  const n = Number(v);
  if (!isFinite(n) || n <= 0) return null;
  if (n > 1e7) return null;
  return n;
}

export function validateWaitDays(v) {
  const n = Number(v);
  if (!isFinite(n) || n < 0 || n > 365) return 0;
  return Math.floor(n);
}

export function validateTargetRate(v) {
  const n = Number(v);
  if (!isFinite(n) || n <= 0) return null;
  return n;
}

const err = (message) => ({ toolResult: JSON.stringify({ error: message }), ui: null });


async function runSimulateTransfer(args) {
  const amount = validateAmount(args.amount);
  const waitDays = validateWaitDays(args.wait_days);
  if (amount === null) return err('Invalid amount. Must be a positive number.');

  const pair = getPair();
  const { rate, source } = await getLiveRate(pair.from, pair.to);
  if (!rate) return err('RATE_UNAVAILABLE');

  const result = simulateRemittance({ amountMYR: amount, waitDays, baseRate: rate });

  return {
    toolResult: JSON.stringify({
      pair,
      amount_source: amount,
      waitDays,
      base_rate: rate,
      rate_source: source,
      median_dest: Math.round(result.mmk.p50),
      p10_dest: Math.round(result.mmk.p10),
      p90_dest: Math.round(result.mmk.p90),
      mean_dest: Math.round(result.mmk.mean),
      fee_source: Number(result.feeMYR.toFixed(2)),
      note: 'The model has zero drift: waiting changes risk, not the expected payout.',
    }),
    ui: { type: 'single', result, rateSource: source, liveRate: rate, pair },
  };
}

async function runCompareOptions(args) {
  const amount = validateAmount(args.amount);
  if (amount === null) return err('Invalid amount.');

  const pair = getPair();
  const { rate, source } = await getLiveRate(pair.from, pair.to);
  if (!rate) return err('RATE_UNAVAILABLE');

  const comparison = compareOptions({ amountMYR: amount, options: [0, 3, 7], baseRate: rate });

  return {
    toolResult: JSON.stringify({
      pair,
      options: comparison.map((c) => ({
        waitDays: c.waitDays,
        median_dest: Math.round(c.mmk.p50),
        p10_dest: Math.round(c.mmk.p10),
        p90_dest: Math.round(c.mmk.p90),
        mean_dest: Math.round(c.mmk.mean),
      })),
      note: 'Means are nearly identical by construction (zero drift). The difference is the spread.',
    }),
    ui: { type: 'compare', comparison, rateSource: source, liveRate: rate, pair },
  };
}

async function runCheckTargetRate(args) {
  const amount = validateAmount(args.amount);
  const targetRate = validateTargetRate(args.target_rate);
  const horizonDays = validateWaitDays(args.horizon_days) || 7;
  if (amount === null || targetRate === null) return err('Invalid amount or target_rate.');

  const pair = getPair();
  const { rate, source } = await getLiveRate(pair.from, pair.to);
  if (!rate) return err('RATE_UNAVAILABLE');

  const result = evaluateTarget({ amountMYR: amount, targetRate, baseRate: rate, horizonDays });
  if (result.error) return err(result.error);

  return {
    toolResult: JSON.stringify({
      pair,
      target_rate: targetRate,
      horizon_days: horizonDays,
      probability: Number(result.probability.toFixed(3)),
      current_rate: rate,
      rate_source: source,
      gap_pct: Number(result.gapPct.toFixed(2)),
      advice: result.advice,
    }),
    ui: { type: 'target', result, rateSource: source, liveRate: rate, pair },
  };
}

function runGetWallet() {
  return { toolResult: JSON.stringify({ balances: getBalances(), sandbox: true }), ui: null };
}

async function runProposeTransfer(args) {
  const amount = validateAmount(args.amount);
  const waitDays = validateWaitDays(args.wait_days);
  if (amount === null) return err('Invalid amount.');

  const pair = getPair();
  const { rate, source } = await getLiveRate(pair.from, pair.to);
  if (!rate) return err('RATE_UNAVAILABLE');

  const res = proposeTransfer({
    from: pair.from,
    to: pair.to,
    amount,
    rate,
    feePct: getConfig().transferFeePct,
    waitDays,
    note: typeof args.note === 'string' ? args.note : '',
  });
  if (!res.ok) {
    return err(`${res.error} (limit per transfer: ${LIMITS.maxSingleTransfer} ${pair.from})`);
  }

  return {
    toolResult: JSON.stringify({
      status: 'pending_human_approval',
      proposal_id: res.proposal.id,
      receive_estimate: Math.round(res.proposal.receive),
      instruction: 'Tell the user the proposal is pending and they must press Approve in the card. You cannot approve it.',
    }),
    ui: { type: 'proposal', proposal: res.proposal, balances: getBalances(), rateSource: source, liveRate: rate, pair },
  };
}
