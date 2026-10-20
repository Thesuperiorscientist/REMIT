
import { runAgent, setApiKey, resetAgent } from '../agent/agent.js';
import { initChat, addMessage } from '../ui/chat.js';
import {
  renderHistogram,
  renderComparisonChart,
  renderSingleCard,
  renderTargetCard,
  renderProposalCard,
} from '../ui/charts.js';
import { initSetup } from '../ui/setup.js';
import { initPlanner } from '../ui/planner.js';
import { initScenario } from '../ui/scenario.js';
import { initDNA } from '../ui/dna.js';
import { initPassport } from '../ui/passport.js';
import { initJudge } from '../ui/judge.js';
import { getLiveRate, setPair, getPair } from '../engine/rateEngine.js';
import { STRATEGIES, SHOCKS, runComparison } from '../engine/scenario.js';
import { COUNTRIES, DEFAULT_PAIR, getCountry } from '../engine/currencies.js';
import { formatRelativeTime } from '../ui/format.js';

const $ = (id) => document.getElementById(id);

const chatEl = $('chat');
const inputEl = $('chatInput');
const sendBtn = $('sendBtn');
const chipsEl = $('chips');
const resultsEl = $('results');
const emptyState = $('emptyState');
const setupModal = $('setupModal');
const topbarTitle = $('topbarTitle');
const chatResultsEl = $('chatResults');
const chatResultsTag = $('chatResultsTag');
const fromCountryEl = $('fromCountry');
const toCountryEl = $('toCountry');

let currentRate = null;
let currentSource = null;
let currentPair = null;
let currentFetchedAt = null;
let twinResult = null;


let scenario = null;
let dna = null;

const missionState = {
  amount: 1000,
  deadlineDays: 7,
  objective: 'max_expected',
  shock: SHOCKS.none,
  profile: { senderBalance: 3000, senderEssential: 800, senderReserve: 1000, recipientNeed: 0 },
  feeOverridePct: undefined,
  volatilityOverridePct: undefined,
  lastRows: [],
  lastRecommended: null,
  lastReason: '',
  proposalId: null,
};


// PERSISTENCE

const STORAGE_KEY = 'remit.pair';

function loadSavedPair() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed.fromCountry && parsed.toCountry) return parsed;
  } catch {}
  return null;
}

function savePair(pair) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(pair)); } catch {}
}

// POPULATE COUNTRY DROPDOWNS

function populateCountryDropdowns() {
  if (!fromCountryEl || !toCountryEl) return;
  const sorted = [...COUNTRIES].sort((a, b) => a.name.localeCompare(b.name));
  const seen = new Set();
  const unique = [];
  for (const c of sorted) {
    if (!seen.has(c.code)) { seen.add(c.code); unique.push(c); }
  }
  fromCountryEl.innerHTML = '';
  toCountryEl.innerHTML = '';
  for (const c of unique) {
    const label = `${c.flag} ${c.name} (${c.currency})`;
    const o1 = document.createElement('option');
    o1.value = c.code; o1.textContent = label;
    fromCountryEl.appendChild(o1);
    const o2 = document.createElement('option');
    o2.value = c.code; o2.textContent = label;
    toCountryEl.appendChild(o2);
  }
}


// APPLY PAIR

async function applyPair({ fromCountry, toCountry, silent = false }) {
  const fromC = getCountry(fromCountry);
  const toC = getCountry(toCountry);
  if (!fromC || !toC) return;

  const pair = { from: fromC.currency, to: toC.currency, fromCountry: fromC.code, toCountry: toC.code };
  setPair({ from: pair.from, to: pair.to });
  resetAgent();
  currentPair = pair;
  updatePairLabels(pair);
  savePair(pair);
  await refreshRate();

  if (!silent && chatEl) {
    let status;
    if (currentRate === null) status = `Live rate unavailable for ${pair.from} → ${pair.to}. Try a different pair.`;
    else if (currentSource === 'wise') status = `Currency pair updated: ${pair.from} → ${pair.to} (live rate)`;
    else status = `Currency pair updated: ${pair.from} → ${pair.to} (reference rate)`;
    addMessage(chatEl, 'assistant', status);
  }
}

