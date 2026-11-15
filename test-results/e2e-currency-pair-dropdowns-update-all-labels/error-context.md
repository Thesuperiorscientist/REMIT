# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e.spec.mjs >> currency pair dropdowns update all labels
- Location: tests\e2e.spec.mjs:40:1

# Error details

```
Test timeout of 60000ms exceeded.
```

```
Error: expect(locator).not.toHaveText(expected) failed

Locator:  locator('#rateValue')
Expected: not "—"
Received: ""

```

# Page snapshot

```yaml
- generic [ref=e1]:
  - generic [ref=e2]:
    - complementary "Primary navigation" [ref=e3]:
      - generic [ref=e4]:
        - generic [ref=e5]: REMIT
        - generic [ref=e14]: Mission Control
      - button "Chat" [ref=e15]: 💬Chat
      - button "Mission Control" [ref=e16]: 🛰️Mission Control
      - button "Financial Twin" [ref=e17]: 📊Financial Twin
      - button "Insights" [ref=e18]: 📈Insights
      - button "Planner" [ref=e19]: 🎯Planner
      - button "Settings" [ref=e20]: ⚙️Settings
    - main [ref=e21]:
      - generic [ref=e22]:
        - generic [ref=e23]: Agent Chat
        - generic [ref=e25]:
          - generic [ref=e26]:
            - text: From
            - combobox "From country" [ref=e27]:
              - option "🇨🇳 China (CNY)" [selected]
          - generic [aria-hidden] [ref=e28]: →
          - generic [ref=e29]:
            - text: To
            - combobox "To country" [ref=e30]:
              - option "🇲🇲 Myanmar (MMK)" [selected]
        - generic [ref=e31]: 1 CNY = — MMK LOADING
      - region "Agent Chat" [ref=e32]:
        - generic [ref=e33]:
          - generic [ref=e34]:
            - generic [ref=e35]: Conversation CNY → MMK
            - log
            - generic [ref=e36]:
              - textbox "Message to the agent" [ref=e37]:
                - /placeholder: Ask about a transfer...
              - button "Send" [ref=e38]
          - generic [ref=e39]:
            - generic [ref=e40]: Results —
            - generic [ref=e41]: Simulation results will appear here after you ask a question.
      - generic [ref=e44]:
        - generic [ref=e45]:
          - generic [ref=e46]: Mission Control CNY → MMK
          - group "What-if inputs" [ref=e47]:
            - generic [ref=e48]:
              - text: Amount to send
              - spinbutton "Amount to send" [ref=e49]: "1000"
            - generic [ref=e50]:
              - text: Deadline (days)
              - spinbutton "Deadline (days)" [ref=e51]: "7"
            - generic [ref=e52]:
              - text: Recipient minimum
              - spinbutton "Recipient minimum" [ref=e53]: "0"
            - generic [ref=e54]:
              - text: Strategy
              - combobox "Strategy" [ref=e55]:
                - option "Send now" [selected]
                - option "Wait 3 days"
                - option "Wait 7 days"
                - option "Split 60/40"
            - generic [ref=e56]:
              - text: Sender balance
              - spinbutton "Sender balance" [ref=e57]: "3000"
            - generic [ref=e58]:
              - text: Essential expenses
              - spinbutton "Essential expenses" [ref=e59]: "800"
            - generic [ref=e60]:
              - text: Emergency reserve
              - spinbutton "Emergency reserve" [ref=e61]: "1000"
            - generic [ref=e62]:
              - text: Hypothetical shock
              - combobox "Hypothetical shock" [ref=e63]:
                - option "No shock" [selected]
                - option "Rate −5%"
                - option "Rate −10%"
                - option "Fees +1.5 pp"
                - option "Delay +2 days"
                - option "Rate −5% + Fees +1.5 pp + Delay"
          - button "Stress-test my plan" [ref=e65]
          - generic [ref=e66]:
            - button "Build passport" [ref=e67]
            - button "Export (.md)" [ref=e68]
        - generic [ref=e69]:
          - heading "Judge Challenge Mode" [level=3] [ref=e71]
          - generic [ref=e72]:
            - heading "Safety" [level=3] [ref=e73]
            - generic [ref=e74]: The AI can never move money. Approval happens only when a human clicks Approve on a sandbox proposal. Hypothetical shocks are clearly labelled and never presented as forecasts.
          - generic [ref=e75]:
            - heading "Data source" [level=3] [ref=e76]
            - generic [ref=e77]: Rate source—
            - generic [ref=e78]: Fetched—
            - generic [ref=e79]: Live Wise when reachable, otherwise a dated reference rate. Not a forecast.
      - generic [ref=e81]:
        - generic [ref=e82]:
          - generic [ref=e83]: Financial Twin NOT SET
          - generic [ref=e85]:
            - generic [ref=e86]:
              - text: Monthly income (source)
              - spinbutton "Monthly income (source)" [ref=e87]
            - generic [ref=e88]:
              - text: Fixed costs (source)
              - spinbutton "Fixed costs (source)" [ref=e89]
            - generic [ref=e90]:
              - text: Current savings (source)
              - spinbutton "Current savings (source)" [ref=e91]
            - generic [ref=e92]:
              - text: Monthly remittance (source)
              - spinbutton "Monthly remittance (source)" [ref=e93]
            - button "Build Financial Twin" [ref=e95]
        - generic [ref=e96]:
          - generic [ref=e97]:
            - heading "Twin Status" [level=3] [ref=e98]
            - generic [ref=e99]: ProfileNot set
            - generic [ref=e100]: Horizon12 months
            - generic [ref=e101]: Simulations1,000
          - generic [ref=e102]:
            - heading "Quick Tips" [level=3] [ref=e103]
            - generic [ref=e104]: Enter your real numbers for an accurate projection. The Twin uses the active pair and simulates 12 months forward.
      - generic [ref=e106]:
        - generic [ref=e107]:
          - generic [ref=e108]: Full Simulation Results —
          - generic [ref=e109]: Run a simulation in the Chat tab to see full results here.
        - generic [ref=e111]:
          - generic [ref=e112]:
            - heading "Method" [level=3] [ref=e113]
            - generic [ref=e114]: ModelMultiplicative random walk
            - generic [ref=e115]: Paths1,000
            - generic [ref=e116]: Volatility0.8%/day (assumed)
            - generic [ref=e117]: Drift0 (assumed)
          - generic [ref=e118]:
            - heading "Disclaimer" [level=3] [ref=e119]
            - generic [ref=e120]: Probabilities shown are model-based, not empirically verified. This is not financial advice.
      - generic [ref=e122]:
        - generic [ref=e123]:
          - generic [ref=e124]: Transfer Planner STRATEGY ENGINE
          - generic [ref=e126]:
            - generic [ref=e127]:
              - generic [ref=e128]: Amount to send (CNY)
              - spinbutton "Amount to send (CNY)" [ref=e129]
            - generic [ref=e130]:
              - generic [ref=e131]: Recipient needs (MMK)
              - spinbutton "Recipient needs (MMK)" [ref=e132]
            - generic [ref=e133]:
              - text: Deadline (days)
              - spinbutton "Deadline (days)" [ref=e134]: "30"
            - generic [ref=e135]:
              - text: Objective
              - combobox "Objective" [ref=e136]:
                - option "Maximize expected payout" [selected]
                - option "Minimize risk of missing requirement"
                - option "Maximize payout, cap downside"
            - button "Run Analysis" [ref=e138]
        - generic [ref=e139]:
          - generic [ref=e140]:
            - heading "How it works" [level=3] [ref=e141]
            - generic [ref=e142]:
              - text: "The Planner compares three strategies under your objective:"
              - strong [ref=e143]: Send now
              - text: — deterministic, no uncertainty.
              - strong [ref=e144]: Wait N days
              - text: — simulated outcome at deadline.
              - strong [ref=e145]: Split
              - text: — part now, part later. Every strategy respects your deadline and is evaluated on 1,000 Monte Carlo paths.
          - generic [ref=e146]:
            - heading "Disclaimer" [level=3] [ref=e147]
            - generic [ref=e148]: Recommendations are model-based, not financial advice. Always verify with your provider before executing.
  - dialog [ref=e149]:
    - generic [ref=e150]:
      - heading "⚡ Connect a live LLM (optional)" [level=3] [ref=e151]
      - paragraph [ref=e152]: The demo works fully offline. Adding a Groq key only enables free-form chat. The tool layer, guardrails and human approval are identical.
      - text: Groq API Key
      - textbox "Groq API Key" [ref=e153]:
        - /placeholder: gsk_...
      - generic [ref=e154]:
        - button "Enable LLM" [ref=e155]
        - button "Cancel" [active] [ref=e156]
```

