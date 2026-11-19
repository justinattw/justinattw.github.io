import * as THREE from 'three';
import { createPhysicalObjects } from '../physical-objects.js';
import { createHobbyCupboard } from '../hobby-cupboard.js';
import { createCat } from '../cat.js';
import { createWindowPlants } from '../window-plants.js';

export function buildOffice(root, floor, data, schedule) {
  const cube = new THREE.BoxGeometry(), materials = new Map();
  function material(color) {
    if (color instanceof THREE.Material) return color;
    if (!materials.has(color)) materials.set(color, new THREE.MeshStandardMaterial({ color, roughness: .8 }));
    return materials.get(color);
  }
  function object(geometry, x, y, z, color, parent = root) {
    const mesh = new THREE.Mesh(geometry, material(color));
    mesh.position.set(x, y, z);
    mesh.castShadow = mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
  function box(x, y, z, w, h, d, color, parent) {
    const mesh = object(cube, x, y, z, color, parent);
    mesh.scale.set(w, h, d);
    return mesh;
  }
  function sphere(x, y, z, sx, sy, sz, color, parent) {
    const mesh = object(new THREE.SphereGeometry(1, 12, 8), x, y, z, color, parent);
    mesh.scale.set(sx, sy, sz);
    return mesh;
  }
  function cylinder(x, y, z, radius, height, color, parent, top = radius, segments = 16) {
    return object(new THREE.CylinderGeometry(top, radius, height, segments), x, y, z, color, parent);
  }
  function surface(draw, width = 512, height = 512) {
    const ratio = Math.min(1, 1024 / Math.max(width, height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Office texture rendering is unavailable.');
    context.scale(ratio, ratio);
    draw(context, width, height);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    return texture;
  }
  const ash = '#aaa59b', metal = '#353c3e', chalk = '#e0e0d9';
  box(.1, floor + .14, -9.45, 4.2, .04, 2.9, '#aaa9a1').name = 'Study rug';
  box(.1, floor + .165, -9.45, 4, .015, 2.7, '#bdbdb5');
  box(.35, floor + .88, -10.15, 2.9, .15, 1.3, ash);
  for (const x of [-.85, 1.55]) for (const z of [-10.65, -9.65]) box(x, floor + .47, z, .1, .8, .1, metal);
  const laptop = new THREE.Group();
  laptop.name = 'Study MacBook';
  laptop.position.set(.35, floor + .965, -10.05);
  root.add(laptop);
  const aluminium = '#bfc6c9', bezel = '#202629';
  const base = box(0, 0, 0, .92, .018, .69, aluminium, laptop);
  base.name = 'MacBook aluminium base';
  base.userData.destination = 'cv';
  box(0, .01, -.015, .8, .003, .49, '#15191b', laptop).name = 'MacBook keyboard inset';
  const lid = new THREE.Group();
  lid.name = 'MacBook lid';
  lid.position.set(0, .011, -.32);
  lid.rotation.x = -.16;
  laptop.add(lid);
  box(0, .30, 0, .87, .58, .012, bezel, lid).name = 'MacBook slim lid';
  const display = surface((ctx, w, h) => {
    ctx.fillStyle = '#242b2d'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#ecece4'; ctx.font = '32px monospace';
    ctx.fillText('\\ for commands', 28, 62);
    ctx.font = '23px monospace'; ctx.fillStyle = '#aebbc1';
    ctx.fillText('justinattw$ _', 28, 270);
  }, 512, 320);
  const screen = object(new THREE.PlaneGeometry(.84, .55), 0, .30, .008, new THREE.MeshBasicMaterial({ map: display, toneMapped: false }), lid);
  screen.name = 'Study computer display';
  screen.userData.destination = 'cv';
  cylinder(1.37, floor + 1, -10.32, .14, .04, metal);
  cylinder(1.37, floor + 1.3, -10.32, .025, .58, metal);
  cylinder(1.37, floor + 1.65, -10.32, .22, .18, chalk, root, .14);
  cylinder(-.7, floor + 1.03, -10.15, .09, .2, chalk);
  box(.35, floor + .54, -8.97, .77, .12, .7, metal);
  box(.35, floor + .89, -8.63, .77, .7, .09, metal);
  cylinder(.35, floor + .28, -8.97, .05, .45, metal);
  cylinder(.35, floor + .12, -8.97, .4, .05, metal);

  for (const x of [-3.08, -1.92]) box(x, floor + 1.18, -11.48, .07, 2.18, .52, ash);
  box(-2.5, floor + 1.18, -11.75, 1.2, 2.18, .045, '#676d6c');
  for (const y of [.15, .91, 1.42, 2.28]) box(-2.5, floor + y, -11.48, 1.25, .065, .57, ash);
  const board = new THREE.Group();
  board.name = 'Work history pinboard';
  board.position.set(2.72, floor + 1.45, -12.22);
  board.scale.setScalar(.72);
  root.add(board);
  box(0, 0, -.08, 1.55, 2, .08, '#aa8967', board);
  for (const x of [-.8, .8]) box(x, 0, -.02, .05, 2.08, .08, ash, board);
  for (const y of [-1.025, 1.025]) box(0, y, -.02, 1.65, .05, .08, ash, board);

  const shelf = new THREE.Group(), pinboard = new THREE.Group();
  shelf.scale.setScalar(.45); shelf.position.set(-1.08, floor + .17, -10.1);
  pinboard.scale.setScalar(.75);
  root.add(shelf);
  board.add(pinboard);
  const physical = createPhysicalObjects({
    box, surface, brass: '#b7b7ab', shelf, readingShelf: shelf, pinboard,
    ...data, schedule,
  });
  const lanyardColors = ['#496c65', '#bd8d49', '#608f9f', '#9775a8', '#788f5a'];
  for (const item of physical.items.filter(item => item.kind === 'job')) {
    const upper = item.index < 3;
    const x = upper ? (item.index - 1) * .65 : (item.index - 3.5) * .65;
    item.root.position.set(x, upper ? .2 : -.9, .04);
    item.home.copy(item.root.position);
    item.stage.set(0, 0, 3.8);
    const strap = new THREE.Group();
    strap.name = `lanyard-${item.index}`;
    strap.position.copy(item.home);
    pinboard.add(strap);
    for (const side of [-1, 1]) {
      const ribbon = box(side * .075, .61, -.015, .035, .56, .016, lanyardColors[item.index], strap);
      ribbon.rotation.z = side * -.22;
    }
    box(0, .345, .015, .06, .09, .025, '#c2c7c4', strap);
    sphere(0, .88, -.01, .025, .025, .025, metal, strap);
    item.root.name = `work-history-pass-${item.index}`;
  }
  const cupboard = new THREE.Group();
  cupboard.name = 'Interests cabinet';
  root.add(cupboard);
  const hobbies = createHobbyCupboard({ root: cupboard, box, sphere, cylinder, surface, walnut: ash, brass: '#b7b7ab' });
  cupboard.position.set(3.31, floor + .1, -8.05);
  cupboard.rotation.y = -Math.PI / 2;
  cupboard.scale.setScalar(.43);
  cupboard.traverse(child => {
    if (child.material?.color && !child.material.map) {
      const hsl = child.material.color.getHSL({});
      child.material.color.setHSL(hsl.h, Math.min(hsl.s, .08), hsl.l);
    }
  });
  const plantsRoot = new THREE.Group();
  plantsRoot.name = 'Study plants';
  plantsRoot.position.y = floor + .13;
  root.add(plantsRoot);
  const plants = createWindowPlants({ scene: plantsRoot, cylinder, material, includeBanana: false });
  plants.monstera.name = 'Monstera';
  plants.monstera.position.set(-2.6, 0, -7.3);
  plants.monstera.scale.setScalar(.85);
  plants.bamboo.name = 'Bamboo';
  plants.bamboo.position.set(1.7, 0, -11.7);
  plants.bamboo.scale.set(.7, .8, .7);

  const catRoot = new THREE.Group();
  catRoot.name = 'Study cat routine';
  catRoot.position.y = floor + .13;
  root.add(catRoot);
  const cat = createCat({
    scene: catRoot, sphere, material, pawColor: '#202325', start: [-1.6, .03, -8.25],
    route: [
      { action: 'groom', duration: 3 },
      { action: 'walk', duration: 2, to: [-2.05, .03, -7.05] },
      { action: 'drink-water', duration: 4, facing: 0 },
      { action: 'walk', duration: 2, to: [-2.05, .03, -7.8] },
      { action: 'walk', duration: 3, to: [1.15, .03, -8.97] },
      { action: 'jump-chair', duration: 1.3, to: [.35, .42, -8.97], clearance: .12 },
      { action: 'sit', duration: 2 },
      { action: 'jump-desk', duration: 1.3, to: [.95, .8, -9.8], clearance: .14 },
      { action: 'play-keyboard', duration: 3, facing: Math.PI },
      { action: 'walk-desk', duration: 1, to: [.95, .8, -9.6] },
      { action: 'jump-chair', duration: 1.3, to: [.35, .42, -8.97], clearance: .12 },
      { action: 'jump-down', duration: 1.3, to: [1.15, .03, -8.97], clearance: .12 },
      { action: 'walk', duration: 1.5, to: [1.15, .03, -8] },
      { action: 'walk', duration: 4, to: [-2.15, .03, -7.65] },
      { action: 'play-plant', duration: 4, facing: Math.atan2(-.35, -.45) },
      { action: 'walk', duration: 2, to: [-1.6, .03, -8.25] },
    ],
  });
  cat.root.name = 'Black study cat';
  const bowl = new THREE.Group();
  bowl.name = 'Cat water bowl';
  root.add(bowl);
  cylinder(-1.6, floor + .23, -7.05, .1, .26, ash, bowl);
  cylinder(-1.6, floor + .37, -7.05, .18, .1, chalk, bowl, .20);
  cylinder(-1.6, floor + .423, -7.05, .17, .006, '#7dabb9', bowl);
  const points = {
    projects: new THREE.Vector3(-2.5, floor + .48, -11.2),
    reading: new THREE.Vector3(-2.5, floor + 1.55, -11.2),
    work: new THREE.Vector3(2.72, floor + 1.45, -12.05),
  };
  root.updateMatrixWorld(true);
  const anchors = Object.fromEntries(Object.entries(points).map(([id, p]) => [id, root.localToWorld(p)]));
  anchors.cv = screen.getWorldPosition(new THREE.Vector3());
  anchors.hobbies = cupboard.localToWorld(new THREE.Vector3(0, 2.7, .65));
  return {
    anchors, physical, hobbies, cat, monitor: screen,
    updateRoom(delta, time, view, reduced) {
      const visible = view === 'city' || view === 'office';
      plantsRoot.visible = catRoot.visible = visible;
      const moving = view === 'office' && !reduced;
      cat.update(moving ? delta : 0);
      if (visible) plants.update(time, moving && cat.root.userData.action === 'play-plant');
      return moving;
    },
  };
}
