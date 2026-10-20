// twin.js
// Renders the Financial Twin dashboard.

import { formatNumber, formatMYR } from './format.js';

/**
 * Render the twin dashboard into the container.
 * @param {HTMLElement} container
 * @param {Object} result - output of projectTwin()
 */
export function renderTwin(container, result) {
  const { profile, monthlyNet, simulation, bestMonth, riskLevel } = result;

  container.innerHTML = '';

  // ---- Summary stats ----
  const summary = document.createElement('div');
  summary.className = 'twin-summary';
  summary.innerHTML = `
    <div class="stat-box">
      <div class="stat-label">Monthly net</div>
      <div class="stat-value ${monthlyNet >= 0 ? 'good' : 'bad'}">
        ${monthlyNet >= 0 ? '+' : ''}${formatNumber(monthlyNet)}
      </div>
    </div>
    <div class="stat-box">
      <div class="stat-label">Starting savings</div>
      <div class="stat-value small">${formatNumber(profile.savings)}</div>
    </div>
    <div class="stat-box highlight">
      <div class="stat-label">Savings in 12 mo (median)</div>
      <div class="stat-value small">${formatNumber(simulation.balance.p50)}</div>
    </div>
    <div class="stat-box">
      <div class="stat-label">Risk of running out</div>
      <div class="stat-value small ${riskLevel === 'high' ? 'bad' : riskLevel === 'medium' ? '' : 'good'}">
        ${(simulation.ranOutProbability * 100).toFixed(1)}%
      </div>
    </div>
  `;
  container.appendChild(summary);

  // ---- 12-month forecast bars ----
  const forecast = document.createElement('div');
  forecast.className = 'forecast';
  forecast.innerHTML = `<h4>12-Month Savings Forecast (median)</h4>`;

  const balances = result.deterministic.map((d) => d.balance);
  const maxBal = Math.max(...balances, 1);
  const minBal = Math.min(...balances, 0);

  for (const d of result.deterministic) {
    const row = document.createElement('div');
    row.className = 'forecast-row';

    // Negative balance → red bar
    const isBad = d.balance < 0;
    const widthPct = Math.abs(d.balance) / maxBal * 100;

    row.innerHTML = `
      <span>M${d.month}</span>
      <div class="forecast-bar-wrap">
        <div class="forecast-bar ${isBad ? 'bad' : 'good'}" style="width:${widthPct}%"></div>
      </div>
      <span style="text-align:right">${formatNumber(d.balance)}</span>
    `;
    forecast.appendChild(row);
  }
  container.appendChild(forecast);

  // ---- Best month to remit ----
  const best = document.createElement('div');
  best.className = 'insight-card';
  best.innerHTML = `
    <h4>Best Month to Remit <span class="badge good">MONTH ${bestMonth.month}</span></h4>
    <div class="kv"><span class="k">Avg rate that month</span><span class="v">${bestMonth.avgRate.toFixed(2)} MMK/MYR</span></div>
    <div class="kv"><span class="k">Improvement vs now</span><span class="v good">+${bestMonth.improvementPct.toFixed(2)}%</span></div>
  `;
  container.appendChild(best);

  // ---- MMK sent home ----
  const sent = document.createElement('div');
  sent.className = 'insight-card';
  sent.innerHTML = `
    <h4>Total MMK Sent Home (12 mo)</h4>
    <div class="kv"><span class="k">10th percentile</span><span class="v bad">${formatNumber(simulation.totalSentMMK.p10)}</span></div>
    <div class="kv"><span class="k">Median</span><span class="v good">${formatNumber(simulation.totalSentMMK.p50)}</span></div>
    <div class="kv"><span class="k">90th percentile</span><span class="v good">${formatNumber(simulation.totalSentMMK.p90)}</span></div>
  `;
  container.appendChild(sent);
}