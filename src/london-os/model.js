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
  function mesh(geometry, color, x, y, z, sx = 1, sy = 1, sz = 1, parent = scene) {
    const object = new THREE.Mesh(geometry, material(color));
    object.position.set(x, y, z);
    object.scale.set(sx, sy, sz);
    object.castShadow = object.receiveShadow = true;
    parent.add(object);
    return object;
  }
  const box = (color, ...values) => mesh(boxGeometry, color, ...values);
  const cylinder = new THREE.CylinderGeometry(1, 1, 1, 24);
  const cone = new THREE.ConeGeometry(1, 1, 4);
  const ground = mesh(new THREE.PlaneGeometry(2000, 2000), '#d9d4c5', 0, -.04, 0);
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
    const surfaceMesh = mesh(geometry, kind === 'park' ? '#80a46a' : '#6da5ba', 0, 0, 0);
    surfaceMesh.name = `os-${kind}`;
    surfaceMesh.castShadow = false;
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
  const cityPalette = ['#c5c6bf', '#dbb9a2', '#b8c5c9', '#d2c8b1', '#c5b6b0', '#b8c4ac', '#d7cfbf'];
  const house = project(525850, 178700);
  const landmarkPoints = [[526600, 179550], [530294, 179648], [530700, 179980], [528997, 179614], [525844, 180027], [527400, 177550], [530017, 180419], [527852, 180968], [532950, 180150], [533100, 180900], [533350, 181250], [537550, 180300], [524700, 179550]].map(p => project(...p));
  const nearLandmark = (x, z) => landmarkPoints.some((p, index) => Math.hypot(p.x - x, p.z - z) < (index === 11 ? 10 : index === 3 ? 6 : 3.3));
  for (let x = -145; x < 165; x += 3.5) {
    for (let z = -130; z < 125; z += 3.5) {
      const px = x + Math.sin(z * .045) * 2.3 + random() * .7, pz = z + Math.sin(x * .04) * 2 + random() * .7;
      if (Math.abs(px - house.x) < 9 && Math.abs(pz - house.z) < 9) continue;
      if (nearLandmark(px, pz)) continue;
      if ([[-1, -1], [1, -1], [-1, 1], [1, 1], [0, 0]].some(([dx, dz]) => occupied(px + dx, pz + dz))) continue;
      const height = .6 + random() * 1.7;
      const width = 1.65 + random() * .7, depth = 1.65 + random() * .7;
      city.push([px, height / 2, pz, width, height, depth]);
      roofs.push([px, height + .07, pz, width + .06, .13, depth + .06]);
      if (px > 29 && pz < 1 && pz > -25 && random() > .83) towers.push([px, height + 1.4, pz, width * .7, 2.8, depth * .7]);
    }
  }
  const waterAreas = areas.filter(area => area.kind === 'water');
  for (const area of areas.filter(f => f.kind === 'park')) {
    const [left, near, right, far] = area.bounds;
    for (let x = left + .5; x < right; x += 2.1) {
      for (let z = near + .5; z < far; z += 2.1) {
        const px = x + random() * 1.3, pz = z + random() * 1.3;
        if (!inFeature(px, pz, area) || nearLandmark(px, pz) || waterAreas.some(water => inFeature(px, pz, water)) || random() > .55) continue;
        const size = .55 + random() * .55;
        trunks.push([px, .34, pz, .12, .65, .12]);
        trees.push([px, .7 + size * .25, pz, size, size * 1.25, size]);
      }
    }
  }
  function batch(geometry, color, transforms, palette) {
    const object = new THREE.InstancedMesh(geometry, material(color), transforms.length);
    const part = new THREE.Object3D();
    transforms.forEach(([x, y, z, sx, sy, sz], i) => {
      part.position.set(x, y, z); part.scale.set(sx, sy, sz); part.updateMatrix();
      object.setMatrixAt(i, part.matrix);
      if (palette) object.setColorAt(i, new THREE.Color(palette[i % palette.length]));
    });
    object.castShadow = object.receiveShadow = true;
    scene.add(object);
  }
  batch(boxGeometry, '#ffffff', city, cityPalette);
  batch(boxGeometry, '#788086', roofs);
  batch(boxGeometry, '#acb5b4', towers);
  batch(boxGeometry, '#777d76', trunks);
  batch(new THREE.IcosahedronGeometry(.6, 1), '#5d855c', trees);

  const neighbourhood = new THREE.Group();
  neighbourhood.name = 'London garden square';
  const studio = buildGardens(neighbourhood, { uniformRoofline: true, flatGround: true, furnish: false, pinboardWall: true, cornwallGardens: true });
  neighbourhood.scale.setScalar(.43 * .8 * .75 * 1.05);
  neighbourhood.position.copy(house);
  scene.add(neighbourhood);
  neighbourhood.updateMatrixWorld(true);
  const desk = neighbourhood.localToWorld(studio.desk.clone());
  const marker = neighbourhood.localToWorld(studio.marker.clone());
  const roomCenter = neighbourhood.localToWorld(new THREE.Vector3(0, studio.floor + 1.1, -9.6));
  let office;

  // Original, deliberately toy-like silhouettes at approximate BNG landmark locations.
  function landmark(name, index, degrees = 0) {
    const group = new THREE.Group();
    group.name = name;
    group.position.copy(landmarkPoints[index]);
    group.rotation.y = THREE.MathUtils.degToRad(degrees);
    scene.add(group);
    return group;
  }
  function sashWindow(parent, x, y, z, width, height, facing = 1) {
    box('#eee5d3', x, y, z, width + .08, height + .08, .045, parent);
    box('#607d87', x, y, z + facing * .03, width, height, .025, parent).name = 'Sash glazing';
    box('#eee5d3', x, y, z + facing * .05, width, .025, .02, parent);
    box('#eee5d3', x, y, z + facing * .05, .02, height, .02, parent);
  }
  function pediment(parent, width, height, y, z) {
    const shape = new THREE.Shape();
    shape.moveTo(-width / 2, 0); shape.lineTo(width / 2, 0); shape.lineTo(0, height); shape.closePath();
    return mesh(new THREE.ExtrudeGeometry(shape, { depth: .1, bevelEnabled: false }), '#eee5d3', 0, y, z, 1, 1, 1, parent);
  }
  function neighbouringHouses() {
    const group = new THREE.Group();
    group.name = 'Neighbouring houses';
    group.position.copy(house);
    scene.add(group);
    for (const [index, [x, z, turn]] of [[-7.1, -2.6, Math.PI / 2], [-7.1, 1.5, Math.PI / 2], [7.1, -2.6, -Math.PI / 2], [7.1, 1.5, -Math.PI / 2], [-3.3, 6.1, Math.PI], [3.3, 6.1, Math.PI], [-3.4, -5.8, 0], [0, -5.8, 0], [3.4, -5.8, 0]].entries()) {
      const building = new THREE.Group();
      building.name = `Neighbouring house ${index + 1}`;
      building.position.set(x, 0, z);
      building.rotation.y = turn;
      group.add(building);
      const height = 1.5 + (index % 3) * .16;
      box(cityPalette[index % cityPalette.length], 0, height / 2, 0, 1.5, height, 1.7, building);
      box('#788086', 0, height + .07, 0, 1.56, .13, 1.76, building);
    }
  }
  function hall() {
    const group = landmark('Royal Albert Hall', 0);
    group.scale.setScalar(.95);
    const stone = '#e3d2ad';
    mesh(cylinder, '#ad7253', 0, .95, 0, 1.8, 1.9, 1.55, group);
    for (const y of [.23, 1.6, 1.9]) mesh(cylinder, stone, 0, y, 0, 1.88, .16, 1.63, group);
    mesh(cylinder, '#c6a575', 0, 1.74, 0, 1.83, .16, 1.58, group);
    const dome = new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2);
    mesh(dome, '#777c67', 0, 1.98, 0, 1.68, .68, 1.45, group);
    function arch(radius, stem) {
      const shape = new THREE.Shape();
      shape.moveTo(-radius, 0);
      shape.lineTo(radius, 0);
      shape.lineTo(radius, stem);
      shape.absarc(0, stem, radius, 0, Math.PI);
      shape.closePath();
      return new THREE.ShapeGeometry(shape);
    }
    const frame = arch(.14, .3), glazing = arch(.105, .29);
    const ribs = [];
    for (let i = 0; i < 20; i++) {
      const angle = i * Math.PI / 10;
      const bay = new THREE.Group();
      bay.name = 'Albert Hall arcade bay';
      bay.position.set(Math.cos(angle) * 1.81, 0, Math.sin(angle) * 1.56);
      bay.rotation.y = Math.atan2(Math.cos(angle) / 1.8, Math.sin(angle) / 1.55);
      group.add(bay);
      for (const y of [.42, 1.02]) {
        mesh(frame, stone, 0, y, 0, 1, 1, 1, bay);
        mesh(glazing, '#53676c', 0, y + .02, .006, 1, 1, 1, bay);
        box(stone, 0, y + .19, .013, .018, .34, .018, bay);
        box(stone, 0, y + .18, .013, .21, .018, .018, bay);
      }
      box(stone, 0, 1.74, .015, .27, .075, .025, bay);
      const columnAngle = angle + Math.PI / 20;
      const column = box(stone, Math.cos(columnAngle) * 1.79, 1.03, Math.sin(columnAngle) * 1.54, .1, 1.06, .1, group);
      column.rotation.y = -columnAngle;
      const points = [];
      for (let step = 0; step <= 12; step++) {
        const latitude = step / 12 * Math.PI / 2;
        points.push(new THREE.Vector3(Math.sin(latitude) * Math.cos(angle) * 1.69, 1.985 + Math.cos(latitude) * .68, Math.sin(latitude) * Math.sin(angle) * 1.46));
      }
      for (let step = 1; step < points.length; step++) ribs.push(points[step - 1], points[step]);
    }
    const roofRibs = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(ribs), new THREE.LineBasicMaterial({ color: '#bdb79d' }));
    roofRibs.name = 'Albert Hall dome ribs';
    group.add(roofRibs);
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
    // The wheel's horizontal diameter follows a grid bearing of about 5.8 degrees.
    const group = landmark('London Eye', 2, 84.18);
    const wheel = new THREE.Group();
    wheel.position.y = 2.65;
    const rim = new THREE.Mesh(new THREE.TorusGeometry(2.3, .065, 6, 64), material('#e4dfc8'));
    rim.name = 'Eye rim';
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
    group.add(wheel);
    for (const direction of [-1, 1]) {
      const support = box('#ded6bb', direction * .43, 1.35, 0, .13, 2.8, .13, group);
      support.rotation.z = direction * .32;
    }
  }
  function palace() {
    // Apply the requested half-turn to the preceding visual orientation.
    const group = landmark('Buckingham Palace', 3, 360 - 55.3);
    const stone = '#e5ddcb', trim = '#f2e9d8', window = '#6e858b', roof = '#747c7c';
    box('#c6bdab', 0, .07, .7, 5.6, .12, 4.7, group);
    box('#b7afa0', 0, .15, -.1, 3.35, .08, 1.8, group).name = 'Buckingham courtyard';
    box(stone, 0, .86, 1.2, 4.8, 1.5, .72, group).name = 'Buckingham east front';
    box(stone, 0, .8, -1.3, 4.8, 1.4, .65, group);
    for (const side of [-1, 1]) {
      box(stone, side * 2.05, .8, -.05, .7, 1.4, 2.5, group);
      box(roof, side * 2.05, 1.53, -.05, .75, .12, 2.6, group);
      box(trim, side * 2.05, .19, -.05, .79, .13, 2.6, group);
      for (const z of [-.85, -.2, .45]) for (const y of [.6, 1.13]) {
        box(window, side * 2.415, y, z, .025, .27, .22, group);
      }
      box(trim, side * 2.1, 1.02, 1.63, .63, 1.38, .2, group);
      for (const y of [.63, 1.22]) box(window, side * 2.1, y, 1.74, .22, .31, .035, group);
    }
    for (const z of [-1.3, 1.2]) {
      box(roof, 0, 1.62, z, 4.9, .12, .8, group);
      box(trim, 0, 1.75, z, 4.95, .15, .85, group);
      for (const x of [-1.7, -1.1, 1.1, 1.7]) box(stone, x, 1.93, z - .12, .14, .3, .16, group);
    }
    for (const y of [.23, 1.05, 1.53]) box(trim, 0, y, 1.59, 4.85, .09, .1, group);
    for (let x = -1.65; x <= 1.65; x += .33) for (const y of [.62, 1.25]) {
      box(trim, x, y, 1.62, .22, .35, .06, group);
      box(window, x, y, 1.66, .14, .27, .035, group);
    }
    box(trim, 0, 1.03, 1.68, 1.22, 1.42, .22, group);
    for (const x of [-.46, 0, .46]) {
      box(window, x, 1.14, 1.81, .21, .53, .035, group);
      for (const offset of [-.16, .16]) box(trim, x + offset, 1.12, 1.84, .065, .8, .1, group);
    }
    box(trim, 0, .82, 1.93, 1.42, .12, .5, group).name = 'Buckingham balcony';
    for (let x = -.65; x <= .65; x += .13) box('#8b8170', x, .99, 2.13, .025, .25, .025, group);
    box(trim, 0, 1.13, 2.13, 1.44, .06, .06, group);
    box('#aa9c80', 0, 1.91, 1.22, .5, .17, .18, group);
    box('#b3ab95', 0, 2.22, 1.18, .025, .55, .025, group);
    box('#a54e4a', .18, 2.38, 1.18, .34, .18, .025, group);
    for (const side of [-1, 1]) {
      for (let x = .38; x <= 2.45; x += .16) box('#414946', side * x, .43, 2.8, .025, .56, .025, group);
      box('#414946', side * 1.42, .67, 2.8, 2.13, .04, .04, group);
      box(trim, side * 2.5, .43, 2.8, .22, .8, .22, group);
      mesh(new THREE.SphereGeometry(.11, 8, 6), '#b7a16b', side * 2.5, .91, 2.8, 1, 1, 1, group);
    }
    const rear = new THREE.Group();
    rear.name = 'Buckingham garden front';
    group.add(rear);
    box(stone, 0, .86, -1.72, 1.65, 1.5, .34, rear);
    for (const y of [.24, 1.02, 1.52]) {
      box(trim, 0, y, -1.66, 4.85, .09, .1, rear);
      box(trim, 0, y, -1.91, 1.78, .09, .12, rear);
    }
    for (let bay = -6; bay <= 6; bay++) {
      const x = bay * .33, z = Math.abs(x) < .8 ? -1.92 : -1.67;
      for (const y of [.61, 1.25]) {
        if (bay === 0 && y === .61) continue;
        sashWindow(rear, x, y, z, .14, .28, -1);
      }
    }
    for (const x of [-2.34, 2.34]) for (const y of [.4, .66, .92, 1.18, 1.44]) box(trim, x, y, -1.67, .18, .18, .09, rear);
    box(trim, 0, .12, -2.02, 2.2, .16, 1, rear);
    box(trim, 0, .05, -2.25, 2.55, .08, .85, rear);
    box('#53696b', 0, .62, -1.96, .25, .75, .035, rear);
    for (const x of [-.66, -.24, .24, .66]) {
      mesh(cylinder, trim, x, .72, -2.12, .055, 1.08, .055, rear);
      box(trim, x, .22, -2.12, .17, .1, .17, rear);
      box(trim, x, 1.27, -2.12, .17, .1, .17, rear);
    }
    box(trim, 0, 1.37, -2.08, 1.65, .14, .5, rear);
    pediment(rear, 1.85, .32, 1.7, -1.98).name = 'Buckingham garden pediment';
    for (const side of [-1, 1]) {
      box(trim, side * 2.08, 1.88, -1.3, .58, .12, .8, rear);
      for (let x = .95; x <= 2.2; x += .18) box(trim, side * x, 1.83, -1.65, .045, .18, .06, rear);
    }
  }
  function kensingtonPalace() {
    const group = landmark('Kensington Palace', 4, 360 - 72.5);
    box('#aa6e57', 0, .75, 0, 3.3, 1.5, 1.2, group);
    for (const x of [-1.15, 1.15]) for (const z of [-.35, .35]) {
      box('#cba78c', x, 1.94, z, .18, .62, .2, group);
      box('#e7d5b6', x, 2.26, z, .26, .08, .28, group);
    }
    for (const y of [.15, .83, 1.5]) box('#e7d5b6', 0, y, 0, 3.4, .1, 1.3, group);
    mesh(new THREE.CylinderGeometry(.42, Math.SQRT1_2, 1, 4, 1, false, Math.PI / 4), '#5e6669', 0, 1.74, 0, 3.5, .4, 1.4, group);
    for (let x = -1.2; x <= 1.2; x += .4) for (const y of [.48, 1.15]) {
      box('#e9dfc5', x, y, .66, .22, .39, .06, group);
      box('#6e8790', x, y, .7, .13, .29, .025, group);
    }
    box('#e7d5b6', 0, .5, .76, .44, .9, .12, group);
    box('#394f50', 0, .4, .84, .25, .65, .05, group).name = 'Kensington east entrance';
    const rear = new THREE.Group();
    rear.name = 'Kensington west front';
    group.add(rear);
    box('#b77d63', 0, .75, -.64, .72, 1.5, .17, rear);
    for (const y of [.15, .83, 1.5]) box('#e7d5b6', 0, y, -.75, .8, .1, .1, rear);
    for (let bay = -3; bay <= 3; bay++) for (const y of [.48, 1.15]) {
      if (bay === 0 && y === .48) continue;
      sashWindow(rear, bay * .4, y, bay === 0 ? -.77 : -.66, .15, .3, -1);
    }
    for (const x of [-1.57, 1.57]) for (const y of [.32, .56, 1.05, 1.3]) box('#d7b99b', x, y, -.63, .14, .16, .08, rear);
    box('#e7d5b6', 0, .42, -.8, .43, .76, .08, rear);
    box('#394f50', 0, .38, -.85, .26, .64, .035, rear);
    box('#e7d5b6', 0, .82, -.86, .57, .08, .2, rear);
    pediment(rear, .64, .17, .88, -.95);
    for (let step = 0; step < 3; step++) box('#c6b69b', 0, .045 + step * .055, -1.05 + step * .1, .7 - step * .08, .09 + step * .11, .38, rear);
    for (const side of [-1, 1]) for (const z of [-.28, .28]) for (const y of [.48, 1.15]) {
      box('#e7d5b6', side * 1.67, y, z, .06, .38, .22, group);
      box('#607d87', side * 1.71, y, z, .025, .29, .14, group);
    }
  }
  function designMuseum() {
    const group = landmark('Design Museum', 12, 8);
    group.scale.setScalar(.45);
    box('#c7bca6', 0, .20, 0, 3.55, .4, 3.05, group);
    const heightAt = (x, z) => 1.55 + .7 * (x / 2) * (z / 1.8);
    const vertices = [], indices = [], divisions = 16;
    for (let row = 0; row <= divisions; row++) for (let col = 0; col <= divisions; col++) {
      const x = col / divisions * 4 - 2, z = row / divisions * 3.6 - 1.8;
      vertices.push(x, heightAt(x, z), z);
      if (row < divisions && col < divisions) {
        const a = row * (divisions + 1) + col, b = a + divisions + 1;
        indices.push(a, b, a + 1, a + 1, b, b + 1);
      }
    }
    const roof = new THREE.BufferGeometry();
    roof.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    roof.setIndex(indices);
    roof.computeVertexNormals();
    const canopy = new THREE.Mesh(roof, new THREE.MeshStandardMaterial({ color: '#8a8068', roughness: .8, side: THREE.DoubleSide }));
    canopy.name = 'Design Museum saddle roof';
    canopy.castShadow = canopy.receiveShadow = true;
    group.add(canopy);
    const walls = [], ribs = [];
    for (let side = 0; side < 4; side++) {
      const point = t => side === 0 ? [-1.72 + t * 3.44, -1.45]
        : side === 1 ? [1.72, -1.45 + t * 2.9]
          : side === 2 ? [1.72 - t * 3.44, 1.45] : [-1.72, 1.45 - t * 2.9];
      for (let bay = 0; bay < 12; bay++) {
        const [x, z] = point(bay / 12), [nx, nz] = point((bay + 1) / 12);
        const y = heightAt(x, z) - .025, ny = heightAt(nx, nz) - .025;
        walls.push(x, .4, z, nx, .4, nz, x, y, z, x, y, z, nx, .4, nz, nx, ny, nz);
        ribs.push(new THREE.Vector3(x, .4, z), new THREE.Vector3(x, y, z));
      }
    }
    const glazing = new THREE.BufferGeometry();
    glazing.setAttribute('position', new THREE.Float32BufferAttribute(walls, 3));
    glazing.computeVertexNormals();
    const facade = new THREE.Mesh(glazing, new THREE.MeshStandardMaterial({ color: '#829da1', roughness: .35, side: THREE.DoubleSide }));
    group.add(facade);
    group.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(ribs), new THREE.LineBasicMaterial({ color: '#d3cbb8' })));
    box('#d7ceba', 0, .12, 1.9, 2.2, .18, 1, group);
    box('#43585b', 0, .65, 1.46, .7, .52, .035, group);
  }
  function citySkyline() {
    const shard = landmark('The Shard', 8, 18);
    mesh(new THREE.ConeGeometry(1, 8.5, 3), '#98b9c3', 0, 4.35, 0, 1.15, 1, 1.05, shard).name = 'Shard taper';
    mesh(new THREE.ConeGeometry(1, 7.1, 3), '#bad0d0', .32, 3.65, .12, .75, 1, .8, shard);
    const shardLines = [];
    for (let side = 0; side < 3; side++) {
      const angle = side * Math.PI * 2 / 3;
      shardLines.push(new THREE.Vector3(Math.sin(angle) * 1.15, .1, Math.cos(angle) * 1.05), new THREE.Vector3(0, 8.6, 0));
    }
    shard.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(shardLines), new THREE.LineBasicMaterial({ color: '#e0e5da' })));

    const walkie = landmark('Walkie Talkie', 9, -12);
    mesh(new THREE.CylinderGeometry(1, .6, 5.1, 4, 1, false, Math.PI / 4), '#91afb8', 0, 2.65, 0, 1.7, 1, 1.2, walkie).name = 'Walkie Talkie flared tower';
    for (let floor = 0; floor <= 12; floor++) {
      const t = floor / 12, width = Math.SQRT2 * 1.7 * (.6 + .4 * t), depth = Math.SQRT2 * 1.2 * (.6 + .4 * t);
      for (const side of [-1, 1]) {
        box('#d0d8cf', 0, .1 + t * 5.1, side * depth / 2, width, .035, .035, walkie);
        box('#d0d8cf', side * width / 2, .1 + t * 5.1, 0, .035, .035, depth, walkie);
      }
    }
    const ribs = [];
    for (let bay = -4; bay <= 4; bay++) for (const side of [-1, 1]) {
      ribs.push(new THREE.Vector3(bay * .175, .1, side * .52), new THREE.Vector3(bay * .295, 5.2, side * .86));
    }
    walkie.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(ribs), new THREE.LineBasicMaterial({ color: '#e1e4d8' })));
    box('#526e66', 0, 5.25, 0, 2.25, .16, 1.52, walkie);
    box('#e2e4d9', 0, 5.43, 0, 2.52, .12, 1.82, walkie);

    const gherkin = landmark('The Gherkin', 10);
    const profile = [[0, .1], [.62, .1], [.85, 1], [1.04, 2.4], [.94, 3.8], [.65, 4.9], [.25, 5.5], [0, 5.7]];
    mesh(new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), 32), '#7d9fa7', 0, 0, 0, 1, 1, 1, gherkin).name = 'Gherkin glazing';
    const radiusAt = y => {
      const index = profile.findIndex((point, i) => i > 1 && point[1] >= y);
      const [a, b] = [profile[index - 1], profile[index]];
      return THREE.MathUtils.lerp(a[0], b[0], (y - a[1]) / (b[1] - a[1]));
    };
    const lattice = [];
    for (let spiral = 0; spiral < 12; spiral++) for (const direction of [-1, 1]) {
      let previous;
      for (let step = 0; step <= 40; step++) {
        const y = .1 + step / 40 * 5.6, radius = radiusAt(y) + .015;
        const angle = spiral * Math.PI / 6 + direction * y * .48;
        const point = new THREE.Vector3(Math.sin(angle) * radius, y, Math.cos(angle) * radius);
        if (previous) lattice.push(previous, point);
        previous = point;
      }
    }
    const diagrid = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(lattice), new THREE.LineBasicMaterial({ color: '#d2ded7' }));
    diagrid.name = 'Gherkin diagrid';
    gherkin.add(diagrid);
  }
  function canaryWharf() {
    const group = landmark('Canary Wharf', 11);
    const placements = [
      [0, 0, 1.75, 1.75, 7.1], [-3, -.8, 1.7, 1.8, 6.1], [3, -.7, 1.75, 1.65, 6.4],
      [-5.7, 1.7, 1.5, 1.8, 5], [5.7, 2, 1.5, 1.65, 5.7], [-2.7, 3.2, 1.8, 1.65, 4.7],
      [.5, 3.7, 1.6, 1.5, 5.5], [3.7, -4.1, 1.45, 1.5, 6.7], [-.3, -4.1, 1.6, 1.7, 5.3],
    ];
    placements.forEach(([x, z, width, depth, height], index) => {
      const tower = new THREE.Group();
      tower.name = index === 0 ? 'One Canada Square' : `Canary Wharf tower ${index}`;
      tower.position.set(x, 0, z);
      group.add(tower);
      box(['#9caeaf', '#829ca7', '#b2bdba'][index % 3], 0, height / 2 + .1, 0, width, height, depth, tower);
      box('#d3d5ca', 0, .12, 0, width + .22, .2, depth + .22, tower);
      for (let y = .5; y < height; y += .45) box('#c1ceca', 0, y, 0, width + .025, .04, depth + .025, tower);
      for (const side of [-1, 1]) for (const end of [-1, 1]) box('#d8dcd1', side * width / 2, height / 2 + .1, end * depth / 2, .07, height, .07, tower);
      box('#cbd3ca', 0, height + .14, 0, width + .1, .1, depth + .1, tower);
      if (index === 0) {
        mesh(cone, '#d7dbcf', 0, height + .76, 0, 1.4, 1.15, 1.4, tower).rotation.y = Math.PI / 4;
      } else {
        box('#657b7f', 0, height + .3, -.1, width * .58, .25, depth * .58, tower);
      }
    });
  }
  function albertBridge() {
    // Local +z follows the bridge south-southeast, about 161.3 degrees from grid north.
    const group = landmark('Albert Bridge', 5, 18.69);
    box('#e5cfbd', 0, .34, 0, .62, .14, 3.8, group);
    for (const side of [-1, 1]) {
      box('#f0d7d0', side * .31, .55, 0, .045, .12, 3.8, group);
      for (const z of [-1.12, 1.12]) {
        box('#d8e2d3', side * .31, .95, z, .1, 1.5, .1, group);
        box('#efb8b2', side * .31, 1.62, z, .2, .12, .2, group);
        mesh(cone, '#bd8b71', side * .31, 1.83, z, .13, .3, .13, group);
        for (const end of [-1.8, 0, 1.8]) {
          const a = new THREE.Vector3(side * .31, 1.58, z), b = new THREE.Vector3(side * .31, .63, end);
          const delta = b.clone().sub(a);
          const cable = mesh(new THREE.CylinderGeometry(.016, .016, delta.length(), 5), '#ecdbcf', ...a.clone().add(b).multiplyScalar(.5).toArray(), 1, 1, 1, group);
          cable.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
        }
      }
      for (let z = -1.7; z <= 1.7; z += .25) box('#dfc7bd', side * .31, .46, z, .025, .28, .025, group);
    }
    for (const z of [-1.12, 1.12]) box('#e5d7c2', 0, 1.4, z, .75, .1, .12, group);
  }
  function nelsonsColumn() {
    const group = landmark("Nelson's Column", 6);
    const stone = '#c9c4b1', bronze = '#58665c';
    for (const [y, width] of [[.08, 2.7], [.2, 2.2], [.34, 1.6]]) box(stone, 0, y, 0, width, .15, width, group);
    box(stone, 0, .74, 0, .77, .7, .77, group);
    for (const side of [-1, 1]) {
      box(bronze, side * .395, .75, 0, .025, .36, .44, group);
      box(bronze, 0, .75, side * .395, .44, .36, .025, group);
    }
    mesh(cylinder, stone, 0, 1.12, 0, .3, .16, .3, group);
    mesh(new THREE.CylinderGeometry(.17, .22, 2.5, 16), stone, 0, 2.4, 0, 1, 1, 1, group).name = 'Nelson column shaft';
    mesh(cylinder, bronze, 0, 3.7, 0, .29, .16, .29, group);
    for (const x of [-.21, .21]) for (const z of [-.21, .21]) mesh(new THREE.SphereGeometry(.09, 8, 6), bronze, x, 3.72, z, 1, 1, 1, group);
    box(stone, 0, 3.86, 0, .62, .12, .62, group);
    mesh(cylinder, '#a4a491', 0, 4.09, 0, .12, .38, .1, group);
    mesh(new THREE.SphereGeometry(.095, 8, 6), '#a4a491', 0, 4.37, 0, 1, 1, 1, group);
    box('#858977', 0, 4.45, 0, .29, .06, .14, group);
    box('#a4a491', .16, 4.15, 0, .25, .08, .1, group).rotation.z = -.5;
    for (const x of [-.85, .85]) for (const z of [-.85, .85]) {
      const lion = new THREE.Group();
      lion.position.set(x, .44, z);
      lion.rotation.y = Math.atan2(x, z);
      group.add(lion);
      mesh(new THREE.IcosahedronGeometry(1, 1), bronze, 0, 0, 0, .18, .16, .36, lion);
      mesh(new THREE.IcosahedronGeometry(1, 1), bronze, 0, .12, .22, .2, .22, .18, lion);
      for (const side of [-1, 1]) box(bronze, side * .13, -.05, .34, .09, .1, .25, lion);
    }
  }
  function marbleArch() {
    const group = landmark('Marble Arch', 7, 13.69);
    const stone = '#eee8d8', trim = '#faf2e1';
    const wall = new THREE.Shape();
    wall.moveTo(-1.4, 0); wall.lineTo(1.4, 0); wall.lineTo(1.4, 1.62); wall.lineTo(-1.4, 1.62); wall.closePath();
    for (const [x, radius, spring] of [[0, .43, .85], [-.95, .25, .64], [.95, .25, .64]]) {
      const opening = new THREE.Path();
      opening.moveTo(x - radius, .08); opening.lineTo(x + radius, .08);
      opening.lineTo(x + radius, spring); opening.absarc(x, spring, radius, 0, Math.PI, false);
      opening.lineTo(x - radius, .08); opening.closePath();
      wall.holes.push(opening);
    }
    mesh(new THREE.ExtrudeGeometry(wall, { depth: .7, bevelEnabled: false, curveSegments: 12 }), stone, 0, .06, -.35, 1, 1, 1, group).name = 'Marble Arch masonry';
    box(stone, 0, .05, 0, 3, .1, .9, group);
    box(trim, 0, 1.64, 0, 2.94, .16, .82, group);
    box(stone, 0, 1.88, 0, 2.72, .32, .72, group);
    box(trim, 0, 2.07, 0, 2.94, .08, .82, group);
    for (const side of [-1, 1]) {
      for (const x of [-1.3, -.56, .56, 1.3]) {
        mesh(cylinder, trim, x, .82, side * .4, .055, 1.36, .055, group);
        box(trim, x, 1.5, side * .4, .16, .1, .16, group);
      }
      for (const x of [-.95, .95]) box('#d7cebb', x, 1.3, side * .37, .4, .32, .035, group);
      box('#d7cebb', 0, 1.88, side * .375, .75, .14, .025, group);
    }
  }
  neighbouringHouses(); hall(); westminster(); eye(); palace(); kensingtonPalace(); albertBridge(); nelsonsColumn(); marbleArch(); citySkyline(); canaryWharf(); designMuseum();
  return {
    desk, marker, roomCenter, house, featureCount: areas.length, neighbourhood,
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
