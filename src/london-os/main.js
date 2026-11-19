import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS3DObject, CSS3DRenderer } from 'three/addons/renderers/CSS3DRenderer.js';
import { buildLondon } from './model.js';
import { destinations, icon, readPortfolio } from './portfolio.js';
import fontLicense from './fonts/OFL.txt?url';
import { createTerminal } from '../terminal.js';

const canvas = document.querySelector('#london-view');
const status = document.querySelector('#status');
const source = document.querySelector('#portfolio-source');
const data = readPortfolio(source);
const chapters = destinations.filter(destination => source.querySelector(`#${destination.id}`));
const explore = document.querySelector('#explore');
const targets = document.querySelector('#office-targets');
const card = document.querySelector('#object-card');
const content = document.querySelector('#object-content');
const menu = document.querySelector('#contents-panel');
const menuToggle = document.querySelector('#contents-toggle');
const back = document.querySelector('#back');
const bar = document.querySelector('.view-bar');
const announcement = document.querySelector('#scene-announcement');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let model, office, renderer, controls, camera, focusView;
let view = 'city', selected = null, page = 0, ready = false;
let schedule = () => {};
let pendingFocus = false;
let terminal;
let terminalRenderer, terminalScene, terminalSurface;

document.querySelectorAll('[data-icon]').forEach(element => { element.innerHTML = icon(element.dataset.icon); });
document.querySelector('#font-license').href = fontLicense;
for (const chapter of chapters) {
  const marker = document.createElement('button');
  marker.type = 'button'; marker.className = 'world-marker office-marker';
  marker.dataset.destination = chapter.id;
  marker.setAttribute('aria-controls', chapter.id === 'cv' ? 'computer-terminal' : 'object-card');
  marker.innerHTML = `${icon(chapter.icon)}<span>${chapter.label}</span>`;
  marker.addEventListener('click', () => navigate(chapter.id));
  targets.append(marker);
  const row = document.createElement('button');
  row.type = 'button'; row.className = 'contents-row';
  row.innerHTML = `${icon(chapter.icon)}<span><strong>${chapter.label}</strong><small>${chapter.object}</small></span>${icon('arrow')}`;
  row.addEventListener('click', () => navigate(chapter.id));
  document.querySelector('#contents-list').append(row);
}

function setMenu(open) {
  pendingFocus = false;
  menu.hidden = !open;
  menuToggle.setAttribute('aria-expanded', String(open));
  if (open) menu.querySelector('button').focus({ preventScroll: true });
  else menuToggle.focus({ preventScroll: true });
}
menuToggle.hidden = false;
menuToggle.addEventListener('click', () => setMenu(menu.hidden));
document.querySelector('#close-contents').addEventListener('click', () => setMenu(false));
const creditsToggle = document.querySelector('#credits-toggle');
creditsToggle.addEventListener('click', () => {
  const credits = document.querySelector('#credits');
  credits.hidden = !credits.hidden;
  creditsToggle.setAttribute('aria-expanded', String(!credits.hidden));
});
document.querySelector('.skip-link').addEventListener('click', event => {
  event.preventDefault();
  source.hidden = false;
  source.focus();
});
explore.addEventListener('click', () => navigate('office'));
back.addEventListener('click', goBack);
document.querySelector('#close-object').addEventListener('click', () => navigate('office'));
document.addEventListener('keydown', event => {
  if (event.key !== 'Escape') return;
  if (!source.hidden) { source.hidden = true; menuToggle.focus(); }
  else if (!menu.hidden) setMenu(false);
  else if (!document.querySelector('#credits').hidden) {
    document.querySelector('#credits').hidden = true;
    creditsToggle.setAttribute('aria-expanded', 'false');
    creditsToggle.focus();
  } else goBack();
});
window.addEventListener('popstate', () => readLocation(true));

function resetItems() {
  if (!office) return;
  office.physical.cancel();
  for (const item of office.physical.items) office.physical.animate(item, false, true);
}

