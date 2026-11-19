import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildLondon } from './model.js';
import { destinations, icon, readPortfolio } from './portfolio.js';
import fontLicense from './fonts/OFL.txt?url';

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

document.querySelectorAll('[data-icon]').forEach(element => { element.innerHTML = icon(element.dataset.icon); });
document.querySelector('#font-license').href = fontLicense;
for (const chapter of chapters) {
  const marker = document.createElement('button');
  marker.type = 'button'; marker.className = 'world-marker office-marker';
  marker.dataset.destination = chapter.id;
  marker.setAttribute('aria-controls', 'object-card');
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
  card.hidden = !chapters.some(chapter => chapter.id === destination);
  bar.hidden = destination === 'city';
  document.querySelector('#back-label').textContent = item
    ? item.kind === 'job' ? 'Back to passes' : 'Back to shelf'
    : destination === 'office' ? 'Back to London' : 'Back to study';
  document.querySelector('#place-name').textContent = destination === 'city' || destination === 'office'
    ? 'The Study' : chapters.find(chapter => chapter.id === destination).object;
  if (!card.hidden) showContent();
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

function appendContent(element) {
  const clone = element.cloneNode(true);
  for (const node of [clone, ...clone.querySelectorAll('[id]')]) node.removeAttribute('id');
  clone.removeAttribute('aria-labelledby');
  content.append(clone);
}

function showContent() {
  const chapter = chapters.find(chapter => chapter.id === view);
  document.querySelector('#object-title').textContent = selected?.name || chapter.label;
  document.querySelector('#object-location').textContent = chapter.object;
  content.replaceChildren();
  if (selected) {
    const selector = selected.kind === 'job' ? '#work .access-card' : selected.kind === 'book' ? '#projects .project-card' : '#reading li';
    const element = source.querySelectorAll(selector)[selected.index];
    appendContent(element);
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
  focusView = undefined;
  if (controls) controls.enabled = false;
  explore.hidden = targets.hidden = true;
  document.querySelector('.orbit-controls').hidden = true;
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
  controls.minDistance = .7;
  controls.maxDistance = 190;
  controls.rotateSpeed = .5;
  let frame = 0, motion, lost = false, previousTime = performance.now();
  const homeDirection = new THREE.Vector3(.45, .72, 1).normalize();
  schedule = () => { if (!frame && !lost) frame = requestAnimationFrame(render); };
  controls.addEventListener('change', schedule);
  office = model.ensureOffice(data, schedule);

  function render(now) {
    frame = 0;
    if (lost) return;
    const delta = Math.min(.05, (now - previousTime) / 1000);
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
    const radius = camera.position.distanceTo(controls.target);
    const distance = camera.position.distanceTo(model.roomCenter);
    if (!motion) {
      let destination = view;
      if (distance >= 24) destination = 'city';
      else if ((distance <= 16 && view === 'city') || (distance >= 16 && !card.hidden)) destination = 'office';
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
    positionMarkers();
    if (pendingFocus && !motion) {
      const destination = card.hidden ? view === 'city' ? explore : targets.querySelector('button') : card;
      destination.focus({ preventScroll: true });
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
    if (motion || cabinetMoving || objectMoving) schedule();
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
    const amount = 1 - THREE.MathUtils.smoothstep(distance, 16, 24);
    explore.hidden = amount === 1 || !card.hidden;
    targets.hidden = amount === 0 || !card.hidden;
    explore.style.opacity = 1 - amount;
    explore.style.pointerEvents = amount < .5 ? 'auto' : 'none';
    explore.tabIndex = amount < .5 ? 0 : -1;
    if (!explore.hidden) place(explore, model.marker);
    if (!targets.hidden && office) {
      const placements = [];
      for (const element of targets.children) {
        const id = element.dataset.destination;
        const dx = id === 'projects' || id === 'reading' ? -35 : id === 'work' || id === 'hobbies' ? 45 : 0;
        element.style.opacity = amount;
        element.style.pointerEvents = amount >= .5 ? 'auto' : 'none';
        element.tabIndex = amount >= .5 ? 0 : -1;
        const point = model.marker.clone().lerp(office.anchors[id], amount);
        placements.push(place(element, point, dx * amount, id === 'reading' ? -15 * amount : 0));
      }
      for (let pass = 0; pass < 8; pass++) {
        for (let i = 0; i < placements.length; i++) for (let j = i + 1; j < placements.length; j++) {
          const a = placements[i], b = placements[j];
          if (Math.abs(a.x - b.x) < (a.width + b.width) / 2 + 8 && Math.abs(a.y - b.y) < (a.height + b.height) / 2 + 10) {
            const shift = (a.y < b.y ? -14 : 14) * amount;
            a.y += shift; b.y -= shift;
          }
        }
      }
      for (const p of placements) p.element.style.top = `${THREE.MathUtils.clamp(p.y, 190, canvas.clientHeight - 100)}px`;
    }
  }

  focusView = animate => {
    const mobile = canvas.clientWidth <= 760;
    const target = selected
      ? selected.root.parent.localToWorld(selected.stage.clone())
      : view === 'city' || view === 'office' ? model.roomCenter.clone() : office.anchors[view].clone();
    const radius = view === 'city' ? mobile ? 83 : 62 : view === 'office' ? mobile ? 13 : 7.8 : selected ? mobile ? 3 : 1.8 : mobile ? 3.5 : 2.2;
    const direction = view === 'city' ? homeDirection
      : view === 'work' ? new THREE.Vector3(-.45, .35, 1).normalize()
        : new THREE.Vector3(.04, selected ? .18 : view === 'office' ? .48 : .22, 1).normalize();
    const to = direction.clone().multiplyScalar(radius).add(target);
    camera.clearViewOffset();
    if (!card.hidden) {
      const rect = card.getBoundingClientRect();
      const top = bar.getBoundingClientRect().bottom;
      camera.setViewOffset(canvas.clientWidth, canvas.clientHeight, mobile ? 0 : rect.width * .58, mobile ? (canvas.clientHeight - top - rect.top) / 2 : 0, canvas.clientWidth, canvas.clientHeight);
    }
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
    focusView(false);
  }
  document.querySelector('.orbit-controls').addEventListener('click', event => {
    const action = event.target.closest('button')?.dataset.action;
    if (!action || motion || lost) return;
    if (action === 'reset') return navigate('city');
    const offset = camera.position.clone().sub(controls.target);
    if (action === 'left') offset.applyAxisAngle(camera.up, -Math.PI / 8);
    else offset.multiplyScalar(action === 'in' ? .8 : 1.25).clampLength(controls.minDistance, controls.maxDistance);
    camera.position.copy(controls.target).add(offset);
    controls.update(); schedule();
  });
  let pointerStart;
  canvas.addEventListener('pointerdown', event => { pointerStart = { x: event.clientX, y: event.clientY }; });
  canvas.addEventListener('pointerup', event => {
    if (!office || !pointerStart || view === 'city' || motion || Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y) > 5) return;
    const rect = canvas.getBoundingClientRect();
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2((event.clientX - rect.left) / rect.width * 2 - 1, 1 - (event.clientY - rect.top) / rect.height * 2), camera);
    for (const hit of raycaster.intersectObject(model.neighbourhood, true)) {
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
  readLocation();
  new ResizeObserver(resize).observe(canvas);
  renderer.shadowMap.needsUpdate = true;
  status.hidden = true;
  document.querySelector('.orbit-controls').hidden = false;
  schedule();
}