function updatePairLabels(pair) {
  const set = (id, v) => { const el = $(id); if (el) el.textContent = v; };
  set('rateFromLabel', pair.from);
  set('rateToLabel', pair.to);
  set('chatPairTag', `${pair.from} → ${pair.to}`);
  set('mcPairTag', `${pair.from} → ${pair.to}`);
  set('planFromLabel', `(${pair.from})`);
  set('planToLabel', `(${pair.to})`);
  if (inputEl) inputEl.placeholder = `Ask about a ${pair.from} → ${pair.to} transfer...`;
}

// TAB SWITCHING

const TAB_TITLES = {
  chat: 'Agent Chat',
  mission: 'Mission Control',
  twin: 'Financial Twin',
  insights: 'Simulation Insights',
  planner: 'Transfer Planner',
};

document.querySelectorAll('.nav-item[data-tab]').forEach((navItem) => {
  navItem.addEventListener('click', () => switchTab(navItem.dataset.tab));
});

function switchTab(tab) {
  document.querySelectorAll('.nav-item[data-tab]').forEach((n) => {
    n.classList.toggle('active', n.dataset.tab === tab);
  });
  document.querySelectorAll('.tab-pane').forEach((pane) => {
    pane.classList.toggle('active', pane.dataset.pane === tab);
  });
  if (topbarTitle) topbarTitle.textContent = TAB_TITLES[tab] || 'Remit';
  if (tab === 'chat') setTimeout(() => inputEl?.focus(), 50);
  if (tab === 'mission' && scenario && typeof scenario.refresh === 'function') {
    try { scenario.refresh(); } catch (err) { console.warn('scenario.refresh failed:', err); }
  }
}

// RATE REFRESH

async function refreshRate() {
  const pair = getPair();
  const result = await getLiveRate(pair.from, pair.to);
  const rate = result.rate;
  const source = result.source;
  const fetchedAt = result.fetchedAt || null;

  currentRate = rate;
  currentSource = source;
  currentFetchedAt = fetchedAt;

  const rateValueEl = $('rateValue');
  const sourceEl = $('rateSource');
  const pulseEl = $('ratePulse');
  const mcSourceEl = $('mcRateSource');
  const mcFetchedEl = $('mcRateFetchedAt');

  if (rate === null || source === 'unavailable') {
    if (rateValueEl) rateValueEl.textContent = '—';
    if (sourceEl) { sourceEl.textContent = 'OFFLINE'; sourceEl.classList.add('fallback'); }
    if (pulseEl) pulseEl.classList.add('fallback');
    if (mcSourceEl) mcSourceEl.textContent = 'OFFLINE';
    if (mcFetchedEl) mcFetchedEl.textContent = '—';
    return;
  }

  if (rateValueEl) rateValueEl.textContent = rate.toFixed(2);

  let sourceLabel;
  let fetchedLabel;

  if (source === 'wise') {
    sourceLabel = 'WISE LIVE';
    fetchedLabel = `Fetched ${formatRelativeTime(currentFetchedAt)}`;
    sourceEl?.classList.remove('fallback');
    pulseEl?.classList.remove('fallback');
  } else if (source === 'reference') {
    sourceLabel = 'REFERENCE';
    fetchedLabel = currentFetchedAt
      ? `Reference dated ${String(currentFetchedAt).slice(0, 10)}`
      : 'Reference rate (undated)';
    sourceEl?.classList.remove('fallback');
    pulseEl?.classList.add('fallback');
  } else if (source === 'identity') {
    sourceLabel = 'IDENTITY';
    fetchedLabel = 'Same currency — no conversion';
    sourceEl?.classList.remove('fallback');
    pulseEl?.classList.add('fallback');
  } else {
    sourceLabel = 'OFFLINE';
    fetchedLabel = '—';
    sourceEl?.classList.add('fallback');
    pulseEl?.classList.add('fallback');
  }

  if (sourceEl) sourceEl.textContent = sourceLabel;
  if (mcSourceEl) mcSourceEl.textContent = sourceLabel;
  if (mcFetchedEl) mcFetchedEl.textContent = fetchedLabel;
}


// PAIR SELECTOR WIRING

