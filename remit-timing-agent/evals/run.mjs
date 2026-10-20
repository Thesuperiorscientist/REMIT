
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { setSeed } from '../srcs/engine/monteCarlo.js';
import { setLiveFetchEnabled, setPair } from '../srcs/engine/rateEngine.js';
import { resetSandbox, getBalances } from '../srcs/engine/sandbox.js';
import { clearAuditLog, getAuditLog, verifyAuditLog } from '../srcs/agent/audit.js';
import { runAgent, setLLM, resetAgent, setApiKey } from '../srcs/agent/agent.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const tasks = JSON.parse(fs.readFileSync(path.join(here, 'tasks.json'), 'utf8'));
const useRealLLM = process.argv.includes('--llm') && process.env.GROQ_API_KEY;

setLiveFetchEnabled(false);

function routerFor(task) {
  
  let step = 0;
  return async () => {
    step++;
    if (step === 1) {
      const args = task.expect.args ?? defaultArgs(task);
      return { role: 'assistant', content: null, tool_calls: [{ id: 't1', function: { name: task.expect.tool, arguments: JSON.stringify(args) } }] };
    }
    return { role: 'assistant', content: 'Done.' };
  };
}

function defaultArgs(task) {
  const nums = (task.user.match(/\d+(\.\d+)?/g) || []).map(Number);
  switch (task.expect.tool) {
    case 'compare_options': return { amount: nums[0] };
    case 'simulate_transfer': return { amount: nums[0], wait_days: /now/i.test(task.user) ? 0 : nums[1] ?? 0 };
    case 'check_target_rate': return { amount: nums[1], target_rate: nums[0], horizon_days: 7 };
    case 'propose_transfer': return { amount: nums[0] };
    default: return {};
  }
}

const results = [];
for (const task of tasks) {
  setSeed(42);
  const [from, to] = task.pair.split(':');
  setPair({ from, to });
  resetSandbox(); clearAuditLog(); resetAgent();

  if (useRealLLM) { setApiKey(process.env.GROQ_API_KEY); setLLM(null); }
  else setLLM(routerFor(task));

  const before = getBalances();
  let out, crashed = null;
  try { out = await runAgent(task.user); } catch (e) { crashed = e.message; }

  
  const log = getAuditLog();
  const checks = [];
  const e = task.expect;
  const toolCalls = log.filter((l) => l.type === 'tool_call').map((l) => l.data.name);
  const blocked = log.some((l) => l.type === 'tool_blocked');
  const resultEntry = log.filter((l) => l.type === 'tool_result').pop();

  checks.push(['no crash', !crashed]);
  checks.push([`tool ${e.tool} attempted`, toolCalls.includes(e.tool) || blocked]);
  checks.push(['balances unchanged unless human approves', JSON.stringify(getBalances()) === JSON.stringify(before)]);
  checks.push(['audit chain valid', verifyAuditLog()]);

  if (e.error) checks.push(['rejected safely', blocked || (resultEntry && resultEntry.data.ok === false)]);
  if (e.no_error) checks.push(['succeeded', resultEntry && resultEntry.data.ok === true]);

  
  const ui = out && out.ui;
  if (e.options) checks.push(['options 0/3/7', ui && ui.comparison && JSON.stringify(ui.comparison.map((c) => c.waitDays)) === JSON.stringify(e.options)]);
  if (e.p10_le_p50_le_p90) checks.push(['p10<=p50<=p90', ui && ui.result.mmk.p10 <= ui.result.mmk.p50 && ui.result.mmk.p50 <= ui.result.mmk.p90]);
  if (e.zero_spread) checks.push(['zero spread when sending now', ui && ui.result.mmk.p10 === ui.result.mmk.p90]);
  if (e.probability_between) checks.push(['probability in [0,1]', ui && ui.result.probability >= e.probability_between[0] && ui.result.probability <= e.probability_between[1]]);
  if (e.advice_matches) checks.push(['advice text', ui && new RegExp(e.advice_matches).test(ui.result.advice)]);
  if (e.status) checks.push(['proposal pending', ui && ui.proposal && ui.proposal.status === 'pending']);

  const passed = checks.every(([, ok]) => !!ok);
  results.push({ id: task.id, goal: task.goal, passed, failed_checks: checks.filter(([, ok]) => !ok).map(([n]) => n) });
}

const passCount = results.filter((r) => r.passed).length;
const mode = useRealLLM ? 'real LLM (Groq)' : 'deterministic router (no LLM)';
const report = { generatedAt: new Date().toISOString(), mode, total: results.length, passed: passCount, results };
fs.writeFileSync(path.join(here, 'report.json'), JSON.stringify(report, null, 2));

const md = [
  '# Evaluation report',
  '',
  `Mode: ${mode}  `,
  `Generated: ${report.generatedAt}  `,
  `Result: **${passCount}/${results.length} tasks passed**`,
  '',
  '| ID | Goal | Result |',
  '|---|---|---|',
  ...results.map((r) => `| ${r.id} | ${r.goal} | ${r.passed ? 'PASS' : 'FAIL: ' + r.failed_checks.join(', ')} |`),
  '',
].join('\n');
fs.writeFileSync(path.join(here, 'report.md'), md);
console.log(md);
process.exit(passCount === results.length ? 0 : 1);
