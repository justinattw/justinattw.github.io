import { test, expect } from '@playwright/test';
import { projectContent } from '../project-content.js';

test('project Markdown renders safely and requires a title', () => {
  const html = projectContent(`# Fixture

## Details

Some **bold** and *italic* text, \`code\`, and <script>bad</script>.

- First item
- Second item

[Source](https://example.com/project)

\`\`\`
hello <world>
\`\`\``);
  expect(html).toContain('<h3>Fixture</h3>');
  expect(html).toContain('<h4>Details</h4>');
  expect(html).toContain('<strong>bold</strong>');
  expect(html).toContain('<em>italic</em>');
  expect(html).toContain('<ul><li>First item</li><li>Second item</li></ul>');
  expect(html).toContain('&lt;script&gt;bad&lt;/script&gt;');
  expect(html).toContain('<pre><code>hello &lt;world&gt;</code></pre>');
  expect(html).toContain('href="https://example.com/project"');
  expect(() => projectContent('Missing title')).toThrow('must start');
  expect(() => projectContent('# Fixture\n\n[Bad](javascript:alert)')).toThrow('Unsupported project link');
});

test('long Markdown stays readable, paginated and linked in the study and accessible source', async ({ page, baseURL }) => {
  const text = Array.from({ length: 60 }, (_, i) => `Paragraph ${i + 1} with enough words to fill the book pages.`).join('\n\n');
  const html = projectContent(`# Long project\n\n${text}\n\n[Project source](https://example.com/source)`);
  await page.route(`${baseURL}/`, async route => {
    const response = await route.fetch();
    const original = await response.text();
    const updated = original.replace(/(<div class="project-grid">)[\s\S]*?(\n\s*<\/section>)/, `$1${html}</div>$2`);
    await route.fulfill({ response, body: updated });
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#projects');
  await page.locator('#object-card .item-list').getByRole('button', { name: 'Long project', exact: true }).click();
  await expect(page.locator('#london-view')).toHaveAttribute('data-item', 'book-0');
  await expect(page.locator('#object-content')).toContainText('Paragraph 60');
  await expect(page.locator('#object-content').getByRole('link', { name: 'Project source' })).toHaveAttribute('href', 'https://example.com/source');
  const position = page.locator('.page-controls span');
  await expect(position).toHaveText(/^Book spread 1 of \d+$/);
  expect(Number((await position.textContent()).split(' of ')[1])).toBeGreaterThan(1);
  await page.getByRole('button', { name: 'Next book page' }).click();
  await expect(position).toHaveText(/^Book spread 2 of /);
  await page.getByRole('button', { name: 'Previous book page' }).click();
  await expect(position).toHaveText(/^Book spread 1 of /);
  await page.getByRole('button', { name: 'Back to shelf', exact: true }).click();
  await expect(page.locator('#london-view')).toHaveAttribute('data-item', '');
  await page.locator('.skip-link').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#portfolio-source')).toBeVisible();
  await expect(page.locator('#portfolio-source #projects')).toContainText('Paragraph 60');
  await expect(page.locator('#portfolio-source #projects a')).toHaveAttribute('href', 'https://example.com/source');
});
