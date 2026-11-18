import { expect, test } from '@playwright/test';

test('orbit, zoom to the top floor without navigation, and reset', async ({ page, isMobile }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/gardens.html');
  const canvas = page.locator('#gardens-view');
  const reset = page.getByRole('button', { name: 'Reset view' });
  await expect(reset).toBeVisible();
  await expect(page.getByRole('link', { name: /Enter/ })).toHaveCount(0);
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
  await page.getByRole('button', { name: 'View top floor' }).click();
  await expect(canvas).toHaveAttribute('data-view', 'workspace');
  await expect(page).toHaveURL('/gardens.html');
  await expect(canvas).not.toHaveAttribute('data-orbit', initial);
  await reset.click();
  await expect(canvas).toHaveAttribute('data-view', 'gardens');
  await expect(canvas).toHaveAttribute('data-orbit', initial);
  expect(errors).toEqual([]);
});

test('without JavaScript the map explains the requirement', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.goto('/gardens.html');
    await expect(page.locator('.gardens-noscript')).toBeVisible();
    await expect(page.getByRole('button', { name: 'View top floor' })).toBeHidden();
  } finally {
    await context.close();
  }
});
