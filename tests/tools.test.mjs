import test from 'node:test';
import assert from 'node:assert/strict';
import { freshEnv } from './helpers.mjs';
import { executeTool } from '../srcs/agent/tools.js';

test('REGRESSION: check_target_rate no longer crashes', async () => {
  freshEnv();
  const r = await executeTool('check_target_rate', { amount: 1000, target_rate: 330, horizon_days: 7 });
  const j = JSON.parse(r.toolResult);
  assert.ok(!j.error, r.toolResult);
  assert.ok(j.probability >= 0 && j.probability <= 1);
  assert.equal(r.ui.type, 'target');
});

test('simulate_transfer returns exact percentiles that match the UI payload', async () => {
  freshEnv();
  const r = await executeTool('simulate_transfer', { amount: 1000, wait_days: 7 });
  const j = JSON.parse(r.toolResult);
  assert.equal(j.p50_dest ?? j.median_dest, Math.round(r.ui.result.mmk.p50));
  assert.ok(j.p10_dest <= j.median_dest && j.median_dest <= j.p90_dest);
});

test('compare_options returns now / 3d / 7d', async () => {
  freshEnv();
  const j = JSON.parse((await executeTool('compare_options', { amount: 500 })).toolResult);
  assert.deepEqual(j.options.map((o) => o.waitDays), [0, 3, 7]);
});

test('propose_transfer returns a pending proposal and never executes', async () => {
  freshEnv();
  const r = await executeTool('propose_transfer', { amount: 800, note: 'tuition help' });
  const j = JSON.parse(r.toolResult);
  assert.equal(j.status, 'pending_human_approval');
  assert.equal(r.ui.type, 'proposal');
});

test('propose_transfer over the cap is refused', async () => {
  freshEnv();
  const j = JSON.parse((await executeTool('propose_transfer', { amount: 999999 })).toolResult);
  assert.match(j.error, /EXCEEDS_SINGLE_TRANSFER_LIMIT/);
});

test('works for other pairs (MYR->MMK, USD->NGN, triangulated GBP->INR)', async () => {
  for (const pair of [{ from: 'MYR', to: 'MMK' }, { from: 'USD', to: 'NGN' }, { from: 'GBP', to: 'INR' }]) {
    freshEnv(pair);
    const j = JSON.parse((await executeTool('simulate_transfer', { amount: 100, wait_days: 3 })).toolResult);
    assert.ok(!j.error && j.median_dest > 0, JSON.stringify(pair));
  }
});
