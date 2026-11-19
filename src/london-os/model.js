import * as THREE from 'three';
import geography from './geography.json';
import { buildGardens } from '../gardens-model.js';
import { buildOffice } from './office.js';

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
  const ground = mesh(new THREE.PlaneGeometry(2000, 2000), '#bec0bc', 0, -.04, 0);
  ground.rotation.x = -Math.PI / 2;
  ground.castShadow = false;

  const surfaces = { park: { vertices: [], indices: [] }, water: { vertices: [], indices: [] } };
  const areas = geography.features.map(feature => {
    const points = feature.vertices.map(([e, n]) => project(e, n));
    const surface = surfaces[feature.kind], offset = surface.vertices.length / 3;
    for (const point of points) surface.vertices.push(point.x, feature.kind === 'park' ? .015 : .025, point.z);
    for (const index of feature.triangles) surface.indices.push(index + offset);
    const xs = points.map(p => p.x), zs = points.map(p => p.z);
    return { ...feature, points, bounds: [Math.min(...xs), Math.min(...zs), Math.max(...xs), Math.max(...zs)] };
  });
  for (const [kind, surface] of Object.entries(surfaces)) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(surface.vertices, 3));
    geometry.setIndex(surface.indices);
    geometry.computeVertexNormals();
    mesh(geometry, kind === 'park' ? '#9b9e99' : '#8d9ca0', 0, 0, 0).castShadow = false;
  }

  function inFeature(x, z, feature) {
    const [left, near, right, far] = feature.bounds;
    if (x < left || x > right || z < near || z > far) return false;
    const cross = (a, b) => (x - b.x) * (a.z - b.z) - (a.x - b.x) * (z - b.z);
    for (let i = 0; i < feature.triangles.length; i += 3) {
      const a = feature.points[feature.triangles[i]], b = feature.points[feature.triangles[i + 1]], c = feature.points[feature.triangles[i + 2]];
      const ab = cross(a, b), bc = cross(b, c), ca = cross(c, a);
      if ((ab >= 0 && bc >= 0 && ca >= 0) || (ab <= 0 && bc <= 0 && ca <= 0)) return true;
    }
    return false;
  }
  const occupied = (x, z) => areas.some(area => inFeature(x, z, area));
  let seed = 719;
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const city = [], roofs = [], trees = [], trunks = [], towers = [];
  const house = project(525850, 178700);
  const landmarkPoints = [[526600, 179550], [530294, 179648], [530700, 179980], [528950, 179600]].map(p => project(...p));
  for (let x = -145; x < 165; x += 3.5) {
    for (let z = -130; z < 125; z += 3.5) {
      const px = x + Math.sin(z * .045) * 2.3 + random() * .7, pz = z + Math.sin(x * .04) * 2 + random() * .7;
      if (Math.abs(px - house.x) < 9 && Math.abs(pz - house.z) < 9) continue;
      if (landmarkPoints.some(p => Math.hypot(p.x - px, p.z - pz) < 3.3)) continue;
      if ([[-1, -1], [1, -1], [-1, 1], [1, 1], [0, 0]].some(([dx, dz]) => occupied(px + dx, pz + dz))) continue;
      const height = .6 + random() * 1.7;
      const width = 1.65 + random() * .7, depth = 1.65 + random() * .7;
      city.push([px, height / 2, pz, width, height, depth]);
      roofs.push([px, height + .07, pz, width + .06, .13, depth + .06]);
      if (px > 29 && pz < 1 && pz > -25 && random() > .83) towers.push([px, height + 1.4, pz, width * .7, 2.8, depth * .7]);
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
  batch(boxGeometry, '#bcbfb7', city);
  batch(boxGeometry, '#999f99', roofs);
  batch(boxGeometry, '#acb5b4', towers);
  batch(boxGeometry, '#777d76', trunks);
  batch(new THREE.IcosahedronGeometry(.6, 1), '#747a77', trees);

  const neighbourhood = new THREE.Group();
  const colorFor = color => {
    const result = new THREE.Color(color), hsl = result.getHSL({});
    return result.setHSL(hsl.h, Math.min(hsl.s, .045), hsl.l);
  };
  const studio = buildGardens(neighbourhood, { uniformRoofline: true, flatGround: true, furnish: false, colorFor });
  neighbourhood.scale.setScalar(.43);
  neighbourhood.position.copy(house);
  scene.add(neighbourhood);
  const desk = studio.desk.multiplyScalar(.43).add(house);
  const marker = studio.marker.multiplyScalar(.43).add(house);
  let office;

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
  return {
    desk, marker, house, featureCount: areas.length, neighbourhood,
    ensureOffice(data, schedule) {
      if (!office) office = buildOffice(neighbourhood, studio.floor, data, schedule);
      return office;
    },
  };
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
