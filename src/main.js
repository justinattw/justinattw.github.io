const content = document.querySelector('#content');
const dialog = document.querySelector('#detail-dialog');
const dialogContent = document.querySelector('#dialog-content');
const toggle = document.querySelector('#plain-toggle');
const validSections = new Set(['cv', 'work', 'projects']);
let lastTrigger;
let simple = false;

function cloneSection(id) {
  const section = document.getElementById(id).cloneNode(true);
  for (const element of [section, ...section.querySelectorAll('*')]) {
    if (element.id) element.id = `detail-${element.id}`;
    if (element.hasAttribute('aria-labelledby')) {
      element.setAttribute('aria-labelledby', `detail-${element.getAttribute('aria-labelledby')}`);
    }
  }
  return section;
}

function openSection(id, trigger = document.activeElement) {
  if (!validSections.has(id)) return;
  if (simple || typeof dialog.showModal !== 'function') {
    document.getElementById(id).scrollIntoView();
    return;
  }
  lastTrigger = trigger;
  dialogContent.replaceChildren(cloneSection(id));
  if (id === 'cv') dialogContent.append(cloneSection('work'));
  dialog.setAttribute('aria-labelledby', `detail-${id}-title`);
  if (!dialog.open) dialog.showModal();
  dialog.scrollTop = 0;
}

function navigate(id, trigger) {
  if (!validSections.has(id)) return;
  history.pushState(null, '', `#${id}`);
  openSection(id, trigger);
}

function setSimple(value) {
  simple = value;
  content.classList.toggle('simple-view', simple);
  toggle.textContent = simple ? 'Switch to room view' : 'Switch to simple view';
}

if (typeof dialog.showModal === 'function') {
  document.documentElement.classList.add('enhanced');
  toggle.hidden = false;
  document.querySelectorAll('[data-print]').forEach(button => { button.hidden = false; });
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href^="#"]');
    if (link && validSections.has(link.hash.slice(1)) && !simple) {
      event.preventDefault();
      navigate(link.hash.slice(1), link);
    }
    if (link?.hash === '#content' && !simple) setSimple(true);
    if (event.target.closest('[data-print]')) window.print();
  });
  document.querySelector('#close-dialog').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
  });
  dialog.addEventListener('close', () => {
    if (validSections.has(location.hash.slice(1))) history.replaceState(null, '', location.pathname + location.search);
    if (lastTrigger instanceof HTMLElement) lastTrigger.focus({ preventScroll: true });
  });
  window.addEventListener('popstate', () => {
    const id = location.hash.slice(1);
    if (validSections.has(id)) openSection(id);
    else if (dialog.open) dialog.close();
  });
  toggle.addEventListener('click', () => {
    setSimple(!simple);
    if (simple) content.focus({ preventScroll: true });
  });
  const initial = location.hash.slice(1);
  if (validSections.has(initial)) openSection(initial);
}

const status = document.querySelector('#scene-status');
function fallback(error) {
  console.error('Unable to render the study:', error);
  document.documentElement.classList.add('no-webgl');
  document.querySelector('#room-targets').hidden = true;
  status.hidden = false;
  status.textContent = 'The 3D room is unavailable. All portfolio content is available below.';
  setSimple(true);
}

import('./room.js')
  .then(({ createRoom }) => createRoom({
    canvas: document.querySelector('#room'),
    targets: document.querySelector('#room-targets'),
    onSelect: id => navigate(id, document.querySelector(`[data-anchor="${id}"]`)),
    onReady: () => { status.hidden = true; },
    onError: fallback,
  }))
  .catch(fallback);
