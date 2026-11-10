import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test('cat walks around the room and respects reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('#room-targets')).toBeVisible();
  const room = page.locator('#room');
  const resting = await room.getAttribute('data-cat-position');
  await page.waitForTimeout(300);
  await expect(room).toHaveAttribute('data-cat-position', resting);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect.poll(() => room.getAttribute('data-cat-position')).not.toBe(resting);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForTimeout(100);
  const stopped = await room.getAttribute('data-cat-position');
  await page.waitForTimeout(300);
  await expect(room).toHaveAttribute('data-cat-position', stopped);
});

test('wall clock follows UK time, ticks and observes British Summer Time', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, timezoneId: 'America/Los_Angeles', reducedMotion: 'reduce' });
  try {
    const page = await context.newPage();
    await page.clock.install({ time: new Date('2026-11-10T12:45:00Z') });
    await page.clock.pauseAt(new Date('2026-11-10T12:45:59Z'));
    await page.goto('/');
    await expect(page.locator('#room-targets')).toBeVisible();
    await expect(page.locator('#room')).toHaveAttribute('data-clock-time', '12:45');
    await page.clock.runFor(1000);
    await expect(page.locator('#room')).toHaveAttribute('data-clock-time', '12:46');
    await page.clock.setSystemTime(new Date('2026-07-10T12:45:59Z'));
    await page.clock.runFor(1000);
    await expect(page.locator('#room')).toHaveAttribute('data-clock-time', '13:46');
  } finally {
    await context.close();
  }
});

async function enter(page, id) {
  await page.locator(`.explore-nav a[href="#${id}"]`).click();
  await expect(page.locator('#room')).toHaveAttribute('data-view', id);
  await expect(page.locator('#room')).toHaveAttribute('data-moving', 'false');
  await expect(page.locator('#scene-back')).toBeVisible();
}

test('room destinations move the camera without opening popups', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('#room-targets')).toBeVisible();
  await expect(page.locator('.masthead')).not.toContainText('JUSTIN WONG');
  await expect(page.locator('.masthead .monogram')).toHaveText('jw.');
  await expect(page.locator('.masthead .github-link')).toHaveText('GitHub ↗');
  for (const id of ['work', 'cv', 'projects', 'hobbies']) {
    const target = page.locator(`[data-anchor="${id}"]`);
    await target.click();
    await expect(page.locator('#room')).toHaveAttribute('data-moving', 'true');
    await expect(page.locator('#room')).toHaveAttribute('data-view', id);
    await expect(page.locator('#room')).toHaveAttribute('data-moving', 'false');
    await page.getByRole('button', { name: 'Back', exact: true }).click();
    await expect(target).toBeVisible();
    await expect(target).toBeFocused();
  }
  await expect(page.locator('dialog')).toHaveCount(0);
  expect(errors).toEqual([]);
  expect(await page.locator('#room').evaluate(canvas => canvas.width >= canvas.clientWidth)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('hobbies cupboard opens and closes with accessible contents', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#hobbies');
  await expect(page.locator('#room')).toHaveAttribute('data-cupboard-open', 'true');
  for (const hobby of ['Crosswords', 'Skiing', 'Football', 'Gym', 'Languages', 'Running']) {
    await expect(page.locator('#scene-reader')).toContainText(hobby);
  }
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(page.locator('#room')).toHaveAttribute('data-cupboard-open', 'false');
  await page.getByRole('button', { name: 'Simple view' }).click();
  await expect(page.locator('#hobbies li')).toHaveCount(6);
});

test('each 3D lanyard card flips to its complete job details', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('#room-targets')).toBeVisible();
  await enter(page, 'work');
  await expect(page.locator('[data-kind="job"]')).toHaveCount(5);
  const companies = ['GitHub', 'TradingHub', 'CoreStream', 'UCL Computer Science', 'Nuveen'];
  for (let index = 0; index < companies.length; index++) {
    const target = page.locator(`[data-kind="job"][data-index="${index}"]`);
    await target.click();
    await expect(page.locator('#room')).toHaveAttribute('data-item', `job-${index}`);
    await expect(page.locator('#room')).toHaveAttribute('data-face', 'back');
    await expect(page.locator('#scene-reader')).toContainText(companies[index]);
    if (index === 0) {
      await expect(page.locator('#scene-reader')).toContainText('50 Kafka-backed jobs');
      await expect(page.locator('#scene-reader')).toContainText('GitHub Universe 2025');
    }
    await target.click();
    await expect(page.locator('#room')).toHaveAttribute('data-face', 'front');
    await page.getByRole('button', { name: 'Back', exact: true }).click();
    await expect(page.locator('[data-kind="job"]')).toHaveCount(5);
  }
  await expect(page.locator('dialog')).toHaveCount(0);
});

test('titled books open as physical project pages, not panels', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('#room-targets')).toBeVisible();
  await enter(page, 'projects');
  await expect(page.locator('[data-kind="book"]')).toHaveCount(2);
  for (const [index, title] of ['Momentum backtest', 'Mini container runtime'].entries()) {
    await page.getByRole('button', { name: `Open ${title}`, exact: true }).click();
    await expect(page.locator('#room')).toHaveAttribute('data-item', `book-${index}`);
    await expect(page.locator('#scene-reader')).toContainText(title);
    await expect(page.locator('#scene-reader')).toContainText('not yet published');
    await page.getByRole('button', { name: 'Back', exact: true }).click();
    await expect(page.locator('[data-kind="book"]')).toHaveCount(2);
  }
  await expect(page.locator('#projects')).not.toBeVisible();
});

