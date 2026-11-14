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

test('long Markdown is readable, paginated and linked in the room and simple view', async ({ page }) => {
  const text = Array.from({ length: 60 }, (_, i) => `Paragraph ${i + 1} with enough words to fill the book pages.`).join('\n\n');
  const html = projectContent(`# Long project\n\n${text}\n\n[Project source](https://example.com/source)`);
  await page.route('http://127.0.0.1:4173/', async route => {
    const response = await route.fetch();
    const original = await response.text();
    const updated = original.replace(/(<div class="project-grid">)[\s\S]*?(\n\s*<\/section>)/, `$1${html}</div>$2`);
    await route.fulfill({ response, body: updated });
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#projects');
  await page.getByRole('button', { name: 'Open Long project' }).click();
  await expect(page.locator('#scene-reader')).toContainText('Paragraph 60');
  await expect(page.getByRole('link', { name: 'Project source ↗' })).toHaveAttribute('href', 'https://example.com/source');
  const position = page.locator('#project-position');
  await expect(position).toHaveText(/^1 \/ [2-9]\d*$/);
  await page.getByRole('button', { name: 'Next project page' }).click();
  await expect(position).toHaveText(/^2 \/ /);
  const canvas = page.locator('#room');
  const box = await canvas.boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await expect(canvas).toHaveAttribute('data-item', 'book-0');
  await expect(position).toHaveText(/^2 \/ /);
  await page.getByRole('button', { name: 'Previous project page' }).click();
  await expect(position).toHaveText(/^1 \/ /);
  await page.keyboard.press('ArrowRight');
  await expect(position).toHaveText(/^2 \/ /);
  await page.keyboard.press('ArrowLeft');
  await expect(position).toHaveText(/^1 \/ /);
  await page.getByRole('button', { name: 'Close book', exact: true }).click();
  await expect(canvas).toHaveAttribute('data-item', '');
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await page.getByRole('button', { name: 'Simple view' }).click();
  await expect(page.locator('#projects')).toContainText('Paragraph 60');
  await expect(page.locator('#projects a')).toHaveAttribute('href', 'https://example.com/source');
});
