// tests/e2e.spec.mjs
// End-to-end checks for the whole UI. Run with `npx playwright test`.

import { test, expect } from '@playwright/test';

const URL = 'http://localhost:5173/app/index.html';

test.use({ viewport: { width: 1440, height: 900 } });

/** Common setup: flag E2E, go to URL, close the modal if present, wait for rate (best effort). */
async function loadApp(page) {
  await page.addInitScript(() => {
    // eslint-disable-next-line no-undef
    window.__E2E__ = true;
  });
  await page.goto(URL);

  const modal = page.locator('#setupModal');
  if (await modal.isVisible().catch(() => false)) {
    const cancel = page.locator('#cancelKeyBtn');
    if (await cancel.isVisible().catch(() => false)) {
      await cancel.click();
    } else {
      await modal.evaluate((el) => el.classList.add('hidden'));
    }
  }

  // Wait for the app to have initialized (chat welcome message or rate loaded).
  await page.waitForFunction(() => {
    const chat = document.getElementById('chat');
    const rate = document.getElementById('rateValue');
    return (chat && chat.textContent && chat.textContent.length > 10)
      || (rate && rate.textContent && rate.textContent !== '—');
  }, { timeout: 15000 }).catch(() => {});

  // Then wait for rate specifically. Do not throw here — let the test fail on a more meaningful assertion.
  await expect(page.locator('#rateValue')).not.toHaveText('—', { timeout: 20000 });
}

test('currency pair dropdowns update all labels', async ({ page }) => {
  await loadApp(page);

  await page.selectOption('#fromCountry', 'MY');
  await expect(page.locator('#rateFromLabel')).toHaveText('MYR', { timeout: 5000 });
  await expect(page.locator('#rateToLabel')).toHaveText('MMK');
  await expect(page.locator('#chatPairTag')).toHaveText('MYR → MMK');
  await expect(page.locator('#mcPairTag')).toHaveText('MYR → MMK');
  await expect(page.locator('#planFromLabel')).toHaveText('(MYR)');
  await expect(page.locator('#planToLabel')).toHaveText('(MMK)');

  await page.selectOption('#toCountry', 'IN');
  await expect(page.locator('#rateToLabel')).toHaveText('INR', { timeout: 5000 });
  await expect(page.locator('#chatPairTag')).toHaveText('MYR → INR');

  await page.selectOption('#fromCountry', 'CN');
  await page.selectOption('#toCountry', 'MM');
  await expect(page.locator('#chatPairTag')).toHaveText('CNY → MMK');
});

test('chat answers offline without asking for a key', async ({ page }) => {
  await loadApp(page);
  await page.fill('#chatInput', 'Compare sending 500 now vs 3 days vs 7 days');
  await page.click('#sendBtn');
  await expect(page.locator('#setupModal')).toHaveClass(/hidden/);
  await expect(page.locator('#chatResults .result-card').first()).toBeVisible({ timeout: 20000 });
  const cards = await page.locator('#chatResults .result-card').count();
  expect(cards).toBeGreaterThanOrEqual(3);
});

test('mission control: shields flip correctly on recipient and reserve changes', async ({ page }) => {
  await loadApp(page);
  await page.click('.nav-item[data-tab="mission"]');

  await expect(page.locator('#mcShield .mc-shield.ok').first()).toBeVisible({ timeout: 15000 });

  await page.fill('#mcAmount', '1000');
  await page.fill('#mcRecipientNeed', '900000');
  await expect(page.locator('#mcShield .mc-shield.bad').first()).toBeVisible({ timeout: 15000 });

  await page.fill('#mcRecipientNeed', '0');
  await page.fill('#mcReserve', '2500');
  const badShields = await page.locator('#mcShield .mc-shield.bad').count();
  expect(badShields).toBeGreaterThanOrEqual(1);
});

