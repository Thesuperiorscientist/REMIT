// setup.js
// Handles the Financial Twin setup form.

import { projectTwin, narrateTwin } from '../engine/twin.js';
import { renderTwin } from './twin.js';
import { getLiveRate } from '../engine/rateEngine.js';

/**
 * Wire up the setup form.
 * @param {Object} opts
 * @param {Function} opts.onBuilt - callback(result, narrative)
 */
export function initSetup({ onBuilt }) {
  const $ = (id) => document.getElementById(id);

  $('setupTwinBtn').addEventListener('click', async () => {
    const income = Number($('inIncome').value) || 0;
    const costs = Number($('inCosts').value) || 0;
    const savings = Number($('inSavings').value) || 0;
    const remit = Number($('inRemit').value) || 0;

    if (income <= 0) {
      alert('Please enter a valid monthly income.');
      return;
    }

    const { rate } = await getLiveRate();

    const result = projectTwin({
      income,
      costs,
      savings,
      remit,
      baseRate: rate,
    });

    const narrative = narrateTwin(result);

    // Hide empty state, show content
    $('twinEmpty').classList.add('hidden');
    const content = $('twinContent');
    content.classList.remove('hidden');
    content.innerHTML = '';

    renderTwin(content, result);

    // Add narrative block
    const narr = document.createElement('div');
    narr.className = 'narrative';
    narr.textContent = narrative;
    content.appendChild(narr);

    // Update tag
    $('twinTag').textContent = 'ACTIVE';

    onBuilt(result, narrative);
  });
}