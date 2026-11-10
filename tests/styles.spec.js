import { test, expect } from '@playwright/test';

test('style preview compares six directions without changing the portfolio default', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/styles.html');
  await expect(page.locator('#scene-status')).not.toBeVisible();
  await expect(page.locator('.style-option')).toHaveCount(6);
  for (const id of ['academia', 'georgian', 'crafts', 'gothic', 'country', 'victorian']) {
    const option = page.locator(`[data-style="${id}"]`);
    await option.click();
    await expect(option).toHaveAttribute('aria-pressed', 'true');
    await expect(page).toHaveURL(new RegExp(`style=${id}$`));
    await expect(page.locator('#choose-style')).toHaveAttribute('href', `./?style=${id}`);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test('chosen style has a shareable deep link', async ({ page }) => {
  await page.goto('/styles.html?style=georgian');
  await expect(page.locator('[data-style="georgian"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#preview-name')).toHaveText('Georgian blue');
  await page.locator('#choose-style').click();
  await expect(page).toHaveURL(/\/\?style=georgian$/);
  await expect(page.locator('#room-targets')).toBeVisible();
});
