import { test, expect } from '@playwright/test';

for (const id of ['academia', 'georgian', 'crafts', 'gothic', 'country', 'victorian']) {
  test(`${id} opens the portfolio with that style applied`, async ({ page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/styles.html');
    await expect(page.locator('#scene-status')).not.toBeVisible();
    await expect(page.locator('.style-option')).toHaveCount(6);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const option = page.locator(`.style-option[data-style="${id}"]`);
    await option.click();
    await expect(page).toHaveURL(new RegExp(`/\\?style=${id}$`));
    await expect(page.locator('#room')).toHaveAttribute('data-style', id);
    await expect(page.locator('#room-targets')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(errors).toEqual([]);
  });
}

test('chosen style has a shareable deep link', async ({ page }) => {
  await page.goto('/styles.html?style=georgian');
  await expect(page.locator('.style-option[data-style="georgian"]')).toHaveAttribute('aria-current', 'true');
  await expect(page.locator('#preview-name')).toHaveText('Georgian blue');
  await page.locator('#choose-style').click();
  await expect(page).toHaveURL(/\/\?style=georgian$/);
  await expect(page.locator('#room-targets')).toBeVisible();
});