if (fromCountryEl) fromCountryEl.addEventListener('change', () =>
  applyPair({ fromCountry: fromCountryEl.value, toCountry: toCountryEl.value }),
);
if (toCountryEl) toCountryEl.addEventListener('change', () =>
  applyPair({ fromCountry: fromCountryEl.value, toCountry: toCountryEl.value }),
);

// ============================================================
// CHAT
// ============================================================
if (chatEl && inputEl && sendBtn && chipsEl) {
  initChat({
    chatEl, inputEl, sendBtn, chipsEl,
    onSend: async (text) => {
      if (currentRate === null) {
        addMessage(chatEl, 'system',
          `Rate unavailable for ${currentPair?.from} → ${currentPair?.to}. Please select a different pair.`);
        return;
      }
      try {
        const { reply, ui } = await runAgent(text);
        addMessage(chatEl, 'assistant', reply);
        if (ui) {
          renderResult(ui);
          if (ui.type === 'proposal' && ui.proposal?.id) {
            missionState.proposalId = ui.proposal.id;
          }
        }
      } catch (err) {
        addMessage(chatEl, 'system', `Error: ${err.message}`);
      }
    },
  });
}

// TWIN SETUP

try {
  initSetup({
    onBuilt: (result, narrative) => {
      twinResult = result;
      if (chatEl) addMessage(chatEl, 'assistant', `✅ Financial Twin built.\n\n${narrative}`);
      const profileEl = $('ctxTwinProfile');
      if (profileEl) profileEl.textContent = `${result.profile.income} / month`;
    },
  });
} catch (err) { console.warn('initSetup failed:', err); }

// PLANNER

try { initPlanner(); } catch (err) { console.warn('initPlanner failed:', err); }


// RESULT RENDERING — DUAL VIEW

function renderResult(ui) {
  if (chatResultsEl) { chatResultsEl.innerHTML = ''; renderResultInto(chatResultsEl, ui); }
  if (emptyState) emptyState.classList.add('hidden');
  if (resultsEl) { resultsEl.innerHTML = ''; renderResultInto(resultsEl, ui); }
  const tagText =
    ui.rateSource === 'wise' ? 'LIVE'
    : ui.rateSource === 'reference' ? 'REFERENCE'
    : 'FALLBACK';
  if (chatResultsTag) chatResultsTag.textContent = tagText;
  const insightsTag = $('insightsTag');
  if (insightsTag) insightsTag.textContent = tagText;
}

function renderResultInto(container, ui) {
  if (ui.type === 'single') {
    if (ui.result.error) {
      container.innerHTML = `<div class="empty-state">Rate unavailable — cannot simulate.</div>`;
      return;
    }
    renderSingleCard(container, ui.result);
    renderHistogram(container, ui.result.samples, `Distribution (${ui.result.samples.length} sims)`);
  } else if (ui.type === 'compare') {
    for (const r of ui.comparison) renderSingleCard(container, r);
    renderComparisonChart(container, ui.comparison, 'p50');
  } else if (ui.type === 'target') {
    renderTargetCard(container, ui.result);
  } else if (ui.type === 'proposal') {
    renderProposalCard(container, ui);
  }
}

// MISSION CONTROL WIRING

function getContext() {
  if (currentRate === null || !currentPair) return null;
  return { pair: currentPair, rate: currentRate, source: currentSource, fetchedAt: currentFetchedAt };
}

function getState() {
  return {
    amount: missionState.amount,
    deadlineDays: missionState.deadlineDays,
    objective: missionState.objective,
    shock: missionState.shock,
    profile: missionState.profile,
    feeOverridePct: missionState.feeOverridePct,
    volatilityOverridePct: missionState.volatilityOverridePct,
    lastRows: missionState.lastRows,
    lastRecommended: missionState.lastRecommended,
    lastReason: missionState.lastReason,
    proposalId: missionState.proposalId,
    onChange: () => { recomputeForPassport(); },
  };
}

