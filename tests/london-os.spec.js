import { expect, test } from '@playwright/test';
import geography from '../src/london-os/geography.json' with { type: 'json' };
import * as THREE from 'three';
import { buildGardens } from '../src/gardens-model.js';

async function settled(page, view) {
  const canvas = page.locator('#london-view');
  await expect(canvas).toHaveAttribute('data-view', view);
  await expect(canvas).toHaveAttribute('data-transition', 'false');
}

async function observeScene(page) {
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

test('Cornwall Gardens has white façades, two buildings per side and no garden furniture', () => {
  const normal = new THREE.Group(), compact = new THREE.Group();
  buildGardens(normal, { uniformRoofline: true, furnish: false });
  buildGardens(compact, { uniformRoofline: true, furnish: false, cornwallGardens: true });
  function instances(root) {
    return root.children.flatMap(mesh => Array.from({ length: mesh.count }, (_, index) => {
      const matrix = new THREE.Matrix4();
      mesh.getMatrixAt(index, matrix);
      return {
        color: mesh.material.color.getHexString(),
        position: new THREE.Vector3().setFromMatrixPosition(matrix),
        size: new THREE.Vector3().setFromMatrixScale(matrix),
      };
    }));
  }
  const before = instances(normal), after = instances(compact);
  const close = (a, b) => Math.abs(a - b) < .001;
  const sideBuildings = parts => parts.filter(part => close(part.size.x, 4.35) && close(part.size.z, 4.45) && part.size.y > 10);
  expect(sideBuildings(before)).toHaveLength(6);
  expect(sideBuildings(after)).toHaveLength(4);
  for (const side of [-1, 1]) {
    const buildings = sideBuildings(after).filter(part => part.position.x * side > 0);
    expect(buildings).toHaveLength(2);
    expect(buildings.every(part => part.color === 'f5f5f0')).toBe(true);
    expect(buildings[0].position.z).toBeCloseTo(1.1);
    expect(buildings[1].position.z).toBeCloseTo(5.54);
  }
  const gardenBefore = before.find(part => part.color === '57734b');
  const gardenAfter = after.find(part => part.color === '57734b');
  expect(gardenAfter.size.z).toBeCloseTo(gardenBefore.size.z - 4.44);
  expect(gardenAfter.position.z - gardenAfter.size.z / 2).toBeCloseTo(gardenBefore.position.z - gardenBefore.size.z / 2);
  const seats = parts => parts.filter(part => part.color === '865538' && close(part.size.x, 1.4) && close(part.size.z, .42));
  expect(seats(before)).toHaveLength(4);
  expect(seats(after)).toHaveLength(0);
  expect(before.some(part => part.color === '6e8885')).toBe(true);
  expect(after.some(part => ['6e8885', 'aaa38f', 'e2d9c4', 'cabcaa', 'f6edda'].includes(part.color))).toBe(false);
});

test('landmarks retain openings and have visible detailed palace rear elevations', async ({ page }) => {
  await observeScene(page);
  await page.goto('/london-os.html');
  await settled(page, 'city');
  const details = await page.evaluate(async () => {
    const url = document.querySelector('link[rel="modulepreload"][href*="/three-"]').href;
    const module = await import(url);
    const Raycaster = Object.values(module).find(value => value?.prototype?.intersectObject);
    const ray = new Raycaster();
    function probe(name, point, direction) {
      const root = window.londonScene.getObjectByName(name);
      ray.set(root.localToWorld(root.position.clone().set(...point)), root.position.clone().set(...direction).transformDirection(root.matrixWorld));
      return ray.intersectObject(root, true)[0]?.object.name ?? null;
    }
    const column = window.londonScene.getObjectByName("Nelson's Column");
    const shaft = column.getObjectByName('Nelson column shaft');
    shaft.geometry.computeBoundingBox();
    return {
      kensington: [-1.55, 1.55].map(x => probe('Kensington Palace', [x, 3, 1.3], [0, -1, 0])),
      mainBlock: probe('Kensington Palace', [0, 3, 0], [0, -1, 0]) !== null,
      courtyard: probe('Buckingham Palace', [0, 4, 0], [0, -1, 0]),
      arches: [-.95, 0, .95, .56].map(x => probe('Marble Arch', [x, .56, 2], [0, 0, -1]) !== null),
      columnPosition: column.position.toArray(),
      archPosition: window.londonScene.getObjectByName('Marble Arch').position.toArray(),
      shaftHeight: shaft.geometry.boundingBox.max.y - shaft.geometry.boundingBox.min.y,
      rearWindows: [
        probe('Buckingham Palace', [.375, 1.3, -4], [0, 0, 1]),
        probe('Kensington Palace', [.44, 1.2, -3], [0, 0, 1]),
      ],
    };
  });
  expect(details.kensington).toEqual([null, null]);
  expect(details.mainBlock).toBe(true);
  expect(details.courtyard).toBe('Buckingham courtyard');
  expect(details.arches).toEqual([false, false, false, true]);
  expect(details.columnPosition[0]).toBeCloseTo(20.17);
  expect(details.columnPosition[2]).toBeCloseTo(-11.69);
  expect(details.archPosition[0]).toBeCloseTo(-1.48);
  expect(details.archPosition[2]).toBeCloseTo(-17.18);
  expect(details.shaftHeight).toBeGreaterThan(2);
  expect(details.rearWindows).toEqual(['Sash glazing', 'Sash glazing']);
});

test('new neighbouring houses, eastern skyline and right-wall cabinet are placed in the scene', async ({ page }) => {
  await observeScene(page);
  await page.goto('/london-os.html#office');
  await settled(page, 'office');
  const details = await page.evaluate(() => {
    const scene = window.londonScene;
    const vector = (...values) => scene.position.clone().set(...values);
    const houses = scene.getObjectByName('Neighbouring houses');
    const cabinet = scene.getObjectByName('Interests cabinet');
    const board = scene.getObjectByName('Work history pinboard');
    const heights = ['The Shard', 'The Gherkin', 'Walkie Talkie', 'One Canada Square'].map(name => {
      const root = scene.getObjectByName(name);
      let top = 0, finite = true;
      root.traverse(object => {
        if (!object.geometry) return;
        object.geometry.computeBoundingBox();
        const bounds = object.geometry.boundingBox;
        top = Math.max(top, root.worldToLocal(object.localToWorld(bounds.max.clone())).y);
        finite &&= Array.from(object.geometry.attributes.position.array).every(Number.isFinite);
      });
      return { top, finite };
    });
    return {
      houses: houses.children.map(house => house.position.toArray()),
      cabinetPosition: cabinet.position.toArray(),
      cabinetFacing: vector(0, 0, 1).transformDirection(cabinet.matrixWorld).toArray(),
      boardScale: board.scale.toArray(),
      skyline: ['The Shard', 'Walkie Talkie', 'The Gherkin', 'Canary Wharf'].map(name => scene.getObjectByName(name).position.toArray()),
      wharfTowers: scene.getObjectByName('Canary Wharf').children.length,
      heights,
      lattice: scene.getObjectByName('Gherkin diagrid').geometry.attributes.position.count,
    };
  });
  expect(details.houses).toHaveLength(6);
  for (const [x, , z] of details.houses) expect(Math.abs(x) > 6.5 || z > 5.5).toBe(true);
  expect(details.cabinetPosition[0]).toBeGreaterThan(3);
  expect(details.cabinetPosition[2]).toBeLessThan(-7);
  expect(details.cabinetFacing[0]).toBeCloseTo(-1);
  expect(details.cabinetFacing[2]).toBeCloseTo(0);
  expect(details.boardScale).toEqual([.72, .72, .72]);
  const approximateLocations = [[49.5, 0, -9], [51, 0, -16.5], [53.5, 0, -20], [95.5, 0, -10.5]];
  details.skyline.forEach((point, index) => point.forEach((value, axis) => expect(value).toBeCloseTo(approximateLocations[index][axis])));
  expect(details.wharfTowers).toBe(9);
  expect(details.heights.every(({ finite }) => finite)).toBe(true);
  expect(details.heights[0].top).toBeGreaterThan(details.heights[3].top);
  expect(details.heights[3].top).toBeGreaterThan(details.heights[1].top);
  expect(details.heights[1].top).toBeGreaterThan(5);
  expect(details.heights[2].top).toBeGreaterThan(5);
  expect(details.lattice).toBeGreaterThan(1000);
});

test('the entire garden square is five percent larger than the previous sixty-percent scale', async ({ page }) => {
  const normal = new THREE.Group();
  buildGardens(normal, { uniformRoofline: true, flatGround: true, furnish: false, pinboardWall: true, cornwallGardens: true });
  function dimensions(root, color) {
    const mesh = root.children.find(child => child.material.color.getHexString() === color);
    const matrix = new THREE.Matrix4();
    mesh.getMatrixAt(0, matrix);
    return new THREE.Vector3().setFromMatrixScale(matrix).multiplyScalar(.43).toArray();
  }
  const original = ['57734b', '314c3b', 'f5f5f0'].map(color => dimensions(normal, color));
  await observeScene(page);
  await page.goto('/london-os.html');
  await settled(page, 'city');
  const compact = await page.evaluate(() => {
    const root = window.londonScene.getObjectByName('London garden square');
    return ['57734b', '314c3b', 'f5f5f0'].map(color => {
      const mesh = root.children.find(child => child.material?.color.getHexString() === color);
      const matrix = mesh.matrixWorld.clone();
      const instance = matrix.clone();
      mesh.getMatrixAt(0, instance);
      matrix.multiply(instance);
      return root.scale.clone().setFromMatrixScale(matrix).toArray();
    });
  });
  for (let part = 0; part < original.length; part++) {
    for (let axis = 0; axis < 3; axis++) expect(compact[part][axis] / original[part][axis]).toBeCloseTo(.6 * 1.05);
  }
});

test('continuous world supports mouse/touch orbit, office exploration and all portfolio objects offline', async ({ page, isMobile, baseURL }, testInfo) => {
  test.setTimeout(45000);
  const errors = [], external = [];
  await observeScene(page);
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
    return { passes, straps, landmarks: ['Kensington Palace', 'Albert Bridge', 'Buckingham Palace', 'London Eye', "Nelson's Column", 'Marble Arch'].every(name => !!window.londonScene.getObjectByName(name)) };
  })).toEqual({ passes: [true, true, true, true, true], straps: [4, 4, 4, 4, 4], landmarks: true });
  const bearings = await page.evaluate(() => [['Kensington Palace', 'z'], ['Albert Bridge', 'z'], ['Buckingham Palace', 'z'], ['Eye rim', 'x'], ['Marble Arch', 'z']].map(([name, axis]) => {
    const landmark = window.londonScene.getObjectByName(name);
    const direction = landmark.position.clone().set(axis === 'x' ? 1 : 0, 0, axis === 'z' ? 1 : 0).transformDirection(landmark.matrixWorld);
    return (Math.atan2(direction.x, -direction.z) * 180 / Math.PI + 360) % 360;
  }));
  expect(bearings[0]).toBeCloseTo(72.5, 0);
  expect(bearings[1]).toBeCloseTo(161.3, 0);
  expect(bearings[2]).toBeCloseTo(55.3, 0);
  expect(bearings[3]).toBeCloseTo(5.8, 0);
  expect(bearings[4]).toBeCloseTo(166.3, 0);
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
      const framing = await page.evaluate(() => {
        const board = window.londonScene.getObjectByName('Work history pinboard');
        const center = board.localToWorld(board.position.clone().set(0, 0, 0));
        const top = board.localToWorld(center.clone().set(0, 1.05, 0)).project(window.londonCamera);
        const bottom = board.localToWorld(center.clone().set(0, -1.05, 0)).project(window.londonCamera);
        return { distance: window.londonCamera.position.distanceTo(center), height: Math.abs(top.y - bottom.y) / 2 };
      });
      expect(framing.distance).toBeLessThan(isMobile ? 1.6 : 1);
      expect(framing.height).toBeGreaterThan(isMobile ? .3 : .5);
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
