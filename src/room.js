import * as THREE from 'three';

export function createRoom({ canvas, targets, onSelect, onReady, onError }) {
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-8, 8, 5, -5, .1, 100);
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;
  scene.add(new THREE.AmbientLight(0xffefd7, 1.6));
  const sunlight = new THREE.DirectionalLight(0xffe6bc, 3.2);
  sunlight.position.set(-3, 10, 7);
  sunlight.castShadow = true;
  sunlight.shadow.mapSize.set(2048, 2048);
  Object.assign(sunlight.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: .1, far: 30 });
  sunlight.shadow.normalBias = .035;
  sunlight.shadow.bias = -.0001;
  sunlight.shadow.radius = 4;
  scene.add(sunlight);
  const fill = new THREE.DirectionalLight(0xe4edda, 1);
  fill.position.set(6, 5, 2);
  scene.add(fill);

  const materials = new Map();
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const groups = {};
  function material(color) {
    if (!materials.has(color)) materials.set(color, new THREE.MeshStandardMaterial({ color, roughness: .88 }));
    return materials.get(color);
  }
  function box(x, y, z, w, h, d, color, group = scene) {
    const mesh = new THREE.Mesh(geometry, material(color));
    mesh.position.set(x, y, z);
    mesh.scale.set(w, h, d);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  }
  function cylinder(x, y, z, r, h, color, group = scene, topRadius = r, segments = 20) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(topRadius, r, h, segments), material(color));
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  }
  function sphere(x, y, z, sx, sy, sz, color, group = scene) {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), material(color));
    mesh.position.set(x, y, z);
    mesh.scale.set(sx, sy, sz);
    mesh.castShadow = true;
    group.add(mesh);
    return mesh;
  }
  function group(id) {
    const result = new THREE.Group();
    result.userData.destination = id;
    groups[id] = result;
    scene.add(result);
    return result;
  }
  function label(text, x, y, z, w, h, { background = '#eee4cc', foreground = '#455d47', size = 36 } = {}, parent = scene) {
    const surface = document.createElement('canvas');
    surface.width = 512;
    surface.height = 256;
    const context = surface.getContext('2d');
    if (!context) throw new Error('Canvas text rendering is unavailable.');
    context.fillStyle = background;
    context.fillRect(0, 0, 512, 256);
    context.fillStyle = foreground;
    context.font = `${size}px monospace`;
    context.textBaseline = 'middle';
    const lines = text.split('\n');
    lines.forEach((line, i) => context.fillText(line, 30, 128 + (i - (lines.length - 1) / 2) * size * 1.5));
    const texture = new THREE.CanvasTexture(surface);
    texture.colorSpace = THREE.SRGBColorSpace;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: texture }));
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  }

  // Open-front room and staggered oak floorboards.
  box(0, -.19, 0, 10, .38, 7.2, '#ad9171');
  for (let i = 0; i < 16; i++) {
    for (let j = 0; j < 4; j++) {
      box(-4.68 + i * .625, .015, -2.7 + j * 1.8, .605, .045, 1.78, ['#c5a37b', '#cdb18a', '#d2b58e'][(i + j) % 3]);
    }
  }
  box(0, 2.4, -3.5, 10, 4.8, .14, '#bdc3a6');
  box(-4.95, 2.4, 0, .14, 4.8, 7.1, '#aeb89b');
  box(0, .17, -3.38, 9.85, .25, .1, '#e1d8be');
  box(-4.82, .17, 0, .1, .25, 6.9, '#e1d8be');
  box(0, 4.78, -3.45, 10, .09, .26, '#e1d8be');
  box(-4.9, 4.78, 0, .26, .09, 7.1, '#e1d8be');
  // Glowing window on the left wall.
  box(-4.84, 3.05, -.6, .12, 2.2, 2.25, '#e5dfc5');
  const windowPane = box(-4.75, 3.05, -.6, .08, 1.93, 1.98, '#f2e5b4');
  windowPane.material = new THREE.MeshStandardMaterial({ color: '#f5e8bd', emissive: '#e8ce8a', emissiveIntensity: .5 });
  box(-4.69, 3.05, -.6, .07, 2.03, .07, '#faf0d2');
  box(-4.69, 3.05, -.6, .07, .07, 2.04, '#faf0d2');
  box(-4.61, 1.91, -.6, .5, .13, 2.5, '#e3d6b4');
  // Flat sunlight patches and a woven rug.
  box(-3.9, .047, .2, 1.5, .01, 2.6, '#dfc79e');
  box(.6, .07, 1.3, 5.1, .035, 3.1, '#929a7b');
  box(.6, .09, 1.3, 4.8, .018, 2.8, '#b0b599');
  for (let i = 0; i < 28; i++) box(-1.72 + i * .173, .104, 1.3, .016, .009, 2.76, '#a1aa8d');
  for (const z of [-.04, 2.64]) box(.6, .11, z, 4.8, .015, .04, '#788667');
  for (let i = 0; i < 25; i++) {
    for (const z of [-.3, 2.9]) box(-1.8 + i * .2, .07, z, .04, .02, .17, '#adb192');
  }

  const shelf = group('projects');
  box(-3.3, 1.65, -2.36, 2.25, 3.3, .72, '#826348', shelf);
  box(-3.3, 1.7, -2.04, 2.02, 3.05, .08, '#a1835c', shelf);
  for (const x of [-4.38, -2.22]) box(x, 1.65, -1.98, .12, 3.3, .9, '#987653', shelf);
  for (const y of [.15, 1.15, 2.15, 3.25]) box(-3.3, y, -1.96, 2.25, .12, .95, '#b18a5f', shelf);
  const bookColors = ['#697b60', '#c1aa7c', '#9d6450', '#e5d6b6', '#6c8280', '#414f42'];
  for (let i = 0; i < 7; i++) {
    const h = .5 + (i % 3) * .13, x = -4.1 + i * .23;
    box(x, .24 + h / 2, -1.88, .18, h, .47, bookColors[i % 6], shelf);
    for (const y of [.24 + h * .72, .24 + h * .25]) box(x, y, -1.635, .12, .025, .012, '#d7c9a5', shelf);
  }
  box(-3.79, 1.42, -1.85, .63, .4, .5, '#d6cfb7', shelf);
  label('>_ runtime', -3.79, 1.45, -1.588, .48, .23, { background: '#2f4739', foreground: '#adc08a', size: 49 }, shelf);
  box(-2.87, 1.29, -1.84, .63, .14, .53, '#815b46', shelf);
  box(-2.87, 1.4, -1.84, .53, .07, .43, '#e9dec3', shelf);
  box(-2.86, 1.49, -1.84, .59, .08, .48, '#6d8068', shelf);
  box(-3.65, 2.61, -1.88, .52, .73, .035, '#eee4cc', shelf);
  label('MOMENTUM\nFIELD NOTES\n________', -3.65, 2.61, -1.857, .46, .65, { size: 40 }, shelf);
  cylinder(-2.75, 2.4, -1.9, .22, .36, '#b48763', shelf, .18);
  sphere(-2.75, 2.73, -1.9, .11, .26, .11, '#6d8056', shelf);
  sphere(-2.86, 2.65, -1.87, .1, .13, .08, '#8c9a6b', shelf);
  label('CURIOSITIES & BUILDS', -3.3, 3.28, -1.475, 1.1, .12, { background: '#b18a5f', size: 35 }, shelf);

  // Desk, drawer fronts and brass handles.
  box(.05, 1.58, -1.28, 3.75, .19, 1.75, '#b89062');
  box(.05, 1.69, -1.28, 3.75, .025, 1.75, '#c9a676');
  for (const x of [-1.6, 1.67]) for (const z of [-1.91, -.63]) box(x, .8, z, .13, 1.55, .13, '#8d7050');
  box(1.2, 1.05, -1.22, .7, .85, 1.22, '#a37e56');
  for (const y of [.79, 1.08, 1.36]) {
    box(1.2, y, -.59, .63, .24, .04, '#bc9869');
    box(1.2, y, -.555, .2, .025, .025, '#705e43');
  }
  const computer = group('cv');
  box(-.15, 1.78, -1.6, .68, .14, .48, '#bebca5', computer);
  box(-.15, 1.94, -1.64, .18, .3, .2, '#cac7af', computer);
  box(-.15, 2.29, -1.58, 1.27, .92, .72, '#d7d3b9', computer);
  box(-.15, 2.31, -1.202, 1.04, .68, .055, '#8d9580', computer);
  label('JUSTIN WONG\nSOFTWARE ENGINEER\n> open cv.txt _', -.15, 2.33, -1.167, .91, .54, { background: '#223f35', foreground: '#c4d6a5', size: 30 }, computer);
  box(.21, 1.91, -1.2, .045, .02, .02, '#cdb27b', computer);
  box(-.27, 1.747, -.75, 1.22, .085, .38, '#d9d3ba', computer);
  for (let row = 0; row < 3; row++) for (let col = 0; col < 12; col++) box(-.78 + col * .094, 1.8, -.88 + row * .1, .074, .025, .073, '#b3b6a0', computer);
  sphere(.64, 1.77, -.72, .08, .065, .13, '#d5cfb6', computer);
  cylinder(-1.32, 1.76, -1.76, .24, .08, '#405549');
  box(-1.32, 2.07, -1.76, .045, .59, .045, '#5c6e56');
  box(-1.13, 2.35, -1.76, .43, .045, .045, '#5c6e56');
  cylinder(-.96, 2.33, -1.76, .27, .25, '#5c7059', scene, .14);
  cylinder(-.96, 2.197, -1.76, .235, .012, '#e5c68b');
  const lampLight = new THREE.PointLight('#ffd18c', 1, 2);
  lampLight.position.set(-.96, 2.15, -1.76);
  scene.add(lampLight);
  cylinder(.81, 1.88, -1.64, .1, .3, '#c3ad89');
  cylinder(.81, 2.035, -1.64, .08, .015, '#6b5139');
  const handle = new THREE.Mesh(new THREE.TorusGeometry(.085, .022, 6, 12), material('#c3ad89'));
  handle.position.set(.93, 1.88, -1.64);
  scene.add(handle);
  box(-1.2, 1.77, -.78, .41, .075, .55, '#6a7c61');
  box(-1.2, 1.78, -.49, .34, .028, .015, '#e1d6b8');
  // Upholstered chair.
  cylinder(.05, .4, .65, .36, .065, '#685e48');
  box(.05, .7, .65, .1, .58, .1, '#6b654e');
  box(.05, 1.01, .65, .85, .18, .84, '#7d8968');
  box(.05, 1.4, 1.02, .85, .78, .13, '#859171');
  for (const x of [-.36, .46]) box(x, 1.09, .64, .06, .35, .06, '#6e7759');

  const pinboard = group('work');
  box(3.2, 3.13, -3.3, 2.55, 1.92, .17, '#9c7951', pinboard);
  box(3.2, 3.13, -3.19, 2.33, 1.7, .06, '#b7986f', pinboard);
  const badgeColors = ['#456750', '#977649', '#637c86', '#82718a', '#5b8173'];
  const initials = ['GH', 'TH', 'CS', 'UCL', 'N'];
  for (let i = 0; i < 5; i++) {
    const x = 2.3 + (i % 3) * .76, y = i < 3 ? 3.46 : 2.73;
    sphere(x, y + .22, -3.13, .03, .03, .03, '#a4523a', pinboard);
    for (const dx of [-.065, .065]) box(x + dx, y + .025, -3.13, .025, .35, .02, badgeColors[i], pinboard);
    box(x, y - .22, -3.1, .43, .51, .035, '#f2ead3', pinboard);
    box(x, y - .08, -3.075, .43, .09, .015, badgeColors[i], pinboard);
    label(`${initials[i]}\nJUSTIN WONG\n||| || |||`, x, y - .25, -3.074, .35, .29, { size: 42, foreground: badgeColors[i] }, pinboard);
  }
  label('GOOD WORK.\nGOOD PEOPLE.', 4.05, 2.64, -3.1, .4, .4, { background: '#dfcf94', size: 40 }, pinboard);
  box(.05, 3.65, -3.3, 1.5, 1.2, .15, '#ebe0c4');
  box(.05, 3.65, -3.2, 1.28, .97, .025, '#879574');
  const sun = new THREE.Mesh(new THREE.CircleGeometry(.27, 40), material('#d0c599'));
  sun.position.set(.05, 3.7, -3.17);
  scene.add(sun);
  box(.05, 3.25, -3.16, 1.16, .19, .04, '#687d61');
  // Plant in a terracotta pot and a floor stack of books.
  cylinder(3.61, .38, -1.13, .34, .67, '#b58a65', scene, .43);
  cylinder(3.61, .72, -1.13, .39, .025, '#665c42');
  for (let i = 0; i < 8; i++) {
    const a = i * 2.4, x = 3.61 + Math.cos(a) * .28, z = -1.13 + Math.sin(a) * .28, h = .7 + (i % 3) * .22;
    box(x, .72 + h / 2, z, .025, h, .025, '#6b7b52');
    const leaf = sphere(x, .75 + h, z, .18, .34, .08, i % 2 ? '#71895a' : '#89996a');
    leaf.rotation.z = Math.cos(a) * .7;
  }
  box(3.2, .17, 2.1, 1, .15, .67, '#9a6e53');
  box(3.2, .29, 2.1, .89, .09, .6, '#d9ceb0');
  box(3.22, .38, 2.08, .94, .08, .64, '#697d69');

  const anchors = {
    projects: new THREE.Vector3(-3.8, 2.2, -1.7),
    cv: new THREE.Vector3(-.1, 2.4, -1.1),
    work: new THREE.Vector3(3.25, 3.2, -3.1),
  };
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let offset = 0, frame = 0, lost = false;
  function draw() {
    frame = 0;
    if (lost) return;
    const { width, height } = canvas.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    const aspect = width / height;
    const worldWidth = aspect < 1.2 ? 13.5 : 19;
    camera.left = -worldWidth / 2;
    camera.right = worldWidth / 2;
    camera.top = worldWidth / aspect / 2;
    camera.bottom = -camera.top;
    camera.position.set(9 + offset * .25, 9, 13);
    camera.lookAt(aspect < 1.2 ? new THREE.Vector3(0, 1.6, 0) : new THREE.Vector3(-1.3, 1.9, 0));
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    renderer.render(scene, camera);
    for (const element of targets.children) {
      const point = anchors[element.dataset.anchor].clone().project(camera);
      element.style.left = `${(point.x + 1) * 50}%`;
      element.style.top = `${(1 - point.y) * 50}%`;
    }
  }
  function schedule() { if (!frame) frame = requestAnimationFrame(draw); }
  function pick(event) {
    const rect = canvas.getBoundingClientRect();
    pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    // Include walls and furniture so objects cannot be clicked through occluders.
    const hit = raycaster.intersectObjects(scene.children, true)[0];
    let node = hit?.object;
    while (node && !node.userData.destination) node = node.parent;
    return node?.userData.destination;
  }
  let down;
  canvas.addEventListener('pointerdown', event => { down = { x: event.clientX, y: event.clientY }; });
  canvas.addEventListener('pointercancel', () => { down = undefined; });
  canvas.addEventListener('pointerup', event => {
    if (!down) return;
    const distance = Math.hypot(event.clientX - down.x, event.clientY - down.y);
    down = undefined;
    if (distance > 12) return;
    const id = pick(event);
    if (id) onSelect(id);
  });
  canvas.addEventListener('pointermove', event => {
    if (event.pointerType !== 'mouse') return;
    canvas.style.cursor = pick(event) ? 'pointer' : '';
    if (reduced.matches) return;
    offset = (event.clientX - canvas.getBoundingClientRect().left) / canvas.clientWidth - .5;
    schedule();
  });
  canvas.addEventListener('pointerleave', () => { down = undefined; offset = 0; schedule(); });
  reduced.addEventListener('change', () => { offset = 0; schedule(); });
  window.addEventListener('resize', schedule);
  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault();
    lost = true;
    onError(new Error('WebGL context was lost.'));
  });
  canvas.addEventListener('webglcontextrestored', () => location.reload());
  draw();
  targets.hidden = false;
  onReady();
}