function navigate(destination, { item = null, history = true, animate = true, focus = history, moveCamera = true } = {}) {
  if (!['city', 'office', ...chapters.map(chapter => chapter.id)].includes(destination)) return;
  pendingFocus = focus;
  if (terminal) terminal.element.hidden = true;
  if (selected) resetItems();
  view = destination; selected = item; page = 0;
  if (ready && destination !== 'city') {
    office = model.ensureOffice(data, schedule);
    renderer.shadowMap.needsUpdate = true;
    if (item) {
      if (item.kind === 'book') office.physical.setBookPage(item.index, 0);
      office.physical.animate(item, true, reducedMotion.matches || !animate);
    }
  }
  menu.hidden = true;
  menuToggle.setAttribute('aria-expanded', 'false');
  document.querySelector('#credits').hidden = true;
  creditsToggle.setAttribute('aria-expanded', 'false');
  document.body.dataset.view = destination;
  card.hidden = !chapters.some(chapter => chapter.id === destination) || (ready && destination === 'cv');
  bar.hidden = destination === 'city';
  document.querySelector('#back-label').textContent = item
    ? item.kind === 'job' ? 'Back to passes' : 'Back to shelf'
    : destination === 'office' ? 'Back to London' : 'Back to study';
  document.querySelector('#place-name').textContent = destination === 'city' || destination === 'office'
    ? 'Study' : chapters.find(chapter => chapter.id === destination).object;
  if (!card.hidden || (ready && destination === 'cv')) showContent();
  if (history) {
    const hash = destination === 'city' ? '' : `#${destination}${item ? `/${item.kind}-${item.index}` : ''}`;
    if (location.hash !== hash) window.history[history === 'replace' ? 'replaceState' : 'pushState'](null, '', location.pathname + location.search + hash);
  }
  if (moveCamera) focusView?.(animate);
  if (!ready && focus) (card.hidden ? back : card).focus({ preventScroll: true });
  announcement.textContent = destination === 'office'
    ? 'Inside the study. Choose the computer, shelves, passes or cupboard.'
    : destination === 'city' ? 'Back in London.' : `Approaching ${chapters.find(chapter => chapter.id === destination).object.toLowerCase()}.`;
}

function goBack() {
  if (view === 'city') return;
  if (selected) navigate(view);
  else navigate(view === 'office' ? 'city' : 'office');
}

function readLocation(focus = false) {
  const [destination = 'city', encodedItem] = location.hash.slice(1).split('/');
  if (!['city', 'office', ...chapters.map(chapter => chapter.id)].includes(destination || 'city')) return;
  if (encodedItem && ready) {
    office = model.ensureOffice(data, schedule);
    const item = office.physical.items.find(item => `${item.kind}-${item.index}` === encodedItem);
    const expected = item?.kind === 'job' ? 'work' : item?.kind === 'book' ? 'projects' : 'reading';
    if (item && expected === destination) return navigate(destination, { item, history: false, focus });
    announcement.textContent = 'That item is unavailable. Showing its shelf instead.';
  }
  navigate(destination || 'city', { history: false, animate: false, focus });
}

function appendContent(element, omitHeading = false) {
  const clone = element.cloneNode(true);
  if (omitHeading) clone.querySelector('h3')?.remove();
  for (const node of [clone, ...clone.querySelectorAll('[id]')]) node.removeAttribute('id');
  clone.removeAttribute('aria-labelledby');
  content.append(clone);
}

