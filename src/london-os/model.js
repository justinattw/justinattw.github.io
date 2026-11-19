import * as THREE from 'three';
import geography from './geography.json';
import { buildGardens } from '../gardens-model.js';

export const project = (easting, northing) => new THREE.Vector3((easting - 528000) / 100, 0, (179250 - northing) / 100);

export function buildLondon(scene) {
  const materialCache = new Map();
  const material = color => {
    if (!materialCache.has(color)) materialCache.set(color, new THREE.MeshStandardMaterial({ color, roughness: .88 }));
    return materialCache.get(color);
  };
  const boxGeometry = new THREE.BoxGeometry();
  function mesh(geometry, color, x, y, z, sx = 1, sy = 1, sz = 1) {
    const object = new THREE.Mesh(geometry, material(color));
    object.position.set(x, y, z);
    object.scale.set(sx, sy, sz);
    object.castShadow = object.receiveShadow = true;
    scene.add(object);
    return object;
  }
  const box = (color, ...values) => mesh(boxGeometry, color, ...values);
  const cylinder = new THREE.CylinderGeometry(1, 1, 1, 24);
  const cone = new THREE.ConeGeometry(1, 1, 4);
  box('#9c9275', 0, -1.7, 0, 120.5, 3.2, 85.5);
  box('#d7cdb5', 0, -.18, 0, 120, .25, 85);
  box('#b7a16e', 0, -2.95, 0, 120.7, .12, 85.7);

  const areas = geography.features.map(feature => {
    const points = feature.vertices.map(([e, n]) => project(e, n));
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(points.flatMap(p => [p.x, feature.kind === 'park' ? .06 : .085, p.z]), 3));
    geometry.setIndex(feature.triangles);
    geometry.computeVertexNormals();
    const surface = mesh(geometry, feature.kind === 'park' ? '#829563' : '#699da5', 0, 0, 0);
    surface.castShadow = false;
    const xs = points.map(p => p.x), zs = points.map(p => p.z);
    return { ...feature, points, bounds: [Math.min(...xs), Math.min(...zs), Math.max(...xs), Math.max(...zs)] };
  });

  function inFeature(x, z, feature) {
    const [left, near, right, far] = feature.bounds;
    if (x < left || x > right || z < near || z > far) return false;
    const cross = (a, b) => (x - b.x) * (a.z - b.z) - (a.x - b.x) * (z - b.z);
    for (let i = 0; i < feature.triangles.length; i += 3) {
      const [a, b, c] = feature.triangles.slice(i, i + 3).map(index => feature.points[index]);
      const values = [cross(a, b), cross(b, c), cross(c, a)];
      if (values.every(v => v >= 0) || values.every(v => v <= 0)) return true;
    }
    return false;
  }
  const occupied = (x, z) => areas.some(area => inFeature(x, z, area));
  let seed = 719;
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const city = [], roofs = [], trees = [], trunks = [];
  const house = project(525850, 178700);
  const landmarkPoints = [[526600, 179550], [530294, 179648], [530700, 179980], [528950, 179600]].map(p => project(...p));
  for (let x = -58; x < 59; x += 2.85) {
    for (let z = -40; z < 42; z += 2.85) {
      const px = x + random() * .5, pz = z + random() * .5;
      if (Math.abs(px - house.x) < 9 && Math.abs(pz - house.z) < 9) continue;
      if (landmarkPoints.some(p => Math.hypot(p.x - px, p.z - pz) < 3.3)) continue;
      if ([[-1, -1], [1, -1], [-1, 1], [1, 1], [0, 0]].some(([dx, dz]) => occupied(px + dx, pz + dz))) continue;
      const height = .45 + random() * 1.25;
      const width = 1.25 + random() * .5, depth = 1.25 + random() * .5;
      city.push([px, height / 2, pz, width, height, depth]);
      roofs.push([px, height + .07, pz, width + .06, .13, depth + .06]);
    }
  }
  for (const area of areas.filter(f => f.kind === 'park')) {
    const [left, near, right, far] = area.bounds;
    for (let x = left + .5; x < right; x += 2.1) {
      for (let z = near + .5; z < far; z += 2.1) {
        const px = x + random() * 1.3, pz = z + random() * 1.3;
        if (!inFeature(px, pz, area) || random() > .55) continue;
        const size = .55 + random() * .55;
        trunks.push([px, .34, pz, .12, .65, .12]);
        trees.push([px, .7 + size * .25, pz, size, size * 1.25, size]);
      }
    }
  }
  function batch(geometry, color, transforms) {
    const object = new THREE.InstancedMesh(geometry, material(color), transforms.length);
    const part = new THREE.Object3D();
    transforms.forEach(([x, y, z, sx, sy, sz], i) => {
      part.position.set(x, y, z); part.scale.set(sx, sy, sz); part.updateMatrix();
      object.setMatrixAt(i, part.matrix);
    });
    object.castShadow = object.receiveShadow = true;
    scene.add(object);
  }
  batch(boxGeometry, '#c6bca3', city);
  batch(boxGeometry, '#999886', roofs);
  batch(boxGeometry, '#6d654b', trunks);
  batch(new THREE.IcosahedronGeometry(.6, 1), '#526f48', trees);

  // Reuse the original architectural vignette without altering the existing route.
  const neighbourhood = new THREE.Group();
  const studio = buildGardens(neighbourhood);
  neighbourhood.scale.setScalar(.43);
  neighbourhood.position.copy(house).add(new THREE.Vector3(0, .66, 0));
  scene.add(neighbourhood);
  const desk = studio.desk.multiplyScalar(.43).add(neighbourhood.position);

  // Original, deliberately toy-like silhouettes at approximate BNG landmark locations.
  function hall() {
    const p = landmarkPoints[0];
    mesh(cylinder, '#ad7253', p.x, .95, p.z, 1.8, 1.9, 1.55);
    for (const y of [.23, 1.6, 1.9]) mesh(cylinder, '#e3d2ad', p.x, y, p.z, 1.88, .16, 1.63);
    const dome = new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2);
    mesh(dome, '#777c67', p.x, 1.98, p.z, 1.68, .68, 1.45);
    for (let i = 0; i < 20; i++) {
      const angle = i * Math.PI / 10;
      const column = box('#e3d2ad', p.x + Math.cos(angle) * 1.76, 1.05, p.z + Math.sin(angle) * 1.53, .13, .86, .13);
      column.rotation.y = -angle;
    }
  }
  function westminster() {
    const p = landmarkPoints[1];
    box('#c1ac7f', p.x - 1.3, .65, p.z + .8, 3.7, 1.3, 1.8);
    box('#c8b487', p.x, 2.05, p.z, .9, 4.1, .9);
    for (const y of [2.7, 3.4, 4.05]) box('#e7d5ac', p.x, y, p.z, 1.08, .13, 1.08);
    const face = clockTexture();
    for (let side = 0; side < 4; side++) {
      const clock = new THREE.Mesh(new THREE.PlaneGeometry(.61, .61), new THREE.MeshBasicMaterial({ map: face, transparent: true }));
      const angle = side * Math.PI / 2;
      clock.position.set(p.x + Math.sin(angle) * .46, 3.7, p.z + Math.cos(angle) * .46);
      clock.rotation.y = angle;
      scene.add(clock);
    }
    mesh(cone, '#4d665d', p.x, 4.65, p.z, .72, 1.2, .72).rotation.y = Math.PI / 4;
    box('#d9c18c', p.x, 5.35, p.z, .08, .5, .08);
  }
  function eye() {
    const p = landmarkPoints[2];
    const wheel = new THREE.Group();
    wheel.position.set(p.x, 2.65, p.z);
    wheel.rotation.y = -.2;
    const rim = new THREE.Mesh(new THREE.TorusGeometry(2.3, .065, 6, 64), material('#e4dfc8'));
    wheel.add(rim);
    for (let i = 0; i < 24; i++) {
      const angle = i * Math.PI / 12;
      const x = Math.cos(angle) * 2.3, y = Math.sin(angle) * 2.3;
      const spoke = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(x, y, 0)]), new THREE.LineBasicMaterial({ color: '#c4ccbb' }));
      wheel.add(spoke);
      const pod = new THREE.Mesh(new THREE.SphereGeometry(.13, 8, 6), material('#879f96'));
      pod.position.set(x, y, 0);
      wheel.add(pod);
    }
    scene.add(wheel);
    for (const direction of [-1, 1]) {
      const support = box('#ded6bb', p.x + direction * .43, 1.35, p.z, .13, 2.8, .13);
      support.rotation.z = direction * .32;
    }
  }
  function palace() {
    const p = landmarkPoints[3];
    box('#dfd1af', p.x, .7, p.z, 3.4, 1.4, 2.4);
    box('#c6bc9d', p.x, 1.48, p.z, 3.6, .18, 2.5);
    for (let i = -3; i <= 3; i++) box('#8b9689', p.x + i * .42, .88, p.z + 1.22, .18, .46, .05);
  }
  hall(); westminster(); eye(); palace();
  const labels = [
    label(scene, 'KENSINGTON GARDENS', 526200, 180350, 10),
    label(scene, 'HYDE PARK', 527600, 180450, 8),
    label(scene, "REGENT'S PARK", 528000, 182750, 9),
    label(scene, 'BATTERSEA PARK', 527950, 177100, 9),
    label(scene, 'STUDIO', 525850, 178200, 5, '#f4d59a', 7.5),
  ];
  return { desk, labels, featureCount: areas.length };
}

