import { readFileSync } from 'node:fs';

export function withLondonPortfolioContent(html) {
  if (!html.includes('<!-- london-content:start -->')) return html;
  const portfolio = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
  const content = portfolio.match(/<div id="content" tabindex="-1">([\s\S]*?)<\/div>\s*<\/main>/)?.[1];
  if (!content) throw new Error('Cannot locate the original portfolio content for the London study.');
  return html.replace(/<!-- london-content:start -->[\s\S]*?<!-- london-content:end -->/, content);
}
