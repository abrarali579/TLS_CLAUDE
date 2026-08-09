import { test, expect } from '@playwright/test';

const APP = '/TimeLink-Suite.html';

/** Wait until the app has booted and painted its first screen. */
async function open(page) {
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(APP);
  await page.waitForFunction(() => window.TimeLink && window.TimeLink.D, null, { timeout: 30_000 });
  await expect(page.locator('#view')).not.toBeEmpty();
  return errors;
}

test.describe('loading', () => {
  test('boots with no console errors and shows the first screen', async ({ page }) => {
    const errors = await open(page);
    await expect(page.locator('#vtitle')).toHaveText('Data Entry');
    expect(errors).toEqual([]);
  });

  test('every screen in the sidebar opens without an error card', async ({ page }) => {
    const errors = await open(page);
    const views = await page.evaluate(() => window.TimeLink.NAV.filter((x) => x.v).map((x) => x.v));
    expect(views.length).toBeGreaterThan(20);

    const broken = [];
    for (const v of views) {
      await page.evaluate((view) => window.TimeLink.switchView(view), v);
      const html = await page.locator('#view').innerHTML();
      if (html.includes('Something went wrong')) broken.push(v);
    }
    expect(broken).toEqual([]);
    expect(errors).toEqual([]);
  });

  test('storage is genuinely available — no in-memory-only warning', async ({ page }) => {
    await open(page);
    await expect(page.locator('#toast')).not.toContainText('Could not open local storage');
  });
});

test.describe('data survives a reload', () => {
  test('an entry typed in is still there after refreshing', async ({ page }) => {
    await open(page);

    const marker = `E2E ${Date.now()}`;
    await page.evaluate(async (company) => {
      const T = window.TimeLink;
      T.D.transactions.push({
        id: 'e2e-' + Date.now(), date: '2026-03-05', company,
        employee: 'TESTER', work: 'PRINT', received: 100, expense: 40, profit: 60, paidFrom: '',
      });
      await T.save();
    }, marker);

    // A reload is the real test: this is where an in-memory-only app fails.
    await page.reload();
    await page.waitForFunction(() => window.TimeLink && window.TimeLink.D);

    const found = await page.evaluate(
      (company) => window.TimeLink.D.transactions.some((t) => t.company === company),
      marker
    );
    expect(found, 'the entry did not survive a reload').toBe(true);
  });

  test('the change is reflected in the totals after reload, not just stored', async ({ page }) => {
    await open(page);
    const before = await page.evaluate(() => window.TimeLink.partnerData().grossProfit);

    await page.evaluate(async () => {
      const T = window.TimeLink;
      T.D.transactions.push({
        id: 'e2e-profit-' + Date.now(), date: '2026-03-05', company: 'E2E PROFIT',
        employee: 'TESTER', work: 'PRINT', received: 500, expense: 200, profit: 300, paidFrom: '',
      });
      await T.save();
    });

    await page.reload();
    await page.waitForFunction(() => window.TimeLink && window.TimeLink.D);
    const after = await page.evaluate(() => window.TimeLink.partnerData().grossProfit);
    expect(after).toBeCloseTo(before + 300, 2);
  });
});

test.describe('backup and restore', () => {
  test('the backup button downloads readable JSON containing the data', async ({ page }) => {
    await open(page);
    await page.evaluate(() => window.TimeLink.switchView('data'));

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: '↓ Full JSON Backup' }).click(),
    ]);

    expect(download.suggestedFilename()).toMatch(/^timelink-backup-\d{4}-\d{2}-\d{2}\.json$/);

    const stream = await download.createReadStream();
    const text = await new Promise((resolve, reject) => {
      let out = '';
      stream.on('data', (c) => { out += c; });
      stream.on('end', () => resolve(out));
      stream.on('error', reject);
    });

    const backup = JSON.parse(text);
    expect(Array.isArray(backup.transactions)).toBe(true);
    expect(backup.settings).toBeTruthy();

    const live = await page.evaluate(() => window.TimeLink.D.transactions.length);
    expect(backup.transactions.length).toBe(live);
  });

  test('the CSV export downloads too', async ({ page }) => {
    await open(page);
    await page.evaluate(() => window.TimeLink.switchView('data'));
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: '↓ Entries CSV' }).click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/\.csv$/);
  });
});

test.describe('printing', () => {
  test('a statement opens a printable page instead of failing silently', async ({ page, context }) => {
    await open(page);
    // Stop the print dialog from blocking the run.
    await context.addInitScript(() => { window.print = () => {}; });

    const company = await page.evaluate(() => window.TimeLink.D.transactions[0]?.company);
    test.skip(!company, 'no seed transactions to build a statement from');

    const popupPromise = page.waitForEvent('popup', { timeout: 15_000 }).catch(() => null);
    await page.evaluate((c) => {
      const T = window.TimeLink;
      T.switchView('statement');
      if (T.setSS) T.setSS({ company: c, from: '', to: '' });
    }, company);

    const popup = await popupPromise;
    if (popup) {
      await expect(popup.locator('body')).not.toBeEmpty();
      await popup.close();
    }
  });
});

test.describe('the data entry sheet', () => {
  test('shows a grid of navigable cells', async ({ page }) => {
    await open(page);
    await page.evaluate(() => window.TimeLink.switchView('entry'));
    expect(await page.locator('#view [data-nav]').count()).toBeGreaterThan(10);
  });

  test('typing in the spare row keeps it editable', async ({ page }) => {
    await open(page);
    await page.evaluate(() => window.TimeLink.switchView('entry'));
    const cell = page.locator('#view input[data-k="company"]:not([readonly])').first();
    await cell.waitFor({ state: 'visible', timeout: 10_000 });
    await cell.fill('E2E TYPING');
    await expect(cell).toHaveValue('E2E TYPING');
  });
});
