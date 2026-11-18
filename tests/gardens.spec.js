import { expect, test } from '@playwright/test';

test('orbit the gardens, reset, and enter the existing study', async ({ page, isMobile }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/gardens.html');
  const canvas = page.locator('#gardens-view');
  const reset = page.getByRole('button', { name: 'Reset view' });
  const marker = page.getByRole('link', { name: 'Enter the top-floor study' });
  await expect(reset).toBeVisible();
  await expect(marker).toBeVisible();
  const initial = await canvas.getAttribute('data-orbit');
  const { x, y, width, height } = await canvas.boundingBox();
  const start = { x: x + width * .30, y: y + height * .60 };
  if (isMobile) {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [start] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: start.x + 100, y: start.y }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await cdp.detach();
  } else {
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(start.x + 100, start.y, { steps: 4 });
    await page.mouse.up();
  }
  await expect(canvas).not.toHaveAttribute('data-orbit', initial);
  await reset.click();
  await expect(canvas).toHaveAttribute('data-orbit', initial);
  const rotate = page.getByRole('button', { name: 'Rotate right' });
  await rotate.focus();
  await rotate.press('Enter');
  await expect(canvas).not.toHaveAttribute('data-orbit', initial);
  await reset.click();
  if (isMobile) await marker.tap();
  else await marker.click();
  await expect(page).toHaveURL('/', { timeout: 10000 });
  await expect(page.getByRole('link', { name: 'Cornwall Gardens' })).toBeVisible();
  await expect(page.locator('#room-targets')).toBeVisible();
  await page.goBack();
  await expect(marker).toBeVisible();
  expect(errors).toEqual([]);
});

test('the study link still works without JavaScript', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.goto('/gardens.html');
    await expect(page.locator('.gardens-noscript')).toBeVisible();
    await page.getByRole('link', { name: 'Enter the study' }).click();
    await expect(page).toHaveURL('/');
    await expect(page.locator('#content')).toBeVisible();
  } finally {
    await context.close();
  }
});
