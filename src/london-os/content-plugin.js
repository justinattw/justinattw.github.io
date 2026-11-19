import { readFileSync } from 'node:fs';

export function withLondonPortfolioContent(html) {
  if (!html.includes('<!-- portfolio-content:start -->')) return html;
  const content = readFileSync(new URL('../portfolio.html', import.meta.url), 'utf8');
  if (!content.includes('id="cv"') || !content.includes('id="work"')) throw new Error('Portfolio source must include CV and work history.');
  return html.replace(/<!-- portfolio-content:start -->[\s\S]*?<!-- portfolio-content:end -->/, content);
}