function label(scene, text, e, n, width, color = '#f2ead3', height = 2.1) {
  const canvas = document.createElement('canvas');
  canvas.width = 768; canvas.height = 96;
  const context = canvas.getContext('2d');
  context.font = '500 40px sans-serif'; context.textAlign = 'center';
  context.fillStyle = '#34443d'; context.fillRect(0, 0, 768, 96);
  context.fillStyle = color; context.fillText(text, 384, 63);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), depthTest: false }));
  sprite.position.copy(project(e, n)).setY(height);
  sprite.scale.set(width, width / 8, 1);
  sprite.renderOrder = 2;
  scene.add(sprite);
  return sprite;
}

function clockTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const context = canvas.getContext('2d');
  context.fillStyle = '#f3e7c7'; context.beginPath(); context.arc(64, 64, 60, 0, Math.PI * 2); context.fill();
  context.strokeStyle = '#374c42'; context.lineWidth = 6;
  for (let i = 0; i < 12; i++) {
    const angle = i * Math.PI / 6;
    context.beginPath(); context.moveTo(64 + Math.sin(angle) * 46, 64 + Math.cos(angle) * 46);
    context.lineTo(64 + Math.sin(angle) * 54, 64 + Math.cos(angle) * 54); context.stroke();
  }
  context.beginPath(); context.moveTo(44, 44); context.lineTo(64, 64); context.lineTo(64, 24); context.stroke();
  return new THREE.CanvasTexture(canvas);
}