# Test source

```ts
  1   | // tests/e2e.spec.mjs
  2   | // End-to-end checks for the whole UI. Run with `npx playwright test`.
  3   | 
  4   | import { test, expect } from '@playwright/test';
  5   | 
  6   | const URL = 'http://localhost:5173/app/index.html';
  7   | 
  8   | test.use({ viewport: { width: 1440, height: 900 } });
  9   | 
  10  | /** Common setup: flag E2E, go to URL, close the modal if present, wait for rate (best effort). */
  11  | async function loadApp(page) {
  12  |   await page.addInitScript(() => {
  13  |     // eslint-disable-next-line no-undef
  14  |     window.__E2E__ = true;
  15  |   });
  16  |   await page.goto(URL);
  17  | 
  18  |   const modal = page.locator('#setupModal');
  19  |   if (await modal.isVisible().catch(() => false)) {
  20  |     const cancel = page.locator('#cancelKeyBtn');
  21  |     if (await cancel.isVisible().catch(() => false)) {
  22  |       await cancel.click();
  23  |     } else {
  24  |       await modal.evaluate((el) => el.classList.add('hidden'));
  25  |     }
  26  |   }
  27  | 
  28  |   // Wait for the app to have initialized (chat welcome message or rate loaded).
  29  |   await page.waitForFunction(() => {
  30  |     const chat = document.getElementById('chat');
  31  |     const rate = document.getElementById('rateValue');
  32  |     return (chat && chat.textContent && chat.textContent.length > 10)
  33  |       || (rate && rate.textContent && rate.textContent !== '—');
  34  |   }, { timeout: 15000 }).catch(() => {});
  35  | 
  36  |   // Then wait for rate specifically. Do not throw here — let the test fail on a more meaningful assertion.
> 37  |   await expect(page.locator('#rateValue')).not.toHaveText('—', { timeout: 20000 });
      |                                                ^ Error: expect(locator).not.toHaveText(expected) failed
  38  | }
  39  | 
  40  | test('currency pair dropdowns update all labels', async ({ page }) => {
  41  |   await loadApp(page);
  42  | 
  43  |   await page.selectOption('#fromCountry', 'MY');
  44  |   await expect(page.locator('#rateFromLabel')).toHaveText('MYR', { timeout: 5000 });
  45  |   await expect(page.locator('#rateToLabel')).toHaveText('MMK');
  46  |   await expect(page.locator('#chatPairTag')).toHaveText('MYR → MMK');
  47  |   await expect(page.locator('#mcPairTag')).toHaveText('MYR → MMK');
  48  |   await expect(page.locator('#planFromLabel')).toHaveText('(MYR)');
  49  |   await expect(page.locator('#planToLabel')).toHaveText('(MMK)');
  50  | 
  51  |   await page.selectOption('#toCountry', 'IN');
  52  |   await expect(page.locator('#rateToLabel')).toHaveText('INR', { timeout: 5000 });
  53  |   await expect(page.locator('#chatPairTag')).toHaveText('MYR → INR');
  54  | 
  55  |   await page.selectOption('#fromCountry', 'CN');
  56  |   await page.selectOption('#toCountry', 'MM');
  57  |   await expect(page.locator('#chatPairTag')).toHaveText('CNY → MMK');
  58  | });
  59  | 
  60  | test('chat answers offline without asking for a key', async ({ page }) => {
  61  |   await loadApp(page);
  62  |   await page.fill('#chatInput', 'Compare sending 500 now vs 3 days vs 7 days');
  63  |   await page.click('#sendBtn');
  64  |   await expect(page.locator('#setupModal')).toHaveClass(/hidden/);
  65  |   await expect(page.locator('#chatResults .result-card').first()).toBeVisible({ timeout: 20000 });
  66  |   const cards = await page.locator('#chatResults .result-card').count();
  67  |   expect(cards).toBeGreaterThanOrEqual(3);
  68  | });
  69  | 
  70  | test('mission control: shields flip correctly on recipient and reserve changes', async ({ page }) => {
  71  |   await loadApp(page);
  72  |   await page.click('.nav-item[data-tab="mission"]');
  73  | 
  74  |   await expect(page.locator('#mcShield .mc-shield.ok').first()).toBeVisible({ timeout: 15000 });
  75  | 
  76  |   await page.fill('#mcAmount', '1000');
  77  |   await page.fill('#mcRecipientNeed', '900000');
  78  |   await expect(page.locator('#mcShield .mc-shield.bad').first()).toBeVisible({ timeout: 15000 });
  79  | 
  80  |   await page.fill('#mcRecipientNeed', '0');
  81  |   await page.fill('#mcReserve', '2500');
  82  |   const badShields = await page.locator('#mcShield .mc-shield.bad').count();
  83  |   expect(badShields).toBeGreaterThanOrEqual(1);
  84  | });
  85  | 
  86  | test('mission control: stress test numbers are consistent with what-if', async ({ page }) => {
  87  |   await loadApp(page);
  88  |   await page.click('.nav-item[data-tab="mission"]');
  89  | 
  90  |   await page.fill('#mcAmount', '2600');
  91  |   await page.fill('#mcRecipientNeed', '0');
  92  |   await page.fill('#mcReserve', '1000');
  93  |   await page.fill('#mcEssential', '800');
  94  |   await page.fill('#mcBalance', '3000');
  95  | 
  96  |   await expect(page.locator('#mcWhatIf .mc-card-payout').first()).toBeVisible({ timeout: 15000 });
  97  |   const whatIfText = await page.locator('#mcWhatIf .mc-card-payout').first().innerText();
  98  |   const whatIfMedian = Number(whatIfText.replace(/[^\d]/g, ''));
  99  |   expect(whatIfMedian).toBeGreaterThan(700000);
  100 |   expect(whatIfMedian).toBeLessThan(900000);
  101 | 
  102 |   await page.click('#mcCrashBtn');
  103 | 
  104 |   const crashBlocks = page.locator('#mcCrash .mc-crash-block');
  105 |   await expect(crashBlocks.first()).toBeVisible({ timeout: 30000 });
  106 |   const firstCardText = await crashBlocks.first().locator('.mc-crash-card').first().innerText();
  107 | 
  108 |   const match = firstCardText.match(/p50\s*([\d,]+)/);
  109 |   expect(match).not.toBeNull();
  110 |   const stressP50 = Number(match[1].replace(/,/g, ''));
  111 | 
  112 |   expect(stressP50).toBeLessThan(whatIfMedian);
  113 |   expect(stressP50).toBeGreaterThan(whatIfMedian * 0.9);
  114 |   expect(stressP50).toBeLessThan(1000000);
  115 | 
  116 |   const recipientFails = await crashBlocks.first().locator('.mc-crash-card').filter({ hasText: 'Recipient FAIL' }).count();
  117 |   expect(recipientFails).toBe(0);
  118 | });
  119 | 
  120 | test('data source label shows a reference date, not "Fetched X ago"', async ({ page }) => {
  121 |   await loadApp(page);
  122 |   await page.click('.nav-item[data-tab="mission"]');
  123 |   await expect(page.locator('#mcRateSource')).not.toHaveText('—', { timeout: 15000 });
  124 |   const source = await page.locator('#mcRateSource').innerText();
  125 |   const fetched = await page.locator('#mcRateFetchedAt').innerText();
  126 |   if (source === 'REFERENCE') {
  127 |     expect(fetched).toMatch(/Reference dated/);
  128 |     expect(fetched).not.toMatch(/ago/);
  129 |   } else if (source === 'WISE LIVE') {
  130 |     expect(fetched).toMatch(/Fetched/);
  131 |   }
  132 | });
  133 | 
  134 | test('judge presets repopulate the what-if inputs', async ({ page }) => {
  135 |   await loadApp(page);
  136 |   await page.click('.nav-item[data-tab="mission"]');
  137 | 
```