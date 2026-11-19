import { expect, test } from '@playwright/test';
import geography from '../src/london-os/geography.json' with { type: 'json' };
import * as THREE from 'three';
import { buildGardens } from '../src/gardens-model.js';

async function settled(page, view) {
  const canvas = page.locator('#london-view');
  await expect(canvas).toHaveAttribute('data-view', view);
  await expect(canvas).toHaveAttribute('data-transition', 'false');
}

test('expanded OS geography retains valid georeferencing, parks, tidal water and triangles', () => {
  for (const name of ['Hyde Park', 'Kensington Gardens', "Regent's Park", "St James's Park", 'Battersea Park', 'Hampstead Heath']) {
    expect(geography.features.some(feature => feature.kind === 'park' && feature.name === name)).toBe(true);
  }
  const [left, bottom, right, top] = geography.bounds;
  expect((right - left) * (top - bottom)).toBeGreaterThan(4 * 12000 * 8500);
  let invalidVertices = 0, invalidTriangles = 0;
  for (const feature of geography.features) {
    for (const [e, n] of feature.vertices) if (e < left || e > right || n < bottom || n > top) invalidVertices++;
    for (let i = 0; i < feature.triangles.length; i += 3) {
      const [a, b, c] = feature.triangles.slice(i, i + 3).map(index => feature.vertices[index]);
      if (!a || !b || !c || (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]) <= 0) invalidTriangles++;
    }
  }
  expect(invalidVertices).toBe(0);
  expect(invalidTriangles).toBe(0);
  for (const source of geography.sources) expect(source.downloadedMd5).toBe(source.metadataMd5);
  expect(geography.features.filter(feature => feature.kind === 'water').length).toBeGreaterThan(23);
  for (const name of ['The Serpentine', 'The Long Water', 'Round Pond']) {
    const lake = geography.features.find(feature => feature.name === name);
    expect(lake.sourceLayer).toBe('SurfaceWater_Area');
    expect(lake.sourceId).not.toBe('');
    const area = lake.triangles.reduce((sum, index, i, indices) => {
      if (i % 3) return sum;
      const [a, b, c] = indices.slice(i, i + 3).map(index => lake.vertices[index]);
      return sum + ((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])) / 2;
    }, 0);
    expect(area).toBeGreaterThan(name === 'The Serpentine' ? 100000 : 10000);
  }
});

test('garden dimensions shrink twenty percent without shrinking the room', () => {
  const normal = new THREE.Group(), compact = new THREE.Group();
  buildGardens(normal, { furnish: false });
  buildGardens(compact, { furnish: false, gardenScale: .8 });
  function transform(root, color) {
    const mesh = root.children.find(child => child.material.color.getHexString() === color);
    const matrix = new THREE.Matrix4();
    mesh.getMatrixAt(0, matrix);
    return matrix;
  }
  const before = new THREE.Vector3().setFromMatrixScale(transform(normal, '57734b'));
  const after = new THREE.Vector3().setFromMatrixScale(transform(compact, '57734b'));
  expect(after.x / before.x).toBeCloseTo(.8);
  expect(after.z / before.z).toBeCloseTo(.8);
  expect(transform(compact, '314c3b').elements).toEqual(transform(normal, '314c3b').elements);
});