test('computer pages through the CV on its own screen', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('#room-targets')).toBeVisible();
  await enter(page, 'cv');
  await expect(page.locator('#scene-reader')).toContainText('JUSTIN WONG');
  await page.getByRole('button', { name: 'Next CV page' }).click();
  await expect(page.locator('#scene-reader')).toContainText('GitHub');
  await page.getByRole('button', { name: 'Previous CV page' }).click();
  await expect(page.locator('#cv-position')).toHaveText(/^1 \/ \d+$/);
  await expect(page.getByRole('button', { name: 'Previous CV page' })).toHaveAttribute('aria-keyshortcuts', 'ArrowLeft');
  await expect(page.getByRole('button', { name: 'Next CV page' })).toHaveAttribute('aria-keyshortcuts', 'ArrowRight');
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#cv-position')).toHaveText(/^2 \/ \d+$/);
  await expect(page.locator('#scene-reader')).toContainText('GitHub');
  await page.keyboard.press('ArrowLeft');
  await expect(page.locator('#cv-position')).toHaveText(/^1 \/ \d+$/);
  await expect(page.locator('.access-card:visible')).toHaveCount(0);
  const link = page.getByRole('link', { name: 'Download CV', exact: true });
  const downloadEvent = page.waitForEvent('download');
  await link.click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toBe('Justin-Wong-Resume.pdf');
  expect(await readFile(await download.path())).toEqual(await readFile('public/justin-wong-resume.pdf'));
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await page.getByRole('button', { name: 'Simple view' }).click();
  await expect(page.locator('#cv .download-button')).toHaveAttribute('href', '/justin-wong-resume.pdf');
  await expect(page.locator('#cv .download-button')).toHaveAttribute('download', 'Justin-Wong-Resume.pdf');
});

test('cards flip and books unfold with real object animation', async ({ page }) => {
  await page.goto('/#work');
  await expect(page.locator('#scene-back')).toBeVisible();
  await page.getByRole('button', { name: 'Flip GitHub', exact: true }).click();
  await expect(page.locator('#room')).toHaveAttribute('data-moving', 'true');
  await expect(page.locator('#room')).toHaveAttribute('data-moving', 'false');
  await expect(page.locator('#room')).toHaveAttribute('data-face', 'back');
  await page.goto('/#projects');
  await expect(page.locator('#scene-back')).toBeVisible();
  await page.getByRole('button', { name: 'Open Momentum backtest', exact: true }).click();
  await expect(page.locator('#room')).toHaveAttribute('data-moving', 'true');
  await expect(page.locator('#room')).toHaveAttribute('data-moving', 'false');
  await expect(page.locator('#room')).toHaveAttribute('data-item', 'book-0');
});

test('objects respond to actual mouse and touch raycasts', async ({ page, isMobile }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('#room-targets')).toBeVisible();
  for (const id of ['cv', 'work', 'projects', 'hobbies']) {
    const target = await page.locator(`[data-anchor="${id}"]`).boundingBox();
    await page.locator('#room-targets').evaluate(element => { element.style.display = 'none'; });
    const x = target.x + target.width / 2, y = target.y + target.height / 2;
    if (isMobile) await page.touchscreen.tap(x, y);
    else await page.mouse.click(x, y);
    await expect(page.locator('#room')).toHaveAttribute('data-view', id);
    await expect(page.locator('#scene-back')).toBeVisible();
    await page.getByRole('button', { name: 'Back', exact: true }).click();
    await page.locator('#room-targets').evaluate(element => { element.style.display = ''; });
    await expect(page.locator('[data-anchor="cv"]')).toBeVisible();
  }
});

test('keyboard, nested deep links, browser history and simple view', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#work/job-0');
  await expect(page.locator('#room')).toHaveAttribute('data-item', 'job-0');
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-kind="job"]')).toHaveCount(5);
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-anchor="projects"]')).toBeVisible();
  await page.locator('.explore-nav a[href="#projects"]').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-kind="book"]')).toHaveCount(2);
  await page.goBack();
  await expect(page.locator('[data-anchor="cv"]')).toBeVisible();
  await page.goForward();
  await expect(page.locator('[data-kind="book"]')).toHaveCount(2);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Simple view' }).click();
  await expect(page.locator('#work')).toBeVisible();
});

test('no JavaScript and failed WebGL keep the public CV available', async ({ browser, baseURL, page }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const plain = await context.newPage();
  await plain.goto(baseURL);
  await expect(plain.locator('#cv')).toBeVisible();
  await expect(plain.locator('#work .access-card')).toHaveCount(5);
  await context.close();
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
});

test('print is sanitized, and reduced motion skips camera and object animation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('#room-targets')).toBeVisible();
  await enter(page, 'work');
  await page.getByRole('button', { name: 'Flip GitHub', exact: true }).click();
  await expect(page.locator('#room')).toHaveAttribute('data-moving', 'false');
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('#cv')).toBeVisible();
  await expect(page.locator('#work')).toBeVisible();
  await expect(page.locator('#projects')).not.toBeVisible();
  await expect(page.locator('.study')).not.toBeVisible();
  const text = await page.locator('#content').innerText();
  expect(text).toContain('Nov 2023 – Feb 2024');
  expect(text).toContain('Merit');
  expect(text).not.toMatch(/visa|@|tel:|mailto:/i);
});