function recomputeForPassport() {
  const ctx = getContext();
  if (!ctx) return;
  const rows = runComparison({
    pair: ctx.pair, baseRate: ctx.rate, amount: missionState.amount,
    strategies: STRATEGIES, deadlineDays: missionState.deadlineDays,
    profile: missionState.profile, shock: missionState.shock,
    feeOverridePct: missionState.feeOverridePct,
    volatilityOverridePct: missionState.volatilityOverridePct,
  });
  missionState.lastRows = rows;
  missionState.lastRecommended =
    rows.find((r) => !r.error && r.recipient.feasible && r.sender.feasible) || null;
  missionState.lastReason = missionState.lastRecommended
    ? `Feasible strategy selected under the current constraints (deadline met and both protections satisfied).`
    : `No strategy satisfies both recipient and sender protections with the current inputs.`;
}

try {
  scenario = initScenario({
    getContext,
    onChange: ({ single, all, profile, amount, deadlineDays, shock }) => {
      missionState.amount = amount;
      missionState.deadlineDays = deadlineDays;
      missionState.shock = shock;
      missionState.profile = profile;
      missionState.lastRows = all;
      missionState.lastRecommended =
        all.find((r) => !r.error && r.recipient.feasible && r.sender.feasible) || null;
      if (dna && typeof dna.render === 'function') {
        try { dna.render(); } catch (err) { console.warn('dna.render failed:', err); }
      }
    },
  });
} catch (err) { console.warn('initScenario failed:', err); }

try {
  dna = initDNA({ getContext, getState });
} catch (err) { console.warn('initDNA failed:', err); }

try {
  initPassport({
    getContext,
    getState: () => { recomputeForPassport(); return getState(); },
  });
} catch (err) { console.warn('initPassport failed:', err); }

try {
  initJudge({
    applyPreset: (inputs) => {
      const setVal = (id, v) => { const el = $(id); if (el) el.value = String(v); };
      setVal('mcAmount', inputs.amount);
      setVal('mcDeadline', inputs.deadlineDays);
      setVal('mcRecipientNeed', inputs.recipientNeed);
      setVal('mcReserve', inputs.reserve);
      setVal('mcEssential', inputs.essential);
      setVal('mcBalance', inputs.balance);
      $('mcDeadline')?.dispatchEvent(new Event('input', { bubbles: true }));
    },
  });
} catch (err) { console.warn('initJudge failed:', err); }


// API KEY MODAL

if ($('saveKeyBtn')) {
  $('saveKeyBtn').addEventListener('click', () => {
    const key = $('apiKeyInput').value.trim();
    if (!key.startsWith('gsk_')) { alert('Invalid Groq key (should start with gsk_).'); return; }
    setApiKey(key);
    setupModal.classList.add('hidden');
    inputEl?.focus();
  });
}
if ($('cancelKeyBtn')) {
  $('cancelKeyBtn').addEventListener('click', () => {
    setupModal.classList.add('hidden');
    $('apiKeyInput').value = '';
  });
}


// SETTINGS NAV

const settingsNav = $('settingsNav');
if (settingsNav && setupModal) {
  settingsNav.addEventListener('click', () => {
    setupModal.classList.remove('hidden');
    $('apiKeyInput').value = '';
  });
}

// ============================================================
// BOOTSTRAP
// ============================================================
async function boot() {
  try {
    populateCountryDropdowns();

    const saved = loadSavedPair();
    const initial = saved || { fromCountry: DEFAULT_PAIR.fromCountry, toCountry: DEFAULT_PAIR.toCountry };

    if (fromCountryEl) fromCountryEl.value = initial.fromCountry;
    if (toCountryEl) toCountryEl.value = initial.toCountry;

    await applyPair({
      fromCountry: initial.fromCountry,
      toCountry: initial.toCountry,
      silent: true,
    });

    if (scenario && typeof scenario.refresh === 'function') {
      try { scenario.refresh(); } catch (err) { console.warn('scenario.refresh failed:', err); }
    }
  } catch (err) {
    console.error('boot() failed:', err);
    // Last-resort: try to load the rate directly so the UI is at least usable.
    try { await refreshRate(); } catch (err2) { console.error('refreshRate() fallback failed:', err2); }
  }

  setInterval(async () => {
    try {
      await refreshRate();
      if (scenario && typeof scenario.refresh === 'function') scenario.refresh();
    } catch (err) { console.warn('refresh interval failed:', err); }
  }, 5 * 60 * 1000);
}

boot();

window.__twinResult = () => twinResult;
window.__switchTab = switchTab;
window.__getPair = getPair;
window.__missionState = () => missionState;