function initializeTerminal() {
  const education = [...source.querySelectorAll('#cv .education')].map(article => [
    article.querySelector('h3').textContent,
    [...article.querySelector('p').childNodes].map(node => node.nodeName === 'BR' ? '\n' : node.textContent).join(''),
    ...[...article.querySelectorAll('div > *')].map(part => part.textContent),
  ].join('\n')).join('\n\n');
  // A real WebGL texture preserves the live screen at a distance and respects scene occlusion.
  const display = document.createElement('canvas');
  display.width = 640; display.height = 420;
  const ctx = display.getContext('2d');
  const texture = new THREE.CanvasTexture(display);
  texture.colorSpace = THREE.SRGBColorSpace;
  office.monitor.material.map.dispose();
  office.monitor.material.map = texture;
  office.monitor.material.needsUpdate = true;
  terminal = createTerminal({
    container: terminalRenderer.domElement,
    onCV: () => terminal.showCV(education),
    onEducation: () => terminal.showCV(education),
    onExit: () => navigate('office'),
    onLinkedIn: () => window.open('https://www.linkedin.com/in/justinattw', '_blank', 'noopener,noreferrer'),
    commandNames: ['download resume.pdf', 'open resume.pdf', 'cat education.txt', 'open linkedin', 'exit'],
    keepHelpVisible: true,
    keepInputFocused: true,
    onStateChange: state => {
      ctx.fillStyle = '#242b2d';
      ctx.fillRect(0, 0, display.width, display.height);
      ctx.font = '20px "Courier New", monospace';
      ctx.fillStyle = '#eeeee8';
      ctx.fillText('\\ for commands', 16, 40);
      const lines = state.output.split('\n').flatMap(line => line.match(/.{1,49}/g) || ['']);
      lines.slice(-9).forEach((line, i) => ctx.fillText(line, 16, 90 + i * 29));
      if (state.commands.length) {
        ctx.fillStyle = '#242b2d';
        ctx.fillRect(16, 70, 608, 280);
        state.commands.forEach((command, i) => {
          const active = i === state.selectedCommand;
          ctx.fillStyle = active ? '#eeeee8' : '#242b2d';
          ctx.fillRect(24, 78 + i * 52, 592, 46);
          ctx.fillStyle = active ? '#242b2d' : '#eeeee8';
          ctx.fillText(command, 36, 108 + i * 52);
        });
      }
      ctx.fillStyle = '#eeeee8';
      ctx.fillText(`justinattw$ ${state.input} ▌`, 16, 392);
      texture.needsUpdate = true;
      schedule();
    },
  });
  terminalSurface = new CSS3DObject(terminal.element);
  terminalSurface.position.copy(office.monitor.getWorldPosition(new THREE.Vector3()));
  terminalSurface.quaternion.copy(office.monitor.getWorldQuaternion(new THREE.Quaternion()));
  const scale = office.monitor.getWorldScale(new THREE.Vector3());
  terminalSurface.scale.set(scale.x * .84 / 640, scale.y * .55 / 420, 1);
  terminalScene.add(terminalSurface);
  terminal.showCV('');
}

function showContent() {
  const chapter = chapters.find(chapter => chapter.id === view);
  document.querySelector('#object-title').textContent = selected?.name || chapter.label;
  const objectLocation = document.querySelector('#object-location');
  objectLocation.textContent = chapter.object;
  objectLocation.hidden = view === 'work';
  content.replaceChildren();
  if (view === 'cv' && ready) {
    terminal.element.hidden = false;
    pendingFocus = true;
    return;
  }
  if (selected) {
    const selector = selected.kind === 'job' ? '#work .access-card' : selected.kind === 'book' ? '#projects .project-card' : '#reading li';
    const element = source.querySelectorAll(selector)[selected.index];
    appendContent(element, selected.kind === 'job');
    if (selected.kind === 'book') {
      const pages = document.createElement('div');
      pages.className = 'page-controls';
      pages.innerHTML = '<button type="button" aria-label="Previous book page">←</button><span></span><button type="button" aria-label="Next book page">→</button>';
      const [previous, next] = pages.querySelectorAll('button'), count = office.physical.getBookPageCount(selected.index);
      const update = () => {
        office.physical.setBookPage(selected.index, page);
        pages.querySelector('span').textContent = `Book spread ${page + 1} of ${count}`;
        previous.disabled = !page; next.disabled = page === count - 1;
      };
      previous.addEventListener('click', () => { page--; update(); });
      next.addEventListener('click', () => { page++; update(); });
      content.append(pages); update();
    }
  } else {
    const section = source.querySelector(`#${view}`).cloneNode(true);
    section.querySelector('h2')?.remove();
    if (view === 'reading') section.querySelectorAll('[data-reading-shelf]').forEach(shelf => shelf.remove());
    if (view === 'work') section.querySelector('.access-cards')?.remove();
    appendContent(section);
    if (office && ['projects', 'reading', 'work'].includes(view)) {
      const kind = { projects: 'book', reading: 'reading', work: 'job' }[view];
      const list = document.createElement('div');
      list.className = 'item-list';
      const label = document.createElement('p');
      label.textContent = view === 'work' ? 'Pick up a pass to turn it over.' : 'Choose a book to open it in the room.';
      list.append(label);
      for (const item of office.physical.items.filter(item => item.kind === kind)) {
        const button = document.createElement('button');
        button.type = 'button';
        const text = document.createElement('span'); text.textContent = item.name;
        if (view === 'reading') {
          const author = document.createElement('small');
          author.textContent = data.reading[item.index].author;
          text.append(document.createTextNode(' '), author);
        }
        button.append(text); button.insertAdjacentHTML('beforeend', icon('arrow'));
        button.addEventListener('click', () => navigate(view, { item }));
        list.append(button);
      }
      content.prepend(list);
    }
  }
  card.scrollTop = 0;
}