test('continuous world supports mouse/touch orbit, office exploration and all portfolio objects offline', async ({ page, isMobile, baseURL }, testInfo) => {
  test.setTimeout(45000);
  const errors = [], external = [];
  await page.addInitScript(() => {
    window.__THREE_DEVTOOLS__ = new EventTarget();
    window.__THREE_DEVTOOLS__.addEventListener('observe', ({ detail: renderer }) => {
      if (!renderer.isWebGLRenderer) return;
      const render = renderer.render;
      renderer.render = function(scene, camera) {
        window.londonScene = scene;
        window.londonCamera = camera;
        return render.call(this, scene, camera);
      };
    });
  });
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/*', route => {
    if (new URL(route.request().url()).origin !== new URL(baseURL).origin) {
      external.push(route.request().url()); return route.abort();
    }
    return route.continue();
  });
  await page.goto('/london-os.html');
  const canvas = page.locator('#london-view');
  const explore = page.getByRole('button', { name: 'Explore', exact: true });
  await expect(explore).toBeVisible();
  await settled(page, 'city');
  const frame = await canvas.boundingBox();
  const center = (await canvas.getAttribute('data-room-center')).split(',').map(Number);
  expect(center[0]).toBeCloseTo(frame.width / 2, 1);
  expect(center[1]).toBeCloseTo(frame.height / 2, 1);
  const masthead = await page.locator('.masthead').boundingBox();
  expect(masthead.x).toBe(0);
  expect(masthead.width).toBe(frame.width);
  expect(await page.evaluate(() => {
    const passes = [], straps = [];
    window.londonScene.traverse(object => {
      if (object.name.startsWith('work-history-pass-')) passes.push(object.visible && object.children.some(child => child.material?.map));
      if (object.name.startsWith('lanyard-')) straps.push(object.children.length);
    });
    return { passes, straps, landmarks: ['Kensington Palace', 'Albert Bridge'].every(name => !!window.londonScene.getObjectByName(name)) };
  })).toEqual({ passes: [true, true, true, true, true], straps: [4, 4, 4, 4, 4], landmarks: true });
  if (isMobile) {
    const intro = await page.locator('.intro').boundingBox();
    expect((await explore.boundingBox()).y).toBeGreaterThan(intro.y + intro.height);
  }
  const original = await canvas.getAttribute('data-orbit');
  const { x, y, width, height } = await canvas.boundingBox();
  const start = { x: x + width * .7, y: y + height * .7 };
  if (isMobile) {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [start] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: start.x - 70, y: start.y }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await cdp.detach();
  } else {
    await page.mouse.move(start.x, start.y); await page.mouse.down();
    await page.mouse.move(start.x + 120, start.y, { steps: 5 }); await page.mouse.up();
  }
  await expect(canvas).not.toHaveAttribute('data-orbit', original);
  const rotated = await canvas.getAttribute('data-orbit');
  await page.getByRole('button', { name: 'Zoom in', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(canvas).not.toHaveAttribute('data-orbit', rotated);
  await page.getByRole('button', { name: 'Zoom out', exact: true }).click();
  await expect(canvas).toHaveAttribute('data-orbit', rotated);
  await page.getByRole('button', { name: 'Rotate left', exact: true }).click();
  await expect(canvas).not.toHaveAttribute('data-orbit', rotated);
  await page.getByRole('button', { name: 'Return to London', exact: true }).click();
  await settled(page, 'city');
  await expect(canvas).toHaveAttribute('data-orbit', original);
  await page.screenshot({ path: testInfo.outputPath(`london-world-${testInfo.project.name}.png`) });
  await explore.click();
  await settled(page, 'office');
  await expect(page.locator('#office-targets button').first()).toBeFocused();
  await expect(explore).toBeHidden();
  await expect(page.locator('#office-targets button')).toHaveCount(5);
  await page.screenshot({ path: testInfo.outputPath(`london-office-${testInfo.project.name}.png`) });
  for (const [id, label, expected] of [
    ['cv', 'CV', 'University of Oxford'],
    ['projects', 'Projects', 'Momentum backtest'],
    ['reading', 'Reading', 'The Peacock and the Sparrow'],
    ['work', 'Work history', 'TradingHub'],
    ['hobbies', 'Interests', 'Scuba diving'],
  ]) {
    const before = await canvas.getAttribute('data-orbit');
    await page.locator('#office-targets').getByRole('button', { name: label, exact: true }).click();
    await settled(page, id);
    await expect(canvas).not.toHaveAttribute('data-orbit', before);
    await expect(page.locator('#object-card')).toContainText(expected);
    await expect(page.locator('#object-card')).toBeFocused();
    await expect(page).toHaveURL(new RegExp(`/london-os.html#${id}$`));
    if (id === 'cv') await page.screenshot({ path: testInfo.outputPath(`london-computer-${testInfo.project.name}.png`) });
    if (id === 'work') {
      expect(await page.evaluate(async () => {
        const url = document.querySelector('link[rel="modulepreload"][href*="/three-"]').href;
        const module = await import(url);
        const Raycaster = Object.values(module).find(value => value?.prototype?.intersectObject);
        const ray = new Raycaster();
        return Array.from({ length: 5 }, (_, index) => {
          const item = window.londonScene.getObjectByName(`work-history-pass-${index}`);
          const point = item.localToWorld(item.position.clone().set(0, 0, .03)).project(window.londonCamera);
          ray.setFromCamera(point, window.londonCamera);
          let hit = ray.intersectObject(window.londonScene, true)[0]?.object;
          while (hit && hit !== item) hit = hit.parent;
          return hit === item;
        });
      })).toEqual([true, true, true, true, true]);
      await page.screenshot({ path: testInfo.outputPath(`london-work-history-${testInfo.project.name}.png`) });
    }
    await page.getByRole('button', { name: 'Return to the study', exact: true }).click();
    await settled(page, 'office');
  }
  await page.getByRole('button', { name: 'Back to London', exact: true }).click();
  await settled(page, 'city');
  await expect(explore).toBeFocused();
  await page.keyboard.press('Escape');
  await settled(page, 'city');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(external).toEqual([]); expect(errors).toEqual([]);
});

test('room controls coalesce into Explore and reopen according to actual zoom distance', async ({ page, isMobile }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/london-os.html#office');
  await settled(page, 'office');
  const explore = page.getByRole('button', { name: 'Explore', exact: true });
  const markers = page.locator('#office-targets button');
  await expect(explore).toBeHidden();
  for (let i = 0; i < (isMobile ? 2 : 4); i++) await page.getByRole('button', { name: 'Zoom out', exact: true }).click();
  await expect(explore).toBeVisible();
  const opacity = await markers.first().evaluate(element => Number(getComputedStyle(element).opacity));
  expect(opacity).toBeGreaterThan(0);
  expect(opacity).toBeLessThan(1);
  for (let i = 0; i < 6; i++) await page.getByRole('button', { name: 'Zoom out', exact: true }).click();
  await settled(page, 'city');
  await expect(page.locator('#office-targets')).toBeHidden();
  await expect(explore).toBeVisible();
  for (let i = 0; i < 12; i++) await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
  await settled(page, 'office');
  await expect(explore).toBeHidden();
  await expect(markers.first()).toBeVisible();
  await page.locator('#office-targets').getByRole('button', { name: 'CV', exact: true }).click();
  await settled(page, 'cv');
  for (let i = 0; i < 12; i++) await page.getByRole('button', { name: 'Zoom out', exact: true }).click();
  await settled(page, 'city');
  await expect(page.locator('#object-card')).toBeHidden();
  await expect(explore).toBeVisible();
});

test('books and passes stay in the world, deep links restore and reduced motion skips flights', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/london-os.html#projects');
  await settled(page, 'projects');
  await page.locator('#object-card .item-list').getByRole('button', { name: 'Momentum backtest' }).click();
  await expect(page.locator('#london-view')).toHaveAttribute('data-item', 'book-0');
  await settled(page, 'projects');
  await expect(page.locator('#object-card')).toContainText('Exploring momentum investing');
  await page.reload();
  await settled(page, 'projects');
  await expect(page.locator('#london-view')).toHaveAttribute('data-item', 'book-0');
  await page.getByRole('button', { name: 'Back to shelf', exact: true }).click();
  await settled(page, 'projects');
  await expect(page.locator('#london-view')).toHaveAttribute('data-item', '');
  await page.getByRole('button', { name: 'View contents' }).click();
  await page.locator('#contents-list').getByRole('button', { name: /Work/ }).click();
  await settled(page, 'work');
  await page.locator('#object-card .item-list').getByRole('button', { name: 'GitHub', exact: true }).click();
  await expect(page.locator('#london-view')).toHaveAttribute('data-item', 'job-0');
  await expect(page.locator('#object-card')).toContainText('Notifications');
  await page.goBack();
  await settled(page, 'work');
  await expect(page.locator('#london-view')).toHaveAttribute('data-item', '');
});

test('unavailable WebGL retains readable portfolio content', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(type, ...args) {
      return type.startsWith('webgl') ? null : original.call(this, type, ...args);
    };
  });
  await page.goto('/london-os.html');
  await expect(page.locator('#status')).toContainText('View contents');
  await page.getByRole('button', { name: 'View contents' }).click();
  await page.locator('#contents-list').getByRole('button', { name: /CV/ }).click();
  await expect(page.locator('#object-card')).toContainText('University of Oxford');
});

test('without JavaScript the established portfolio remains available', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.goto('/london-os.html');
    await expect(page.locator('.no-script')).toBeVisible();
    await expect(page.locator('#portfolio-source')).toBeVisible();
    await expect(page.locator('#portfolio-source')).toContainText('Momentum backtest');
  } finally { await context.close(); }
});
