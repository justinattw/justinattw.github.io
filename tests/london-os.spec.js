import { expect, test } from '@playwright/test';
import geography from '../src/london-os/geography.json' with { type: 'json' };

test('bundled OS geography has named parks, tidal water and valid clipped triangles', () => {
  expect(geography.crs).toBe('EPSG:27700');
  for (const name of ['Hyde Park', 'Kensington Gardens', "Regent's Park", "St James's Park", 'Battersea Park']) {
    expect(geography.features.some(feature => feature.kind === 'park' && feature.name === name)).toBe(true);
  }
  expect(geography.features.filter(feature => feature.kind === 'water').length).toBeGreaterThan(0);
  for (const source of geography.sources) expect(source.downloadedMd5).toBe(source.metadataMd5);
  const [left, bottom, right, top] = geography.bounds;
  for (const feature of geography.features) {
    for (const [e, n] of feature.vertices) {
      expect(e >= left && e <= right && n >= bottom && n <= top).toBe(true);
    }
    for (let i = 0; i < feature.triangles.length; i += 3) {
      const [a, b, c] = feature.triangles.slice(i, i + 3).map(index => feature.vertices[index]);
      expect((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])).toBeGreaterThan(0);
    }
  }
});

test('mouse or touch orbit, zoom, keyboard rotation and studio focus work offline', async ({ page, isMobile }, testInfo) => {
  const errors = [], external = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/*', route => {
    if (new URL(route.request().url()).origin !== 'http://127.0.0.1:4182') {
      external.push(route.request().url());
      return route.abort();
    }
    return route.continue();
  });
  await page.goto('/london-os.html');
  const canvas = page.locator('#london-view');
  const home = page.getByRole('button', { name: 'Whole city' });
  await expect(home).toBeVisible();
  if (isMobile) {
    const studioButton = await page.getByRole('button', { name: 'Find the top-floor studio' }).boundingBox();
    expect(studioButton.height).toBeLessThanOrEqual(60);
  }
  await expect(canvas).toHaveAttribute('data-features', String(geography.features.length));
  const original = await canvas.getAttribute('data-orbit');
  const { x, y, width, height } = await canvas.boundingBox();
  const start = { x: x + width * .35, y: y + height * .6 };
  if (isMobile) {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [start] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: start.x + 90, y: start.y }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await cdp.detach();
  } else {
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(start.x + 120, start.y, { steps: 5 });
    await page.mouse.up();
  }
  await expect(canvas).not.toHaveAttribute('data-orbit', original);
  await home.click();
  await expect(canvas).toHaveAttribute('data-orbit', original);
  await page.getByRole('button', { name: 'Rotate right' }).focus();
  await page.keyboard.press('Enter');
  await expect(canvas).not.toHaveAttribute('data-orbit', original);
  await home.click();
  await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
  await expect(canvas).not.toHaveAttribute('data-orbit', original);
  await home.click();
  await page.screenshot({ path: testInfo.outputPath(`london-os-${testInfo.project.name}.png`) });
  await page.getByRole('button', { name: 'Find the top-floor studio' }).click();
  await expect(canvas).toHaveAttribute('data-view', 'workspace');
  await expect(page).toHaveURL('/london-os.html');
  await page.screenshot({ path: testInfo.outputPath(`london-os-studio-${testInfo.project.name}.png`) });
  await home.click();
  await expect(canvas).toHaveAttribute('data-orbit', original);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(external).toEqual([]);
  expect(errors).toEqual([]);
});

test('JavaScript-disabled fallback explains how to view the map', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.goto('/london-os.html');
    await expect(page.locator('.no-script')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Whole city' })).toBeHidden();
  } finally { await context.close(); }
});
