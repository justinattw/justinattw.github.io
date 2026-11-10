import { createTerminal } from './terminal.js';
import { drawLogo } from './company-logos.js';

document.querySelectorAll('#work .company-mark').forEach((mark, index) => {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 160;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Company logo rendering is unavailable.');
  drawLogo(context, index, 80, 80, 120, getComputedStyle(mark).getPropertyValue('--accent').trim());
  mark.replaceChildren(canvas);
});

const content = document.querySelector('#content');
const toggle = document.querySelector('#plain-toggle');
const controls = document.querySelector('#scene-controls');
const backButton = document.querySelector('#scene-back');
const actions = document.querySelector('#scene-actions');
const reader = document.querySelector('#scene-reader');
const status = document.querySelector('#scene-status');
const sections = new Set(['cv', 'work', 'projects', 'reading', 'hobbies']);
const jobs = [...document.querySelectorAll('#work .badge-body')].map(badge => ({
  company: badge.querySelector('h3').textContent,
  role: badge.querySelector('.role-detail').textContent,
  dates: badge.querySelector('.dates').textContent,
  bullets: [...badge.querySelectorAll('li')].map(item => item.textContent),
}));
const projects = [...document.querySelectorAll('#projects .project-card')].map(project => ({
  title: project.querySelector('h3').textContent,
  description: project.querySelector('.project-copy > p').textContent,
  note: project.querySelector('.honest-note').textContent,
}));
const reading = [...document.querySelectorAll('#reading li')].map(book => ({
  title: book.querySelector('a').textContent,
  author: book.querySelector('span').textContent,
  href: book.querySelector('a').href,
  shelf: book.dataset.shelf,
}));
if (!reading.length) sections.delete('reading');
function cvPagesFor(title, paragraphs) {
  const lines = [];
  for (const paragraph of paragraphs) {
    let line = '';
    for (const word of paragraph.split(/\s+/)) {
      if (line && `${line} ${word}`.length > 24) { lines.push(line); line = word; }
      else line = line ? `${line} ${word}` : word;
    }
    if (line) lines.push(line);
  }
  const pages = [];
  for (let index = 0; index < lines.length; index += 6) pages.push(`${title}\n${lines.slice(index, index + 6).join('\n')}`);
  return pages;
}
const cvPages = [
  ...cvPagesFor('JUSTIN WONG', ['Software engineer', 'GitHub Notifications', 'github.com/justinattw']),
  ...jobs.flatMap(job => cvPagesFor(job.company, [job.role, job.dates, job.bullets[0]])),
  ...[...document.querySelectorAll('#cv .education')].flatMap(education => cvPagesFor(education.querySelector('h3').textContent, [education.querySelector('p').innerText, ...[...education.querySelectorAll('div > *')].map(element => element.textContent)])),
];
let room, section, selected, lastTrigger;
let simple = false, navigation = 0, cvPage = 0;
const terminal = createTerminal({ onCV: () => showCVPage(0), onExit: back });

function setSimple(value) {
  simple = value;
  if (value) {
    navigation++;
    section = null;
    selected = null;
    delete document.body.dataset.destination;
    room?.reset();
  }
  document.body.classList.toggle('simple', value);
  content.classList.toggle('simple-view', value);
  toggle.textContent = value ? 'Room view' : 'Simple view';
  controls.hidden = value || !section;
}
function setHash(value) {
  history.replaceState(null, '', location.pathname + location.search + (value ? `#${value}` : ''));
}
function showCVPage(index) {
  cvPage = (index + cvPages.length) % cvPages.length;
  terminal.showCV(cvPages[cvPage]);
  reader.textContent = cvPages[cvPage];
  const position = document.querySelector('#cv-position');
  if (position) position.textContent = `${cvPage + 1} / ${cvPages.length}`;
}
function showControls() {
  controls.hidden = !section;
  backButton.textContent = selected ? (section === 'work' ? '← Pinboard' : '← Shelf') : '← Room';
  actions.replaceChildren();
  if (section === 'reading') {
    const link = document.createElement('a');
    link.textContent = selected ? 'View on Goodreads ↗' : 'Goodreads ↗';
    link.href = selected ? reading[selected.index].href : document.querySelector('.reading-profile').href;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    actions.append(link);
    return;
  }
  if (section !== 'cv') return;
  const previous = document.createElement('button');
  previous.type = 'button'; previous.textContent = '←'; previous.setAttribute('aria-label', 'Previous CV page');
  previous.setAttribute('aria-keyshortcuts', 'ArrowLeft');
  previous.title = 'Previous CV page (Left arrow)';
  previous.addEventListener('click', () => showCVPage(cvPage - 1));
  const position = document.createElement('span');
  position.id = 'cv-position';
  position.textContent = `${cvPage + 1} / ${cvPages.length}`;
  const next = document.createElement('button');
  next.type = 'button'; next.textContent = '→'; next.setAttribute('aria-label', 'Next CV page');
  next.setAttribute('aria-keyshortcuts', 'ArrowRight');
  next.title = 'Next CV page (Right arrow)';
  next.addEventListener('click', () => showCVPage(cvPage + 1));
  const download = document.createElement('a');
  download.textContent = 'Download CV';
  download.href = '/justin-wong-resume.pdf';
  download.download = 'Justin-Wong-Resume.pdf';
  actions.append(previous, position, next, download);
}
async function openSection(id, trigger = document.activeElement) {
  if (!sections.has(id)) return;
  if (simple) { document.getElementById(id).scrollIntoView(); return; }
  const token = ++navigation;
  lastTrigger = trigger;
  selected = null;
  document.body.dataset.destination = id;
  await roomReady;
  if (token !== navigation || simple || !room) return;
  if (!await room.focus(id) || token !== navigation) return;
  section = id;
  showControls();
  if (id === 'cv') {
    reader.textContent = 'Study terminal. Type open resume.pdf to open the résumé. Press backslash for commands.';
    terminal.focus();
  }
  else if (id === 'hobbies' || id === 'reading') reader.textContent = document.getElementById(id).textContent.trim();
  else reader.textContent = id === 'work' ? 'Choose a lanyard card. Each card flips over to show the full role.' : 'Choose a titled book to open that project.';
}
async function selectItem(kind, index, updateHistory = true) {
  if (kind === 'cv') { showCVPage(cvPage + 1); return; }
  if ((kind === 'book' || kind === 'reading') && selected?.kind === kind && selected.index === index) return back();
  const token = ++navigation;
  const alreadySelected = selected?.kind === kind && selected.index === index;
  selected = { kind, index };
  if (!alreadySelected && updateHistory) history.pushState(null, '', `#${section}/${kind}-${index}`);
  if (!await room.selectItem(kind, index) || token !== navigation) return;
  showControls();
  const data = kind === 'job' ? jobs[index] : kind === 'reading' ? reading[index] : projects[index];
  reader.textContent = kind === 'job'
    ? `${data.company}. ${data.role}. ${data.dates}. ${data.bullets.join(' ')}`
    : kind === 'reading' ? `${data.title}. ${data.author}. ${data.shelf === 'recent' ? 'Recently read' : 'Currently reading'}.`
      : `${data.title}. ${data.description} ${data.note}`;
}
async function back() {
  const token = ++navigation;
  const item = selected;
  selected = null;
  if (item) {
    setHash(section);
    await room?.back();
    if (token !== navigation) return;
    showControls();
    document.querySelector(`[data-kind="${item.kind}"][data-index="${item.index}"]`)?.focus({ preventScroll: true });
  } else {
    setHash('');
    section = null;
    controls.hidden = true;
    delete document.body.dataset.destination;
    await room?.reset();
    if (token !== navigation) return;
    lastTrigger?.focus?.({ preventScroll: true });
  }
}

