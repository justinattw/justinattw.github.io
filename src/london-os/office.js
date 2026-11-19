import * as THREE from 'three';
import { createPhysicalObjects } from '../physical-objects.js';
import { createHobbyCupboard } from '../hobby-cupboard.js';

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
  box(.1, floor + .14, -9.45, 5.7, .04, 4.1, '#aaa9a1');
  box(.1, floor + .165, -9.45, 5.4, .015, 3.8, '#bdbdb5');
  box(.35, floor + .88, -10.15, 2.9, .15, 1.3, ash);
  for (const x of [-.85, 1.55]) for (const z of [-10.65, -9.65]) box(x, floor + .47, z, .1, .8, .1, metal);
  box(.35, floor + 1.47, -10.45, .96, .72, .12, metal);
  box(.35, floor + 1.04, -10.45, .08, .3, .09, metal);
  box(.35, floor + .98, -10.45, .48, .035, .28, metal);
  const display = surface((ctx, w, h) => {
    ctx.fillStyle = '#242b2d'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#ecece4'; ctx.font = '32px monospace';
    ctx.fillText('justin@study', 28, 62);
    ctx.font = '23px monospace'; ctx.fillStyle = '#aebbc1';
    ctx.fillText('$ open resume.pdf', 28, 120);
    ctx.fillText('Software engineer', 28, 170);
  }, 512, 320);
  const screen = object(new THREE.PlaneGeometry(.84, .55), .35, floor + 1.47, -10.382, new THREE.MeshBasicMaterial({ map: display, toneMapped: false }));
  screen.userData.destination = 'cv';
  box(.3, floor + .98, -9.83, .84, .045, .28, chalk);
  box(.98, floor + .98, -9.86, .16, .04, .23, metal);
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
  box(2.42, floor + 1.75, -9.87, 1.25, 1.18, .07, ash);
  for (const x of [1.93, 2.9]) box(x, floor + .65, -9.9, .06, 1.3, .07, metal);

  const shelf = new THREE.Group(), pinboard = new THREE.Group();
  shelf.scale.setScalar(.45); shelf.position.set(-1.08, floor + .17, -10.1);
  pinboard.scale.setScalar(.45); pinboard.position.set(1.02, floor + .4, -8.3);
  root.add(shelf, pinboard);
  const physical = createPhysicalObjects({
    box, surface, brass: '#b7b7ab', shelf, readingShelf: shelf, pinboard,
    ...data, schedule,
  });
  const cupboard = new THREE.Group();
  root.add(cupboard);
  const hobbies = createHobbyCupboard({ root: cupboard, box, sphere, cylinder, surface, walnut: ash, brass: '#b7b7ab' });
  cupboard.position.set(2.55, floor + .1, -7.65);
  cupboard.scale.setScalar(.43);
  cupboard.traverse(child => {
    if (child.material?.color && !child.material.map) {
      const hsl = child.material.color.getHSL({});
      child.material.color.setHSL(hsl.h, Math.min(hsl.s, .08), hsl.l);
    }
  });
  const points = {
    cv: new THREE.Vector3(.35, floor + 1.47, -10.35),
    projects: new THREE.Vector3(-2.5, floor + .6, -11.2),
    reading: new THREE.Vector3(-2.5, floor + 1.88, -11.2),
    work: new THREE.Vector3(2.4, floor + 1.78, -9.65),
    hobbies: new THREE.Vector3(2.55, floor + 1.25, -7.4),
  };
  root.updateMatrixWorld(true);
  const anchors = Object.fromEntries(Object.entries(points).map(([id, p]) => [id, root.localToWorld(p)]));
  return { anchors, physical, hobbies };
}