function unavailable(error) {
  console.error('London study unavailable:', error);
  ready = false;
  if (terminal) terminal.element.hidden = true;
  focusView = undefined;
  if (controls) controls.enabled = false;
  explore.hidden = targets.hidden = true;
  status.textContent = 'The 3D world could not render. Reload with WebGL enabled, or use View contents to read the portfolio.';
  status.hidden = false;
}

try { start(); } catch (error) { unavailable(error); }

function start() {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.65));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = .95;
  terminalRenderer = new CSS3DRenderer();
  terminalRenderer.domElement.className = 'study-screen-layer';
  document.querySelector('#world').append(terminalRenderer.domElement);
  terminalScene = new THREE.Scene();
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#292d2d');
  scene.fog = new THREE.Fog('#292d2d', 35, 185);
  scene.add(new THREE.HemisphereLight('#edf4f8', '#93937b', 2.4));
  const sun = new THREE.DirectionalLight('#fff8eb', 2.1);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -38, right: 38, top: 38, bottom: -38, near: .1, far: 140 });
  sun.shadow.normalBias = .035;
  scene.add(sun, sun.target);
  model = buildLondon(scene);
  sun.target.position.copy(model.house);
  sun.position.copy(model.house).add(new THREE.Vector3(-28, 62, 25));
  camera = new THREE.PerspectiveCamera(40, 1, .05, 2200);
  controls = new OrbitControls(camera, canvas);
  controls.enablePan = false;
  controls.minPolarAngle = Math.PI * .07;
  controls.maxPolarAngle = Math.PI * .47;
  controls.minDistance = .16;
  controls.maxDistance = 190;
  controls.rotateSpeed = .5;
  let frame = 0, motion, lost = false, previousTime = performance.now();
  const homeAngle = THREE.MathUtils.degToRad(15);
  const homeDirection = new THREE.Vector3(-Math.cos(homeAngle), .38, Math.sin(homeAngle)).normalize();
  schedule = () => { if (!frame && !lost) frame = requestAnimationFrame(render); };
  controls.addEventListener('change', schedule);
  reducedMotion.addEventListener('change', schedule);
  document.addEventListener('visibilitychange', schedule);
  office = model.ensureOffice(data, schedule);
  initializeTerminal();

  function render(now) {
    frame = 0;
    if (lost) return;
    const elapsed = Math.max(0, (now - previousTime) / 1000);
    const delta = Math.min(.05, elapsed);
    previousTime = now;
    if (motion) {
      const t = reducedMotion.matches ? 1 : Math.min(1, (now - motion.start) / motion.duration);
      const eased = 1 - (1 - t) ** 4;
      camera.position.lerpVectors(motion.from, motion.to, eased);
      controls.target.lerpVectors(motion.fromTarget, motion.target, eased);
      controls.update();
      if (t === 1) {
        motion = null; controls.enabled = true;
      }
    }
    const cabinetMoving = office?.hobbies.update(delta, view === 'hobbies', reducedMotion.matches) || false;
    const objectMoving = office?.physical.step(now, reducedMotion.matches) || false;
    const roomMoving = office?.updateRoom(Math.min(.25, elapsed), now / 1000, view, reducedMotion.matches || document.hidden) || false;
    const radius = camera.position.distanceTo(controls.target);
    const distance = camera.position.distanceTo(model.roomCenter);
    if (!motion) {
      let destination = view;
      if (distance >= 24) destination = 'city';
      else if ((distance <= 16 && view === 'city') || (distance >= 16 && view !== 'city' && view !== 'office')) destination = 'office';
      if (destination !== view) {
        const restoreFocus = targets.contains(document.activeElement) || card.contains(document.activeElement);
        navigate(destination, { history: 'replace', focus: restoreFocus, moveCamera: false });
        camera.clearViewOffset();
        controls.target.copy(model.roomCenter);
        controls.update();
      }
    }
    scene.fog.near = Math.max(12, radius * .55);
    scene.fog.far = radius + 115;
    if (cabinetMoving || objectMoving) renderer.shadowMap.needsUpdate = true;
    renderer.render(scene, camera);
    if (terminal) {
      terminal.element.hidden = view !== 'cv' || Boolean(motion);
      if (!terminal.element.hidden) terminalRenderer.render(terminalScene, camera);
    }
    positionMarkers();
    if (pendingFocus && !motion) {
      if (view === 'cv' && terminal) terminal.focus();
      else {
        const destination = card.hidden ? view === 'city' ? explore : targets.querySelector('button') : card;
        destination.focus({ preventScroll: true });
      }
      pendingFocus = false;
    }
    canvas.dataset.view = view;
    canvas.dataset.item = selected ? `${selected.kind}-${selected.index}` : '';
    canvas.dataset.transition = String(Boolean(motion));
    canvas.dataset.orbit = camera.position.toArray().map(n => n.toFixed(3)).join(',');
    canvas.dataset.features = model.featureCount;
    const center = projectPoint(model.roomCenter);
    canvas.dataset.roomCenter = `${center.x.toFixed(2)},${center.y.toFixed(2)}`;
    canvas.dataset.furnishedItems = office.physical.items.length;
    canvas.dataset.catAction = office.cat.root.userData.action;
    canvas.dataset.catPosition = office.cat.root.position.toArray().map(value => value.toFixed(3)).join(',');
    if (motion || cabinetMoving || objectMoving || roomMoving) schedule();
  }

  function projectPoint(point) {
    const projected = point.clone().project(camera);
    return { x: (projected.x + 1) * canvas.clientWidth / 2, y: (1 - projected.y) * canvas.clientHeight / 2, visible: projected.z > -1 && projected.z < 1 };
  }
  function place(element, point, offsetX = 0, offsetY = 0) {
    const p = projectPoint(point);
    element.style.visibility = p.visible ? 'visible' : 'hidden';
    const half = element.offsetWidth / 2 + 14;
    const x = THREE.MathUtils.clamp(p.x + offsetX, half, canvas.clientWidth - half);
    const minimumY = view === 'city' && canvas.clientWidth <= 760
      ? document.querySelector('.intro').getBoundingClientRect().bottom + element.offsetHeight + 12 : 170;
    const y = THREE.MathUtils.clamp(p.y + offsetY, minimumY, canvas.clientHeight - 100);
    element.style.left = `${x}px`; element.style.top = `${y}px`;
    return { x, y, width: element.offsetWidth, height: element.offsetHeight, element };
  }
  function positionMarkers() {
    const distance = camera.position.distanceTo(model.roomCenter);
    const inStudy = distance <= 16;
    const focused = view !== 'city' && view !== 'office';
    explore.hidden = inStudy || focused;
    targets.hidden = !inStudy || focused;
    if (!explore.hidden) place(explore, model.marker);
    if (!targets.hidden && office) {
      const placements = [];
      for (const element of targets.children) {
        const id = element.dataset.destination;
        const dx = id === 'projects' || id === 'reading' ? -35 : id === 'work' || id === 'hobbies' ? 45 : 0;
        placements.push(place(element, office.anchors[id], dx, id === 'reading' ? -15 : 0));
      }
      for (let pass = 0; pass < 8; pass++) {
        for (let i = 0; i < placements.length; i++) for (let j = i + 1; j < placements.length; j++) {
          const a = placements[i], b = placements[j];
          if (Math.abs(a.x - b.x) < (a.width + b.width) / 2 + 8 && Math.abs(a.y - b.y) < (a.height + b.height) / 2 + 10) {
            const shift = a.y < b.y ? -14 : 14;
            a.y += shift; b.y -= shift;
          }
        }
      }
      for (const p of placements) p.element.style.top = `${THREE.MathUtils.clamp(p.y, 190, canvas.clientHeight - 100)}px`;
    }
  }

  function frameCard() {
    const mobile = canvas.clientWidth <= 760;
    camera.clearViewOffset();
    if (!card.hidden) {
      const rect = card.getBoundingClientRect();
      const top = bar.getBoundingClientRect().bottom;
      camera.setViewOffset(canvas.clientWidth, canvas.clientHeight, mobile ? 0 : rect.width * .58, mobile ? (canvas.clientHeight - top - rect.top) / 2 : 0, canvas.clientWidth, canvas.clientHeight);
    }
  }
  focusView = animate => {
    const mobile = canvas.clientWidth <= 760;
    const target = selected
      ? selected.root.parent.localToWorld(selected.stage.clone())
      : view === 'city' || view === 'office' ? model.roomCenter.clone() : office.anchors[view].clone();
    let radius = view === 'city' ? mobile ? 83 : 62
      : view === 'office' ? 7.8
        : selected ? mobile ? 3 : 1.8
          : view === 'cv' ? mobile ? .65 : .38
            : view === 'projects' ? mobile ? .62 : .46
              : view === 'reading' ? mobile ? .7 : .62
                : view === 'work' ? mobile ? 1.45 : .85
            : view === 'hobbies' ? mobile ? 2.1 : 1.4
              : mobile ? 3.5 : 2.2;
    const direction = view === 'city' ? homeDirection
      : view === 'cv' ? office.monitor.getWorldDirection(new THREE.Vector3())
        : view === 'work' ? new THREE.Vector3(-.18, .08, 1).normalize()
        : view === 'hobbies' ? new THREE.Vector3(-1, .22, .45).normalize()
          : new THREE.Vector3(.04, selected ? .18 : view === 'office' ? .48 : .22, 1).normalize();
    if (mobile && view === 'office') {
      const right = new THREE.Vector3().crossVectors(camera.up, direction).normalize();
      const halfWidth = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * camera.aspect * .98;
      radius = 0;
      for (const x of [model.roomBounds.min.x, model.roomBounds.max.x]) {
        for (const y of [model.roomBounds.min.y, model.roomBounds.max.y]) {
          for (const z of [model.roomBounds.min.z, model.roomBounds.max.z]) {
            const offset = new THREE.Vector3(x, y, z).sub(target);
            radius = Math.max(radius, offset.dot(direction) + Math.abs(offset.dot(right)) / halfWidth);
          }
        }
      }
    }
    const to = direction.clone().multiplyScalar(radius).add(target);
    frameCard();
    if (animate && !reducedMotion.matches) {
      controls.enabled = false;
      motion = { start: performance.now(), duration: view === 'city' ? 1400 : 1100, from: camera.position.clone(), to, fromTarget: controls.target.clone(), target };
    } else {
      motion = null;
      camera.position.copy(to); controls.target.copy(target); controls.update();
      controls.enabled = true;
    }
    schedule();
  };
  function resize() {
    if (lost || !canvas.clientWidth || !canvas.clientHeight) return;
    camera.aspect = canvas.clientWidth / canvas.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
    terminalRenderer.setSize(canvas.clientWidth, canvas.clientHeight);
    focusView(false);
  }
  let pointerStart;
  canvas.addEventListener('pointerdown', event => { pointerStart = { x: event.clientX, y: event.clientY }; });
  canvas.addEventListener('pointerup', event => {
    if (!office || !pointerStart || view === 'city' || motion || Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y) > 5) return;
    const rect = canvas.getBoundingClientRect();
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2((event.clientX - rect.left) / rect.width * 2 - 1, 1 - (event.clientY - rect.top) / rect.height * 2), camera);
    for (const hit of raycaster.intersectObject(model.neighbourhood, true)) {
      if (hit.object.userData.destination) {
        navigate(hit.object.userData.destination);
        break;
      }
      let object = hit.object;
      while (object && !object.userData.interaction) object = object.parent;
      if (!object) continue;
      const interaction = object.userData.interaction;
      const item = office.physical.items.find(item => item.kind === interaction.kind && item.index === interaction.index);
      if (item) navigate(item.kind === 'job' ? 'work' : item.kind === 'book' ? 'projects' : 'reading', { item });
      break;
    }
  });
  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault(); lost = true;
    unavailable(new Error('WebGL context lost'));
  });
  ready = true;
  camera.aspect = canvas.clientWidth / canvas.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
  terminalRenderer.setSize(canvas.clientWidth, canvas.clientHeight);
  readLocation();
  new ResizeObserver(resize).observe(canvas);
  new ResizeObserver(() => {
    if (!ready || card.hidden || !canvas.clientWidth || !canvas.clientHeight) return;
    frameCard();
    schedule();
  }).observe(card);
  renderer.shadowMap.needsUpdate = true;
  status.hidden = true;
  schedule();
}