document.documentElement.classList.add('enhanced');
toggle.hidden = false;
document.addEventListener('click', event => {
  const link = event.target.closest('a[href^="#"]');
  if (link && sections.has(link.hash.slice(1)) && !simple) {
    event.preventDefault();
    history.pushState(null, '', link.hash);
    openSection(link.hash.slice(1), link);
  }
  if (link?.hash === '#content' && !simple) setSimple(true);
});
backButton.addEventListener('click', back);
window.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !event.defaultPrevented && document.body.dataset.destination) back();
  if (section !== 'cv' || simple || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
  if (event.target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])')) return;
  if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
    event.preventDefault();
    showCVPage(cvPage + (event.key === 'ArrowRight' ? 1 : -1));
  }
});
window.addEventListener('popstate', async () => {
  const [id, item] = location.hash.slice(1).split('/');
  if (!sections.has(id)) {
    selected = null;
    await back();
    return;
  }
  await openSection(id);
  if (item) {
    const [kind, index] = item.split('-');
    if ((kind === 'job' && id === 'work' && jobs[Number(index)]) || (kind === 'book' && id === 'projects' && projects[Number(index)]) || (kind === 'reading' && id === 'reading' && reading[Number(index)])) {
      await selectItem(kind, Number(index), false);
    }
  }
});
toggle.addEventListener('click', () => {
  navigation++;
  setSimple(!simple);
  if (simple) {
    content.focus({ preventScroll: true });
  }
});
function fallback(error) {
  console.error('Unable to render the study:', error);
  room = undefined;
  document.documentElement.classList.add('no-webgl');
  document.querySelector('#room-targets').hidden = true;
  status.hidden = false;
  status.textContent = '3D is unavailable. Use the simple view below.';
  setSimple(true);
}
const roomReady = import('./room.js').then(({ createRoom }) => {
  room = createRoom({
    canvas: document.querySelector('#room'),
    terminal: terminal.element,
    targets: document.querySelector('#room-targets'),
    jobs, projects, reading,
    onSelect: id => {
      history.pushState(null, '', `#${id}`);
      openSection(id, document.querySelector(`[data-anchor="${id}"]`));
    },
    onItemSelect: selectItem,
    onReady: () => { status.hidden = true; },
    onError: fallback,
  });
  const styleId = new URLSearchParams(location.search).get('style');
  if (styleId) import('./styles.js').then(({ interiorStyles }) => {
    const style = interiorStyles.find(style => style.id === styleId);
    if (style) room?.setStyle(style);
  }).catch(error => console.error('Unable to apply interior style:', error));
}).catch(fallback);

const initial = location.hash.slice(1).split('/')[0];
if (sections.has(initial)) openSection(initial).then(async () => {
  const [kind, index] = (location.hash.slice(1).split('/')[1] || '').split('-');
  if ((kind === 'job' && initial === 'work' && jobs[Number(index)]) || (kind === 'book' && initial === 'projects' && projects[Number(index)]) || (kind === 'reading' && initial === 'reading' && reading[Number(index)])) await selectItem(kind, Number(index), false);
});
