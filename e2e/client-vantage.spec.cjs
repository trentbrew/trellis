const { test, expect } = require('@playwright/test');

test.describe('Client vantage scrubber (/client)', () => {
  test('default Card detent — vantage 8, shell card', async ({ page }) => {
    await page.goto('/client');
    await expect(page.locator('#vantage-scrubber')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('#main')).toHaveAttribute('data-ui-vantage', '8');
    await expect(page.locator('#ui-thing')).toHaveAttribute('data-trellis-shell', 'card');
  });

  test('Node detent → vantage 2, shell node', async ({ page }) => {
    await page.goto('/client');
    await page.locator('.detent[data-shell="node"]').click();
    await expect(page.locator('#main')).toHaveAttribute('data-ui-vantage', '2');
    await expect(page.locator('#ui-thing')).toHaveAttribute('data-trellis-shell', 'node');
  });

  test('Row detent → vantage 5, shell row', async ({ page }) => {
    await page.goto('/client');
    await page.locator('.detent[data-shell="row"]').click();
    await expect(page.locator('#main')).toHaveAttribute('data-ui-vantage', '5');
    await expect(page.locator('#ui-thing')).toHaveAttribute('data-trellis-shell', 'row');
  });

  test('Card detent → vantage 8, shell card', async ({ page }) => {
    await page.goto('/client');
    await page.locator('.detent[data-shell="node"]').click();
    await page.locator('.detent[data-shell="card"]').click();
    await expect(page.locator('#main')).toHaveAttribute('data-ui-vantage', '8');
    await expect(page.locator('#ui-thing')).toHaveAttribute('data-trellis-shell', 'card');
  });

  test('Arrow keys move shell from focused detent', async ({ page }) => {
    await page.goto('/client');
    await page.locator('.detent[aria-checked="true"]').focus();
    await page.keyboard.press('ArrowLeft');
    await expect(page.locator('#main')).toHaveAttribute('data-ui-vantage', '5');
    await expect(page.locator('#ui-thing')).toHaveAttribute('data-trellis-shell', 'row');
    await page.keyboard.press('ArrowLeft');
    await expect(page.locator('#main')).toHaveAttribute('data-ui-vantage', '2');
    await expect(page.locator('#ui-thing')).toHaveAttribute('data-trellis-shell', 'node');
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('#main')).toHaveAttribute('data-ui-vantage', '5');
    await expect(page.locator('#ui-thing')).toHaveAttribute('data-trellis-shell', 'row');
  });
});
