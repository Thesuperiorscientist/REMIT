// judge.js
// Judge Challenge Mode: three preset scenarios that populate the What-If inputs.
// No scoring: it shows the calculations and constraints.

const PRESETS = [
  {
    id: 'family',
    title: '1. Supporting family under a strict deadline',
    description: 'A student must send money home before Friday. Rent is due, so the recipient needs at least the minimum.',
    inputs: { amount: 1000, deadlineDays: 4, recipientNeed: 280000, reserve: 500, essential: 600, balance: 3000 },
  },
  {
    id: 'reserve',
    title: '2. A transfer that would breach the emergency reserve',
    description: 'The recipient is fine, but the sender cannot afford to send this much and still keep a buffer.',
    inputs: { amount: 2600, deadlineDays: 7, recipientNeed: 100000, reserve: 1200, essential: 800, balance: 3000 },
  },
  {
    id: 'volatile',
    title: '3. The best-looking rate is not the best net outcome',
    description: 'A volatile rate makes waiting look attractive; the constraint is whether the payout still clears the minimum on enough paths.',
    inputs: { amount: 1000, deadlineDays: 10, recipientNeed: 300000, reserve: 500, essential: 600, balance: 3000 },
  },
];

export function initJudge({ applyPreset }) {
  const root = document.getElementById('mcJudge');
  if (!root) return;

  root.innerHTML = `
    <div class="mc-section-title">Judge Challenge Mode</div>
    <div class="mc-judge-grid">
      ${PRESETS.map((p) => `
        <div class="mc-judge-card">
          <div class="mc-judge-title">${p.title}</div>
          <div class="mc-judge-desc">${p.description}</div>
          <button class="primary" data-preset="${p.id}">Load scenario</button>
        </div>
      `).join('')}
    </div>
    <div class="mc-note">Judges can edit any input in the What-If panel. The app shows the calculations and constraints; it does not award a score.</div>
  `;

  root.querySelectorAll('[data-preset]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const preset = PRESETS.find((p) => p.id === btn.dataset.preset);
      if (preset) applyPreset(preset.inputs);
    });
  });
}