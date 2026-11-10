import { test, expect } from '@playwright/test';

test('room renders and each destination opens with usable close/focus behavior', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('#room-targets')).toBeVisible();
  for (const id of ['projects', 'cv', 'work']) {
    const target = page.locator(`[data-anchor="${id}"]`);
    await target.click();
    await expect(page.locator('dialog')).toBeVisible();
    await expect(page.locator(`#detail-${id}`)).toBeVisible();
    if (id === 'work') await expect(page.locator('#detail-work .access-card')).toHaveCount(5);
    if (id === 'cv') {
      await expect(page.locator('.cv-experience')).toBeVisible();
      await expect(page.locator('dialog .access-card')).toHaveCount(0);
      await expect(page.locator('dialog .lanyard')).toHaveCount(0);
    }
    await page.getByRole('button', { name: 'Back to room' }).click();
    await expect(page.locator('dialog')).not.toBeVisible();
    await expect(target).toBeFocused();
  }
  expect(errors).toEqual([]);
  expect(await page.locator('#room').evaluate(canvas => canvas.width >= canvas.clientWidth)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('real scene objects respond to mouse clicks and phone taps', async ({ page, isMobile }) => {
  await page.goto('/');
  await expect(page.locator('#room-targets')).toBeVisible();
  for (const id of ['cv', 'work', 'projects']) {
    await expect(page.locator('#room-targets')).toBeVisible();
    const target = await page.locator(`[data-anchor="${id}"]`).boundingBox();
    await page.locator('#room-targets').evaluate(element => { element.style.display = 'none'; });
    const x = target.x + target.width / 2, y = target.y + target.height / 2;
    if (isMobile) await page.touchscreen.tap(x, y);
    else await page.mouse.click(x, y);
    await expect(page.locator(`#detail-${id}`)).toBeVisible();
    await page.getByRole('button', { name: 'Back to room' }).click();
    await page.locator('#room-targets').evaluate(element => { element.style.display = ''; });
  }
});

test('keyboard navigation, history, simple view and deep links', async ({ page }) => {
  await page.goto('/#cv');
  await expect(page.locator('#detail-cv')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('dialog')).not.toBeVisible();
  const link = page.locator('.explore-nav a[href="#projects"]');
  await link.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#detail-projects')).toBeVisible();
  await page.goBack();
  await expect(page.locator('dialog')).not.toBeVisible();
  await page.goForward();
  await expect(page.locator('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Simple view' }).click();
  await expect(page.locator('#work')).toBeVisible();
  await page.locator('.explore-nav a[href="#work"]').click();
  await expect(page.locator('dialog')).not.toBeVisible();
});

test('without JavaScript all public content is available', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(baseURL);
  await expect(page.locator('#cv')).toBeVisible();
  await expect(page.locator('#work .access-card')).toHaveCount(5);
  await expect(page.locator('#projects .project-card')).toHaveCount(2);
  await context.close();
});

test('WebGL failure falls back to readable content', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      if (type.startsWith('webgl')) return null;
      return original.call(this, type, ...args);
    };
  });
  await page.goto('/');
  await expect(page.locator('#scene-status')).toContainText('Use the simple view below');
  await expect(page.locator('#work')).toBeVisible();
  await expect(page.locator('#room-targets')).not.toBeVisible();
});

test('print includes sanitized education and experience, not room or projects', async ({ page }) => {
  await page.goto('/#cv');
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('#cv')).toBeVisible();
  await expect(page.locator('#work')).toBeVisible();
  await expect(page.locator('#projects')).not.toBeVisible();
  await expect(page.locator('.study')).not.toBeVisible();
  await expect(page.locator('dialog')).not.toBeVisible();
  const text = await page.locator('#content').innerText();
  expect(text).toContain('Nov 2023 – Feb 2024');
  expect(text).toContain('Merit');
  expect(text).not.toMatch(/visa|@|tel:|mailto:/i);
});

test('reduced motion is respected and no horizontal overflow in panels', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('#room-targets')).toBeVisible();
  const before = await page.locator('[data-anchor="cv"]').getAttribute('style');
  await page.mouse.move(20, 300);
  await page.mouse.move(300, 400);
  await expect(page.locator('[data-anchor="cv"]')).toHaveAttribute('style', before);
  await page.locator('.explore-nav a[href="#work"]').click();
  await expect(page.locator('#room')).toHaveAttribute('data-moving', 'false');
  await expect(page.locator('dialog')).toBeVisible();
  expect(await page.locator('dialog').evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
});

test('destinations animate the camera before presenting content', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#room-targets')).toBeVisible();
  for (const id of ['work', 'cv', 'projects']) {
    await page.locator(`.explore-nav a[href="#${id}"]`).click();
    await expect(page.locator('#room')).toHaveAttribute('data-moving', 'true');
    await expect(page.locator('dialog')).not.toBeVisible();
    await expect(page.locator('dialog')).toBeVisible();
    await expect(page.locator('#room')).toHaveAttribute('data-view', id);
    await expect(page.locator('#room')).toHaveAttribute('data-moving', 'false');
    await page.getByRole('button', { name: 'Back to room' }).click();
    await expect(page.locator('#room-targets')).toBeVisible();
    await expect(page.locator('#room')).toHaveAttribute('data-view', 'room');
  }
});
