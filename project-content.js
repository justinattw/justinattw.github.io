import { readdirSync, readFileSync } from 'node:fs';

const escapeHTML = value => String(value).replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[character]);

function inline(text) {
  const pattern = /(\[([^\]]+)\]\(([^)\s]+)\)|`([^`]+)`|\*\*([^*]+)\*\*|\*([^*]+)\*)/g;
  let html = '', last = 0;
  for (const match of text.matchAll(pattern)) {
    html += escapeHTML(text.slice(last, match.index));
    if (match[2]) {
      const url = new URL(match[3]);
      if (!['https:', 'http:'].includes(url.protocol)) throw new Error(`Unsupported project link: ${match[3]}`);
      html += `<a href="${escapeHTML(url.href)}" target="_blank" rel="noopener noreferrer">${escapeHTML(match[2])}</a>`;
    } else if (match[4]) html += `<code>${escapeHTML(match[4])}</code>`;
    else if (match[5]) html += `<strong>${escapeHTML(match[5])}</strong>`;
    else html += `<em>${escapeHTML(match[6])}</em>`;
    last = match.index + match[0].length;
  }
  return html + escapeHTML(text.slice(last));
}

export function projectContent(markdown, filename = 'project') {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const title = lines.shift()?.match(/^# (.+)$/)?.[1];
  if (!title) throw new Error(`${filename} must start with a level-one heading`);
  const blocks = [];
  for (let i = 0; i < lines.length;) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    if (/^```/.test(line)) {
      const code = [];
      i++;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) code.push(lines[i++]);
      if (i === lines.length) throw new Error(`${filename} has an unclosed code block`);
      i++;
      blocks.push(`<pre><code>${escapeHTML(code.join('\n'))}</code></pre>`);
      continue;
    }
    const heading = line.match(/^(#{2,3})\s+(.+)$/);
    if (heading) {
      const level = heading[1].length + 2;
      blocks.push(`<h${level}>${inline(heading[2])}</h${level}>`);
      i++;
      continue;
    }
    if (/^- /.test(line)) {
      const items = [];
      while (i < lines.length && /^- /.test(lines[i])) items.push(`<li>${inline(lines[i++].slice(2))}</li>`);
      blocks.push(`<ul>${items.join('')}</ul>`);
      continue;
    }
    const paragraph = [];
    while (i < lines.length && lines[i].trim() && !/^(?:#{1,6}\s|```|- )/.test(lines[i])) paragraph.push(lines[i++].trim());
    if (!paragraph.length) throw new Error(`Unsupported Markdown in ${filename}: ${lines[i]}`);
    blocks.push(`<p>${inline(paragraph.join(' '))}</p>`);
  }
  return `<article class="project-card"><div class="project-copy"><h3>${inline(title)}</h3><div class="project-markdown">${blocks.join('\n')}</div></div></article>`;
}

export function withProjectContent(html, projects) {
  if (!html.includes('<!-- projects:start -->')) return html;
  return html.replace(/<!-- projects:start -->[\s\S]*?<!-- projects:end -->/,
    projects.map(({ markdown, name }) => projectContent(markdown, name)).join('\n'));
}

export function loadProjects() {
  const directory = new URL('./projects/', import.meta.url);
  return readdirSync(directory).filter(name => name.endsWith('.md')).sort().map(name => ({
    name, markdown: readFileSync(new URL(name, directory), 'utf8'),
  }));
}
