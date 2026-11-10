import { test, expect } from '@playwright/test';
import { readingContent, withReadingContent } from '../vite.config.js';

const books = Array.from({ length: 7 }, (_, index) => ({
  title: `Fixture book ${index}`, author: 'Fixture author',
  url: `https://www.goodreads.com/book/show/${100 + index}`,
}));
const unavailable = { synced: false, books: [] };

async function useShelves(page, data) {
  await page.route('http://127.0.0.1:4173/', async route => {
    const response = await route.fetch();
    let html = await response.text();
    html = html.replace(/<section id="reading"[\s\S]*?<\/section>/, '<!-- reading:start --><!-- reading:end -->');
    await route.fulfill({ response, body: withReadingContent(html, data) });
  });
}

test('reading HTML escapes titles, caps recent books at five and omits unavailable categories', () => {
  const html = readingContent({
    currentlyReading: unavailable, recentlyRead: { synced: true, books },
  });
  expect(html).toContain('Recently read');
  expect(html).not.toContain('Currently reading');
  expect(html.match(/<li /g)).toHaveLength(5);
  expect(readingContent({ currentlyReading: unavailable, recentlyRead: unavailable })).toBe('');
  const escaped = readingContent({
    currentlyReading: { synced: true, books: [{ ...books[0], title: '<script>not executable</script>' }] },
    recentlyRead: unavailable,
  });
  expect(escaped).toContain('&lt;script&gt;');
  expect(escaped).not.toContain('<script>');
});

test('unavailable Goodreads shelves have no reading option in room or simple view', async ({ page }) => {
  await useShelves(page, { currentlyReading: unavailable, recentlyRead: unavailable });
  await page.goto('/');
  await expect(page.locator('#room-targets')).toBeVisible();
  await expect(page.locator('[data-anchor="reading"]')).toHaveCount(0);
  await expect(page.locator('.explore-nav a[href="#reading"]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Simple view' }).click();
  await expect(page.locator('#reading')).toHaveCount(0);
});

test('recently read exposes only the latest five physical books', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await useShelves(page, { currentlyReading: unavailable, recentlyRead: { synced: true, books } });
  await page.goto('/#reading');
  await expect(page.locator('#room')).toHaveAttribute('data-view', 'reading');
  await expect(page.locator('[data-kind="reading"]')).toHaveCount(5);
  await expect(page.locator('#scene-reader')).toContainText('Recently read');
  await expect(page.locator('#scene-reader')).not.toContainText('Currently reading');
  await page.getByRole('button', { name: 'Open Fixture book 4', exact: true }).click();
  await expect(page.locator('#scene-reader')).toContainText('Recently read');
  await expect(page.getByRole('link', { name: 'View on Goodreads' })).toHaveAttribute('href', books[4].url);
});
