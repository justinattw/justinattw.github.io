import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';

const escapeHTML = value => String(value).replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[character]);

export function readingContent(data) {
  const shelves = [
    ['current', 'Currently reading', data.currentlyReading],
    ['recent', 'Recently read', data.recentlyRead],
  ].filter(([, , shelf]) => shelf.synced && shelf.books.length);
  if (!shelves.length) return '';
  return `<section id="reading" class="content-section" aria-labelledby="reading-title">
    <h2 id="reading-title">Reading list</h2>
    <p>From my <a class="reading-profile" href="https://www.goodreads.com/user/show/189566647" target="_blank" rel="noopener noreferrer">Goodreads profile</a>.</p>
    ${shelves.map(([id, title, shelf]) => `<div data-reading-shelf="${id}">
      <h3>${title}</h3>
      <ul class="reading-list">${(id === 'recent' ? shelf.books.slice(0, 5) : shelf.books).map(book => {
        if (!/^https:\/\/www\.goodreads\.com\/book\/show\/\d+$/.test(book.url)) throw new Error('Invalid Goodreads book URL');
        return `<li data-shelf="${id}"><a href="${escapeHTML(book.url)}" target="_blank" rel="noopener noreferrer">${escapeHTML(book.title)}</a><span>${escapeHTML(book.author)}</span></li>`;
      }).join('')}</ul>
    </div>`).join('')}
  </section>`;
}

export function withReadingContent(html, data) {
  if (!html.includes('<!-- reading:start -->')) return html;
  const reading = readingContent(data);
  html = html.replace(/<!-- reading:start -->[\s\S]*?<!-- reading:end -->/, reading);
  if (!reading) html = html.replace(/<a\b[^>]*(?:data-anchor="reading"|href="#reading")[^>]*>[\s\S]*?<\/a>/g, '');
  return html;
}

export default defineConfig({
  plugins: [{
    name: 'goodreads-content',
    transformIndexHtml(html) {
      return withReadingContent(html, JSON.parse(readFileSync(new URL('./src/reading.json', import.meta.url), 'utf8')));
    },
  }],
  build: {
    rollupOptions: {
      input: { portfolio: 'index.html', styles: 'styles.html' },
      output: {
        manualChunks: { three: ['three'] },
      },
    },
  },
});