test('mission control: stress test numbers are consistent with what-if', async ({ page }) => {
  await loadApp(page);
  await page.click('.nav-item[data-tab="mission"]');

  await page.fill('#mcAmount', '2600');
  await page.fill('#mcRecipientNeed', '0');
  await page.fill('#mcReserve', '1000');
  await page.fill('#mcEssential', '800');
  await page.fill('#mcBalance', '3000');

  await expect(page.locator('#mcWhatIf .mc-card-payout').first()).toBeVisible({ timeout: 15000 });
  const whatIfText = await page.locator('#mcWhatIf .mc-card-payout').first().innerText();
  const whatIfMedian = Number(whatIfText.replace(/[^\d]/g, ''));
  expect(whatIfMedian).toBeGreaterThan(700000);
  expect(whatIfMedian).toBeLessThan(900000);

  await page.click('#mcCrashBtn');

  const crashBlocks = page.locator('#mcCrash .mc-crash-block');
  await expect(crashBlocks.first()).toBeVisible({ timeout: 30000 });
  const firstCardText = await crashBlocks.first().locator('.mc-crash-card').first().innerText();

  const match = firstCardText.match(/p50\s*([\d,]+)/);
  expect(match).not.toBeNull();
  const stressP50 = Number(match[1].replace(/,/g, ''));

  expect(stressP50).toBeLessThan(whatIfMedian);
  expect(stressP50).toBeGreaterThan(whatIfMedian * 0.9);
  expect(stressP50).toBeLessThan(1000000);

  const recipientFails = await crashBlocks.first().locator('.mc-crash-card').filter({ hasText: 'Recipient FAIL' }).count();
  expect(recipientFails).toBe(0);
});

test('data source label shows a reference date, not "Fetched X ago"', async ({ page }) => {
  await loadApp(page);
  await page.click('.nav-item[data-tab="mission"]');
  await expect(page.locator('#mcRateSource')).not.toHaveText('—', { timeout: 15000 });
  const source = await page.locator('#mcRateSource').innerText();
  const fetched = await page.locator('#mcRateFetchedAt').innerText();
  if (source === 'REFERENCE') {
    expect(fetched).toMatch(/Reference dated/);
    expect(fetched).not.toMatch(/ago/);
  } else if (source === 'WISE LIVE') {
    expect(fetched).toMatch(/Fetched/);
  }
});

test('judge presets repopulate the what-if inputs', async ({ page }) => {
  await loadApp(page);
  await page.click('.nav-item[data-tab="mission"]');

  const presets = page.locator('#mcJudge [data-preset]');
  expect(await presets.count()).toBe(3);

  await presets.nth(1).click();
  await expect(page.locator('#mcAmount')).toHaveValue('2600', { timeout: 5000 });

  await presets.nth(0).click();
  await expect(page.locator('#mcDeadline')).toHaveValue('4', { timeout: 5000 });
});

test('passport export produces a markdown file', async ({ page }) => {
  await loadApp(page);
  await page.click('.nav-item[data-tab="mission"]');

  await page.fill('#mcAmount', '1000');
  await page.fill('#mcRecipientNeed', '0');
  await page.fill('#mcReserve', '1000');

  await page.click('#mcPassportRender');
  await expect(page.locator('#mcPassportOut .mc-passport')).toBeVisible({ timeout: 15000 });

  const downloadPromise = page.waitForEvent('download');
  await page.click('#mcPassportExport');
  const download = await downloadPromise;
  const name = download.suggestedFilename();
  expect(name).toMatch(/decision-passport-.+\.md/);

  const path = await download.path();
  const fs = await import('node:fs');
  const md = fs.readFileSync(path, 'utf8');
  expect(md).toMatch(/Financial Decision Passport/);
  expect(md).not.toMatch(/gsk_/);
});

test('human approval is required: chat proposal stays pending', async ({ page }) => {
  await loadApp(page);
  await page.fill('#chatInput', 'Please send 800 now');
  await page.click('#sendBtn');

  await expect(page.locator('#chatResults')).toContainText(/PENDING|pending/i, { timeout: 20000 });

  const approveBtn = page.locator('#chatResults [data-act="approve"]');
  await expect(approveBtn).toBeVisible();
  await approveBtn.click();
  await expect(page.locator('#chatResults')).toContainText(/EXECUTED/);
});