import { expect, test } from '@playwright/test';

const WC_E2E = process.env.WC_E2E === '1';

test.describe('WC CLI sandbox boot', () => {
  test.skip(!WC_E2E, 'Set WC_E2E=1 to run WebContainer sandbox boot (slow)');

  test('boots trellis init + terminal on :4321', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('#status')).toContainText('Ready', {
      timeout: 300_000,
    });
    await expect(page.locator('#wc-badge')).toContainText('WebContainer', {
      timeout: 30_000,
    });
    await expect(page.locator('#graph-badge')).toContainText('Graph live', {
      timeout: 30_000,
    });
  });
});
