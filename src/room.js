import * as THREE from 'three';

export function createRoom({ canvas, targets, onSelect, onReady, onError }) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#161d19');
  scene.fog = new THREE.FogExp2('#161d19', .012);
  const camera = new THREE.PerspectiveCamera(48, 1, .1, 100);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.55;
  scene.add(new THREE.AmbientLight('#e7cda5', .85));
  scene.add(new THREE.HemisphereLight('#a9c5ca', '#4b3020', 1.2));
  const sunlight = new THREE.DirectionalLight('#ffe0a6', 3.2);
  sunlight.position.set(-5, 9, 1);
  sunlight.castShadow = true;
  sunlight.shadow.mapSize.set(2048, 2048);
  Object.assign(sunlight.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10, near: .1, far: 35 });
  sunlight.shadow.normalBias = .025;
  sunlight.shadow.bias = -.0001;
  sunlight.shadow.radius = 5;
  scene.add(sunlight);

  const materials = new Map();
  const cube = new THREE.BoxGeometry(1, 1, 1);
  function material(color) {
    if (color instanceof THREE.Material) return color;
    if (!materials.has(color)) materials.set(color, new THREE.MeshStandardMaterial({ color, roughness: .75 }));
    return materials.get(color);
  }
  function box(x, y, z, w, h, d, color, parent = scene) {
    const mesh = new THREE.Mesh(cube, material(color));
    mesh.position.set(x, y, z);
    mesh.scale.set(w, h, d);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
  function cylinder(x, y, z, r, h, color, parent = scene, top = r, segments = 20) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(top, r, h, segments), material(color));
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
  function sphere(x, y, z, sx, sy, sz, color, parent = scene) {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), material(color));
    mesh.position.set(x, y, z);
    mesh.scale.set(sx, sy, sz);
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  }
  function destination(id) {
    const result = new THREE.Group();
    result.userData.destination = id;
    scene.add(result);
    return result;
  }
  function surface(draw, width = 512, height = 512) {
    const element = document.createElement('canvas');
    element.width = width;
    element.height = height;
    const context = element.getContext('2d');
    if (!context) throw new Error('Canvas texture rendering is unavailable.');
    draw(context, width, height);
    const texture = new THREE.CanvasTexture(element);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 4);
    return texture;
  }
  function label(text, x, y, z, w, h, options = {}, parent = scene) {
    const { background = '#e8d9ad', foreground = '#405143', size = 36 } = options;
    const texture = surface((ctx, width, height) => {
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = foreground;
      ctx.font = `${size}px monospace`;
      ctx.textBaseline = 'middle';
      text.split('\n').forEach((line, i, lines) => ctx.fillText(line, 30, height / 2 + (i - (lines.length - 1) / 2) * size * 1.5));
      if (options.scanlines) {
        ctx.fillStyle = '#00000028';
        for (let y = 0; y < height; y += 4) ctx.fillRect(0, y, width, 1);
      }
    }, 512, 256);
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: texture }));
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  }

  let seed = 17;
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const grain = surface((ctx, w, h) => {
    ctx.fillStyle = '#715039';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 700; i++) {
      ctx.strokeStyle = `rgba(${random() > .5 ? '30,16,8' : '210,167,108'},${.03 + random() * .14})`;
      const y = random() * h;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(w * .3, y + random() * 9, w * .6, y - random() * 9, w, y + random() * 5);
      ctx.stroke();
    }
  });
  const walnut = new THREE.MeshStandardMaterial({ map: grain, color: '#ad8762', roughness: .48, bumpMap: grain, bumpScale: .025 });
  const brass = new THREE.MeshStandardMaterial({ color: '#b88e48', metalness: .72, roughness: .36 });
  const leather = new THREE.MeshStandardMaterial({ color: '#233e30', roughness: .55 });
  const wallpaper = surface((ctx, w, h) => {
    ctx.fillStyle = '#294438';
    ctx.fillRect(0, 0, w, h);
    for (let row = 0; row < 4; row++) for (let col = 0; col < 4; col++) {
      const x = col * 128 + (row % 2) * 64, y = row * 128;
      ctx.strokeStyle = '#a18e5842';
      ctx.lineWidth = 2;
      for (const sign of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(x, y + 112);
        ctx.bezierCurveTo(x + sign * 72, y + 80, x + sign * 50, y + 24, x, y + 15);
        ctx.bezierCurveTo(x + sign * 5, y + 55, x + sign * 34, y + 70, x, y + 112);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.ellipse(x, y + 55, 7, 17, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  });
  wallpaper.wrapS = wallpaper.wrapT = THREE.RepeatWrapping;
  wallpaper.repeat.set(7, 3);
  const wallMaterial = new THREE.MeshStandardMaterial({ map: wallpaper, roughness: .95 });

  // The viewer is inside the room, facing the desk rather than an open dollhouse.
  box(0, -.12, 6, 14, .24, 21, walnut);
  const floorboards = ['#9e7f5a', '#b08b60', '#967750'].map(color => new THREE.MeshStandardMaterial({ color, map: grain, roughness: .62, bumpMap: grain, bumpScale: .018 }));
  for (let row = 0; row < 22; row++) for (let col = 0; col < 10; col++) {
    box(-6.3 + col * 1.4, .005, -3.55 + row * .92, 1.38, .025, .9, floorboards[(row + col) % 3]);
  }
  box(0, 4, -4.1, 14, 8, .2, wallMaterial);
  box(-7, 4, 5, .2, 8, 18, '#243e32');
  box(7, 4, 5, .2, 8, 18, '#243e32');
  box(0, 8, 4, 14, .2, 18, '#343b2e');
  for (let z = -3; z < 14; z += 3) box(0, 7.83, z, 14, .18, .16, walnut);
  for (const x of [-4.5, 0, 4.5]) box(x, 7.82, 5, .17, .2, 18, walnut);
  box(0, 1, -3.94, 14, 2, .18, walnut);
  for (let i = 0; i < 14; i++) {
    const x = -6.5 + i;
    box(x, 1, -3.82, .76, 1.48, .055, '#29392c');
    for (const dx of [-.42, .42]) box(x + dx, 1, -3.76, .045, 1.65, .04, brass);
    for (const y of [.18, 1.82]) box(x, y, -3.76, .88, .04, .04, brass);
  }
  for (const [y, h, depth] of [[.13, .22, .2], [1.95, .09, .26], [2.05, .06, .3], [7.6, .08, .3], [7.7, .14, .42], [7.85, .12, .55]]) {
    box(0, y, -3.8, 14, h, depth, y > 7 ? '#b49a67' : walnut);
    for (const x of [-6.85, 6.85]) box(x, y, 4, depth, h, 16, y > 7 ? '#b49a67' : walnut);
  }
  for (let i = 0; i < 45; i++) box(-6.85 + i * .31, 7.59, -3.6, .12, .13, .12, '#a78b59');

  function archedWindow(x) {
    const width = 1.85, base = 2.15, shoulder = 5.85, radius = width / 2;
    const shape = new THREE.Shape();
    shape.moveTo(-radius, base);
    shape.lineTo(radius, base);
    shape.lineTo(radius, shoulder);
    shape.absarc(0, shoulder, radius, 0, Math.PI, false);
    shape.lineTo(-radius, base);
    const sky = surface((ctx, w, h) => {
      const gradient = ctx.createLinearGradient(0, 0, 0, h);
      gradient.addColorStop(0, '#9eb6b7');
      gradient.addColorStop(.65, '#e9d8ae');
      gradient.addColorStop(1, '#a6b0a1');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#617f7280';
      for (let i = 0; i < 20; i++) {
        const tx = random() * w;
        ctx.beginPath();
        ctx.ellipse(tx, h * (.82 + random() * .15), 20 + random() * 40, 100 + random() * 100, -.15, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    const glass = new THREE.Mesh(new THREE.ShapeGeometry(shape), new THREE.MeshBasicMaterial({ map: sky, color: '#d9d9b7' }));
    glass.position.set(x, 0, -3.72);
    // Shape UVs are world-sized; normalize to the generated outdoor view.
    const uv = glass.geometry.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) + radius) / width, (uv.getY(i) - base) / (shoulder + radius - base));
    scene.add(glass);
    for (const dx of [-radius - .08, radius + .08]) {
      box(x + dx, (base + shoulder) / 2, -3.57, .16, shoulder - base, .2, '#c2aa7c');
      box(x + dx * 1.12, (base + shoulder) / 2, -3.6, .055, shoulder - base, .26, brass);
    }
    const arch = new THREE.Mesh(new THREE.TorusGeometry(radius + .08, .09, 8, 40, Math.PI), material('#c2aa7c'));
    arch.position.set(x, shoulder, -3.57);
    scene.add(arch);
    box(x, 4.25, -3.51, .065, 4.2, .09, '#bda77c');
    for (const y of [3.5, 4.8, 5.85]) box(x, y, -3.51, width, .055, .09, '#bda77c');
    box(x, base, -3.43, width + .48, .16, .6, walnut);
    cylinder(x, 6.96, -3.37, .045, width + 1.1, brass).rotation.z = Math.PI / 2;
    for (const side of [-1, 1]) {
      for (let fold = 0; fold < 5; fold++) {
        const curtain = cylinder(x + side * (radius + .16 + fold * .055), 4.45, -3.34 + (fold % 2) * .06, .11, 4.65, fold % 2 ? '#553b33' : '#65493b', scene, .1);
        curtain.scale.z = .65;
      }
      sphere(x + side * (radius + .22), 3.7, -3.17, .14, .045, .12, brass);
    }
  }
  archedWindow(-5);
  archedWindow(5);

  // Persian-style rug with nested borders and a central medallion.
  box(0, .04, .9, 6.8, .035, 5.2, '#593e32');
  for (const [w, d, color] of [[6.5, 4.9, '#b29765'], [6.25, 4.65, '#324838'], [5.9, 4.3, '#9b8053'], [5.65, 4.05, '#5d3b31']]) {
    box(0, .065 + (6.8 - w) * .015, .9, w, .012, d, color);
  }
  for (let i = 0; i < 24; i++) {
    for (const z of [-1.33, 3.13]) {
      const motif = box(-2.87 + i * .25, .1, z, .1, .012, .1, '#c1a779');
      motif.rotation.y = Math.PI / 4;
    }
  }
  const medallion = cylinder(0, .106, .9, 1.1, .015, '#ad8d58', scene, 1.1, 8);
  medallion.scale.z = 1.3;
  const innerMedallion = cylinder(0, .12, .9, .88, .015, '#294237', scene, .88, 8);
  innerMedallion.scale.z = 1.3;

  const shelf = destination('projects');
  box(-3.15, 2.05, -3.35, 2.05, 4.1, .72, walnut, shelf);
  box(-3.15, 2.05, -2.96, 1.8, 3.8, .04, '#30231b', shelf);
  for (const x of [-4.18, -2.12]) {
    box(x, 2, -2.9, .16, 4, .9, walnut, shelf);
    box(x, 2.1, -2.41, .06, 3.5, .05, brass, shelf);
  }
  for (const y of [.2, 1.15, 2.1, 3.05, 4.03]) box(-3.15, y, -2.92, 2.12, .12, .98, walnut, shelf);
  for (const [y, w] of [[4.13, 2.24], [4.23, 2.36], [4.3, 2.2]]) box(-3.15, y, -2.92, w, .09, 1, walnut, shelf);
  const books = ['#60453d', '#67704d', '#ab9569', '#344d43', '#716a56', '#393b39'];
  for (const row of [0, 2, 3]) for (let i = 0; i < 8; i++) {
    const h = .48 + random() * .26, x = -3.92 + i * .22, y = .28 + row * .96;
    box(x, y + h / 2, -2.8, .16, h, .42, books[(i + row) % books.length], shelf);
    for (const band of [.15, .75]) box(x, y + h * band, -2.58, .12, .018, .013, brass, shelf);
  }
  box(-3.64, 1.43, -2.78, .6, .4, .5, '#b4ad94', shelf);
  label('>_ runtime', -3.64, 1.45, -2.518, .47, .23, { background: '#142c26', foreground: '#b0c58e', size: 48 }, shelf);
  box(-2.75, 1.55, -2.78, .57, .7, .035, '#e2d3ac', shelf);
  label('MOMENTUM\nFIELD NOTES\n________', -2.75, 1.55, -2.755, .51, .64, { size: 40 }, shelf);

  // Carved writing desk, inset leather top, turned legs and drawer pulls.
  box(0, 1.64, -1.85, 3.9, .18, 1.8, walnut);
  box(0, 1.75, -1.85, 4.06, .07, 1.9, walnut);
  box(0, 1.795, -1.85, 2.9, .025, 1.45, leather);
  for (const z of [-2.57, -1.13]) box(0, 1.815, z, 2.94, .012, .022, brass);
  for (const x of [-1.47, 1.47]) box(x, 1.815, -1.85, .022, .012, 1.45, brass);
  for (const x of [-1.7, 1.7]) for (const z of [-2.55, -1.2]) {
    cylinder(x, .8, z, .105, 1.5, walnut, scene, .13);
    for (const y of [.18, .4, 1.2, 1.46]) sphere(x, y, z, .14, .08, .14, walnut);
  }
  box(0, 1.42, -1.07, 3.7, .32, .12, walnut);
  for (const x of [-1.1, 0, 1.1]) {
    box(x, 1.42, -.995, 1.02, .25, .045, walnut);
    sphere(x, 1.42, -.948, .06, .025, .025, brass);
  }
  const computer = destination('cv');
  box(0, 1.9, -2.02, .78, .13, .55, '#b9b49b', computer);
  box(0, 2.09, -2.1, .19, .3, .22, '#c3bda1', computer);
  box(0, 2.59, -2.05, 1.55, 1.12, .81, '#cec6aa', computer);
  box(0, 2.62, -1.626, 1.3, .84, .07, '#727d68', computer);
  label('JUSTIN WONG\nSOFTWARE ENGINEER\n\n> read cv.txt _', 0, 2.65, -1.583, 1.16, .7, { background: '#102d24', foreground: '#b5cda0', size: 30, scanlines: true }, computer);
  const screenLight = new THREE.PointLight('#9dce99', .35, 2);
  screenLight.position.set(0, 2.6, -1.3);
  scene.add(screenLight);
  sphere(.54, 2.13, -1.61, .02, .02, .015, '#b3c185', computer);
  box(-.12, 1.87, -1.32, 1.43, .09, .4, '#c1bba1', computer);
  for (let row = 0; row < 3; row++) for (let col = 0; col < 13; col++) box(-.73 + col * .1, 1.93, -1.45 + row * .105, .078, .025, .075, '#9c9e86', computer);
  sphere(.93, 1.87, -1.32, .09, .065, .14, '#c7bea0', computer);
  cylinder(-1.35, 1.87, -2.25, .25, .08, brass);
  cylinder(-1.35, 2.25, -2.25, .035, .75, brass);
  cylinder(-1.35, 2.65, -2.25, .28, .32, '#30563c', scene, .14);
  cylinder(-1.35, 2.48, -2.25, .25, .012, '#d7bc7c');
  const deskLight = new THREE.PointLight('#ffd18c', 1.5, 4, 2);
  deskLight.position.set(-1.35, 2.4, -2.25);
  scene.add(deskLight);
  box(1.47, 1.87, -2.22, .37, .09, .53, '#493b2c');
  cylinder(1.4, 2.03, -1.71, .1, .32, '#c5b68f');
  cylinder(1.4, 2.2, -1.71, .08, .015, '#37241b');
  // A low leather chair leaves the computer screen in full view.
  box(0, .95, .1, 1, .2, .95, leather);
  box(0, 1.28, .54, 1, .7, .14, leather);
  for (const x of [-.42, .42]) for (const z of [-.23, .42]) cylinder(x, .49, z, .045, .9, walnut);
  for (let i = 0; i < 5; i++) sphere(-.35 + i * .175, 1.39, .625, .018, .018, .015, brass);

  const pinboard = destination('work');
  pinboard.position.x = -.35;
  box(3.12, 3.03, -3.67, 2.12, 1.85, .15, walnut, pinboard);
  box(3.12, 3.03, -3.57, 1.96, 1.69, .04, '#806340', pinboard);
  for (const x of [2.1, 4.14]) box(x, 3.03, -3.5, .04, 1.85, .04, brass, pinboard);
  for (const y of [2.13, 3.93]) box(3.12, y, -3.5, 2.08, .04, .04, brass, pinboard);
  const badges = ['#395347', '#80693e', '#506b72', '#6e5c70', '#557765'];
  for (let i = 0; i < 5; i++) {
    const x = 2.49 + (i % 3) * .63, y = i < 3 ? 3.53 : 2.8;
    sphere(x, y + .17, -3.49, .028, .028, .025, brass, pinboard);
    for (const dx of [-.055, .055]) box(x + dx, y, -3.48, .025, .3, .018, badges[i], pinboard);
    box(x, y - .26, -3.44, .42, .52, .035, '#e7dcc1', pinboard);
    box(x, y - .08, -3.413, .42, .075, .015, badges[i], pinboard);
    label(`${['GITHUB', 'TRADINGHUB', 'CORESTREAM', 'UCL', 'NUVEEN'][i]}\nJUSTIN WONG\n||| || |||`, x, y - .29, -3.413, .36, .3, { size: 35, foreground: badges[i] }, pinboard);
  }
  // Gilt picture frame and a small pendulum clock above the desk.
  box(0, 4.7, -3.69, 1.9, 1.45, .12, walnut);
  box(0, 4.7, -3.6, 1.78, 1.33, .06, brass);
  label('THE STUDY\nEST. IN CURIOSITY', 0, 4.7, -3.55, 1.62, 1.17, { background: '#263c30', foreground: '#bca77b', size: 30 });
  cylinder(0, 5.9, -3.6, .32, .1, brass).rotation.x = Math.PI / 2;
  const clockFace = new THREE.Mesh(new THREE.CircleGeometry(.27, 40), material('#d2c19b'));
  clockFace.position.set(0, 5.9, -3.53);
  scene.add(clockFace);
  box(0, 6, -3.51, .018, .2, .015, '#403b2d');
  const hand = box(.065, 5.9, -3.5, .15, .018, .015, '#403b2d');
  hand.rotation.z = .4;
  // Chandelier, with warm glass shades and a ceiling rose.
  cylinder(0, 7.86, .8, .5, .08, '#b6a57a', scene, .5, 32);
  cylinder(0, 6.9, .8, .035, 1.8, brass);
  sphere(0, 6.03, .8, .16, .2, .16, brass);
  for (let i = 0; i < 5; i++) {
    const a = i / 5 * Math.PI * 2, x = Math.cos(a) * .75, z = .8 + Math.sin(a) * .75;
    const arm = box(x / 2, 6.03, .8 + (z - .8) / 2, .75, .035, .035, brass);
    arm.rotation.y = -a;
    cylinder(x, 6.16, z, .12, .24, brass, scene, .08);
    sphere(x, 6.42, z, .19, .22, .19, '#dfc99e');
  }
  const chandelierLight = new THREE.PointLight('#ffdb9a', 8, 15, 2);
  chandelierLight.position.set(0, 6.2, .8);
  scene.add(chandelierLight);
  // Fern and a brass globe finish the corners without competing with navigation.
  cylinder(5, .43, -.2, .4, .8, '#786147', scene, .52);
  for (let i = 0; i < 12; i++) {
    const angle = i * 2.4, r = .3 + random() * .3, h = 1 + random() * .7;
    const leaf = sphere(5 + Math.cos(angle) * r, .8 + h * .65, -.2 + Math.sin(angle) * r, .12, h * .5, .06, i % 2 ? '#405a37' : '#627146');
    leaf.rotation.z = Math.cos(angle) * .6;
  }
  cylinder(-5, .5, -.2, .3, .9, walnut);
  cylinder(-5, .98, -.2, .65, .08, walnut);
  sphere(-5, 1.52, -.2, .4, .4, .4, '#7b8b73');
  const meridian = new THREE.Mesh(new THREE.TorusGeometry(.44, .018, 6, 40), brass);
  meridian.position.set(-5, 1.52, -.2);
  meridian.rotation.z = -.3;
  scene.add(meridian);

  // Batch repeated static geometry without losing each destination's hit region.
  for (const root of [scene, ...scene.children.filter(child => child.isGroup)]) {
    const batches = new Map();
    for (const child of root.children) {
      if (child.geometry !== cube) continue;
      if (!batches.has(child.material)) batches.set(child.material, []);
      batches.get(child.material).push(child);
    }
    for (const [material, meshes] of batches) {
      if (meshes.length < 3) continue;
      const batch = new THREE.InstancedMesh(cube, material, meshes.length);
      meshes.forEach((mesh, index) => {
        mesh.updateMatrix();
        batch.setMatrixAt(index, mesh.matrix);
        root.remove(mesh);
      });
      batch.castShadow = true;
      batch.receiveShadow = true;
      root.add(batch);
    }
  }

  const anchors = {
    projects: new THREE.Vector3(-3.15, 2.3, -2.4),
    cv: new THREE.Vector3(0, 2.64, -1.56),
    work: new THREE.Vector3(2.77, 3.03, -3.4),
  };
  const views = {
    projects: { position: [-3.15, 2.38, 1.25], target: [-3.15, 2.3, -2.85] },
    cv: { position: [0, 2.65, .65], target: [0, 2.6, -1.7] },
    work: { position: [2.77, 3.03, .1], target: [2.77, 3.03, -3.5] },
  };
  const look = new THREE.Vector3(0, 3, -3.5);
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let frame = 0, lost = false, current = null, transition = null;
  function home() {
    return canvas.clientWidth < 650
      ? { position: [0, 3.3, 14], target: [0, 3, -3.5] }
      : { position: [0, 3.1, 8.4], target: [0, 3.3, -3.5] };
  }
  function applyView(view) {
    camera.position.fromArray(view.position);
    look.fromArray(view.target);
  }
  function viewFor(id) {
    const base = id ? views[id] : home();
    const view = { position: [...base.position], target: [...base.target] };
    if (id && canvas.clientWidth < 650) {
      const desiredWidth = { cv: 1.9, work: 2.5, projects: 2.6 }[id];
      const distance = desiredWidth / (2 * Math.tan(THREE.MathUtils.degToRad(24)) * (canvas.clientWidth / canvas.clientHeight));
      view.position[2] = Math.max(view.position[2], view.target[2] + distance);
    }
    return view;
  }
  applyView(home());
  function render(now = performance.now()) {
    frame = 0;
    if (lost) return;
    const { width, height } = canvas.getBoundingClientRect();
    if (!width || !height) return;
    if (canvas.width !== Math.round(width * renderer.getPixelRatio()) || canvas.height !== Math.round(height * renderer.getPixelRatio())) renderer.setSize(width, height, false);
    camera.aspect = width / height;
    if (!transition) camera.fov = width < 650 && !current ? 55 : 48;
    if (transition) {
      const t = Math.min(1, (now - transition.start) / transition.duration);
      const eased = t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      camera.position.lerpVectors(transition.fromPosition, transition.toPosition, eased);
      look.lerpVectors(transition.fromLook, transition.toLook, eased);
      camera.fov = THREE.MathUtils.lerp(transition.fromFov, transition.toFov, eased);
      if (t === 1) {
        const resolve = transition.resolve;
        transition = null;
        if (!current) targets.hidden = false;
        resolve(true);
      }
    }
    camera.lookAt(look);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    renderer.render(scene, camera);
    renderer.shadowMap.autoUpdate = false;
    for (const element of targets.children) {
      const point = anchors[element.dataset.anchor].clone().project(camera);
      element.style.left = `${THREE.MathUtils.clamp((point.x + 1) * 50, 8, 92)}%`;
      element.style.top = `${THREE.MathUtils.clamp((1 - point.y) * 50, 15, 85)}%`;
    }
    canvas.dataset.view = current || 'room';
    canvas.dataset.moving = String(Boolean(transition));
    // Only animate during an intentional camera move; the idle room uses no loop.
    if (transition) schedule();
  }
  function schedule() { if (!frame) frame = requestAnimationFrame(render); }
  function moveTo(id) {
    if (transition) transition.resolve(false);
    current = id;
    const view = viewFor(id);
    targets.hidden = true;
    if (reduced.matches) {
      transition = null;
      applyView(view);
      render();
      targets.hidden = Boolean(id);
      return Promise.resolve(true);
    }
    return new Promise(resolve => {
      transition = {
        start: performance.now(), duration: 1150,
        fromPosition: camera.position.clone(), toPosition: new THREE.Vector3(...view.position),
        fromLook: look.clone(), toLook: new THREE.Vector3(...view.target), resolve,
        fromFov: camera.fov, toFov: canvas.clientWidth < 650 && !id ? 55 : 48,
      };
      schedule();
    });
  }
  function pick(event) {
    const rect = canvas.getBoundingClientRect();
    pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    let node = raycaster.intersectObjects(scene.children, true)[0]?.object;
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
    if (distance > 12 || current) return;
    const id = pick(event);
    if (id) onSelect(id);
  });
  canvas.addEventListener('pointermove', event => {
    if (event.pointerType === 'mouse') canvas.style.cursor = !current && pick(event) ? 'pointer' : '';
  });
  canvas.addEventListener('pointerleave', () => { down = undefined; });
  window.addEventListener('resize', () => {
    const resolve = transition?.resolve;
    transition = null;
    applyView(viewFor(current));
    targets.hidden = Boolean(current);
    resolve?.(true);
    schedule();
  });
  reduced.addEventListener('change', () => {
    if (reduced.matches && transition) {
      const { toPosition, toLook, resolve } = transition;
      camera.position.copy(toPosition);
      look.copy(toLook);
      transition = null;
      render();
      targets.hidden = Boolean(current);
      resolve(true);
    }
  });
  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault();
    lost = true;
    if (transition) { transition.resolve(false); transition = null; }
    onError(new Error('WebGL context was lost.'));
  });
  canvas.addEventListener('webglcontextrestored', () => location.reload());
  render();
  targets.hidden = false;
  onReady();
  return { focus: id => moveTo(id), reset: () => moveTo(null) };
}
