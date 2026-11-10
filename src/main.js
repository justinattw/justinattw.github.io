const content = document.querySelector('#content');
const dialog = document.querySelector('#detail-dialog');
const dialogContent = document.querySelector('#dialog-content');
const toggle = document.querySelector('#plain-toggle');
const validSections = new Set(['cv', 'work', 'projects']);
let lastTrigger, room;
let simple = false;
let navigation = 0;
let handledCloseEvents = 0;

function cloneSection(id) {
  const section = document.getElementById(id).cloneNode(true);
  for (const element of [section, ...section.querySelectorAll('*')]) {
    if (element.id) element.id = `detail-${element.id}`;
    if (element.hasAttribute('aria-labelledby')) element.setAttribute('aria-labelledby', `detail-${element.getAttribute('aria-labelledby')}`);
  }
  return section;
}

function cvExperience() {
  const section = document.createElement('section');
  section.className = 'cv-experience';
  const heading = document.createElement('h3');
  heading.textContent = 'Experience';
  section.append(heading);
  for (const badge of document.querySelectorAll('#work .badge-body')) {
    const role = document.createElement('article');
    role.className = 'resume-role';
    for (const selector of ['h3', '.role-detail', '.dates', 'ul']) role.append(badge.querySelector(selector).cloneNode(true));
    section.append(role);
  }
  return section;
}

function setSimple(value) {
  simple = value;
  document.body.classList.toggle('simple', value);
  content.classList.toggle('simple-view', value);
  toggle.textContent = value ? 'Room view' : 'Simple view';
}

async function openSection(id, trigger = document.activeElement) {
  if (!validSections.has(id)) return;
  if (simple || typeof dialog.showModal !== 'function') {
    document.getElementById(id).scrollIntoView();
    return;
  }
  const token = ++navigation;
  lastTrigger = trigger;
  document.body.dataset.destination = id;
  await roomReady;
  if (token !== navigation || simple) return;
  if (room && !await room.focus(id)) return;
  if (token !== navigation) return;
  const section = cloneSection(id);
  if (id === 'cv') section.append(cvExperience());
  dialogContent.replaceChildren(section);
  dialog.dataset.section = id;
  dialog.setAttribute('aria-labelledby', `detail-${id}-title`);
  if (!dialog.open) dialog.showModal();
  dialog.scrollTop = 0;
}

function navigate(id, trigger) {
  if (!validSections.has(id)) return;
  history.pushState(null, '', `#${id}`);
  openSection(id, trigger);
}

async function returnToRoom() {
  const token = ++navigation;
  delete document.body.dataset.destination;
  if (room) await room.reset();
  if (token !== navigation) return;
  if (lastTrigger instanceof HTMLElement) lastTrigger.focus({ preventScroll: true });
}

function closeDetail(clearHash = true) {
  if (clearHash && validSections.has(location.hash.slice(1))) history.replaceState(null, '', location.pathname + location.search);
  if (dialog.open) {
    handledCloseEvents++;
    dialog.close();
  }
  returnToRoom();
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
  document.querySelector('#close-dialog').addEventListener('click', () => closeDetail());
  dialog.addEventListener('cancel', event => { event.preventDefault(); closeDetail(); });
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) closeDetail();
  });
  dialog.addEventListener('close', () => {
    if (handledCloseEvents) { handledCloseEvents--; return; }
    if (validSections.has(location.hash.slice(1))) history.replaceState(null, '', location.pathname + location.search);
    returnToRoom();
  });
  window.addEventListener('popstate', () => {
    const id = location.hash.slice(1);
    if (validSections.has(id)) openSection(id);
    else if (dialog.open) closeDetail(false);
    else returnToRoom();
  });
  window.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !dialog.open && document.body.dataset.destination) {
      history.replaceState(null, '', location.pathname + location.search);
      returnToRoom();
    }
  });
  toggle.addEventListener('click', () => {
    navigation++;
    setSimple(!simple);
    if (simple) {
      delete document.body.dataset.destination;
      room?.reset();
      content.focus({ preventScroll: true });
    }
  });
}

const status = document.querySelector('#scene-status');
function fallback(error) {
  console.error('Unable to render the study:', error);
  room = undefined;
  document.documentElement.classList.add('no-webgl');
  document.querySelector('#room-targets').hidden = true;
  status.hidden = false;
  status.textContent = '3D is unavailable. Use the simple view below.';
  setSimple(true);
}

const roomReady = import('./room.js')
  .then(({ createRoom }) => {
    room = createRoom({
      canvas: document.querySelector('#room'),
      targets: document.querySelector('#room-targets'),
      onSelect: id => navigate(id, document.querySelector(`[data-anchor="${id}"]`)),
      onReady: () => { status.hidden = true; },
      onError: fallback,
    });
  })
  .catch(fallback);

if (validSections.has(location.hash.slice(1))) openSection(location.hash.slice(1));
