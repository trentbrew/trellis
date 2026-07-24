const { test, expect } = require('@playwright/test');

test.describe('TML v0.1 Kanban (/tml-lanes)', () => {
  test('renders three columns with issue cards', async ({ page }) => {
    await page.goto('/tml-lanes');
    await expect(page.getByRole('heading', { name: /TML v0\.1 · Kanban/ })).toBeVisible();
    const cols = page.locator('.kanban-col');
    await expect(cols).toHaveCount(3);
    await expect(cols.nth(0).locator('.col-title')).toHaveText('Backlog');
    await expect(cols.nth(1).locator('.col-title')).toHaveText('In Progress');
    await expect(cols.nth(2).locator('.col-title')).toHaveText('Done');
    await expect(page.locator('.issue-card').first()).toBeVisible({ timeout: 15_000 });
  });

  test('Backlog column uses not-group query', async ({ page }) => {
    await page.goto('/tml-lanes');
    const backlogBody = page.locator('[tml-ref="col-backlog"]');
    await expect(backlogBody).toHaveAttribute(
      'tml-query',
      /not \(status = 'in_progress'/,
    );
  });

  test('loads shared runtime theme contract', async ({ page, request }) => {
    const css = await request.get('/theme/runtime-theme.css');
    expect(css.ok()).toBeTruthy();
    expect(css.headers()['content-type']).toMatch(/text\/css/);

    await page.goto('/tml-lanes');
    await expect(page.locator('link[href="/theme/runtime-theme.css"]')).toHaveCount(1);

    const colMinWidth = await page.locator('.kanban-col').first().evaluate((el) =>
      getComputedStyle(el).minWidth,
    );
    expect(colMinWidth).toBe('300px');

    const cardStyle = await page.locator('.issue-card').first().evaluate((el) => {
      const s = getComputedStyle(el);
      return {
        borderRadius: s.borderRadius,
        paddingTop: s.paddingTop,
      };
    });
    expect(cardStyle.borderRadius).toBe('10px');
    expect(cardStyle.paddingTop).toBe('14px');
  });

  test('issue cards expose Phase C data-trellis-shell=card', async ({ page }) => {
    await page.goto('/tml-lanes');
    await expect(page.locator('.issue-card').first()).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('.issue-card[data-trellis-shell="card"]').first()).toBeVisible();
    const css = await page.request.get('/theme/runtime-theme.css');
    const body = await css.text();
    expect(body).toMatch(/--ui-vantage:\s*8/);
  });
});
