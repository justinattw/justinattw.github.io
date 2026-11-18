import * as THREE from 'three';

const stone = '#e2d9c4', trim = '#f6edda', slate = '#4c5556';
const iron = '#28312b', glass = '#455d60', wood = '#865538';

export function buildGardens(scene) {
  const geometries = {
    box: new THREE.BoxGeometry(),
    column: new THREE.CylinderGeometry(.43, .5, 1, 16),
    crown: new THREE.IcosahedronGeometry(.5, 1),
    arch: archGeometry(),
    roof: new THREE.CylinderGeometry(.32, Math.SQRT1_2, 1, 4, 1, false, Math.PI / 4),
  };
  const batches = new Map(), part = new THREE.Object3D();
  function shape(type, color, x, y, z, w, h, d, turn = 0) {
    const key = `${type}:${color}`;
    if (!batches.has(key)) batches.set(key, { type, color, transforms: [] });
    part.position.set(x, y, z);
    part.scale.set(w, h, d);
    part.rotation.y = turn;
    part.updateMatrix();
    batches.get(key).transforms.push(part.matrix.clone());
  }
  const box = (color, ...coords) => shape('box', color, ...coords);
  const column = (color, ...coords) => shape('column', color, ...coords);
  const roof = (...coords) => shape('roof', slate, ...coords);

  function railing(x, y, z, length, turn = 0, color = iron) {
    const dx = Math.cos(turn), dz = -Math.sin(turn);
    for (const height of [.13, .52]) box(color, x, y + height, z, length, .055, .06, turn);
    const count = Math.ceil(length / .25);
    for (let i = 0; i <= count; i++) {
      const offset = (i / count - .5) * length;
      box(color, x + dx * offset, y + .33, z + dz * offset, .045, .65, .045, turn);
    }
  }

  function terrace(x, z, width, depth, height, turn = 0, featured = false, facade = stone) {
    const cos = Math.cos(turn), sin = Math.sin(turn);
    function piece(type, color, u, y, v, w, h, d) {
      shape(type, color, x + u * cos + v * sin, y, z - u * sin + v * cos, w, h, d, turn);
    }
    const block = (color, ...dims) => piece('box', color, ...dims);
    const front = depth / 2;
    block(facade, 0, height / 2, 0, width, height, depth);
    block('#a69f8f', 0, .35, 0, width + .12, .7, depth + .12);
    for (const level of [.24, .45, .68, .87, .986]) {
      block(trim, 0, height * level, 0, width + .25, level > .98 ? .26 : .09, depth + .25);
    }
    for (const [level, tall, arch] of [[.14, .16, false], [.35, .18, true], [.56, .15, false], [.775, .14, false], [.93, .085, false]]) {
      for (const bay of [-.29, 0, .29]) {
        const u = width * bay, v = front + .03, w = width * .175, y = height * level, h = height * tall;
        if (bay === -.29 && level === .14) continue;
        const type = arch ? 'arch' : 'box';
        piece(type, trim, u, y, v, w + .17, h + .14, .16);
        piece(type, glass, u, y, v + .086, w, h, .09);
        block(trim, u, y, v + .144, w, .055, .035);
        block(trim, u, y - .12 * h, v + .146, .04, h * .63, .035);
        block(trim, u, y - h / 2, v + .12, w + .25, .085, .27);
        if (!arch && level < .9) block(trim, u, y + h / 2 + .08, v + .11, w + .25, .10, .25);
      }
    }
    const door = -width * .29;
    block(iron, door, height * .123, front + .04, width * .18, height * .20, .09);
    block(trim, door, height * .25, front + .47, width * .29, .21, 1.16);
    for (const side of [-1, 1]) {
      const u = door + side * width * .115;
      piece('column', trim, u, height * .126, front + .88, .22, height * .225, .22);
      block(trim, u, height * .23, front + .88, .32, .14, .32);
    }
    for (let i = 0; i < 3; i++) {
      block('#907d6f', door, .06 + i * .12, front + .96 - i * .16, width * .29, .12 + i * .24, .61);
    }
    block(trim, 0, height * .242, front + .27, width + .10, .15, .55);
    block(trim, 0, height * .242 + .41, front + .5, width + .10, .08, .10);
    for (let i = 0; i <= Math.floor(width / .24); i++) {
      piece('column', trim, -width / 2 + i * .24, height * .242 + .23, front + .5, .091, .33, .09);
    }
    for (const bay of [-.30, 0, .30]) {
      for (const level of [.35, .59, .79]) {
        block('#bdb29c', width * bay, height * level, -front - .05, width * .165, height * .145, .13);
        block(glass, width * bay, height * level, -front - .13, width * .135, height * .114, .05);
      }
    }
    if (!featured) {
      piece('roof', slate, 0, height + .42, 0, width, .84, depth);
      block('#a69985', width * .27, height + .95, -.3, .46, .78, .51);
    }
  }

  const house = { x: 0, z: -9.7, width: 7.7, depth: 6.5, height: 9.65 };
  const { x, z, width, depth, height } = house;
  const wallZ = z - depth / 2 + .48, floor = height + .11;
  box('#766755', 0, -.77, .25, 40, 1.35, 33.4);
  box('#5a615c', 0, -.08, .25, 39.9, .18, 33.3);
  box('#d0c4ae', 0, .085, -9.75, 38.8, .16, 11.6);
  box('#bdb49d', 0, .10, 4.8, 24.7, .23, 16.4);
  box('#57734b', 0, .23, 4.8, 24.25, .08, 15.9);
  box('#c1af88', 0, .29, 4.8, .98, .04, 15.85);
  box('#c1af88', 0, .29, 4.8, 24.15, .04, .94);
  box('#c1af88', 0, .29, 4.8, 2.85, .045, 2.85);
  column('#aaa38f', 0, .45, 4.8, 1.9, .28, 1.9);
  column('#6e8885', 0, .60, 4.8, 1.65, .04, 1.65);
  column('#b4ab96', 0, .82, 4.8, .22, .45, .22);
  column('#b4ab96', 0, 1.04, 4.8, .65, .11, .65);
  for (const side of [-1, 1]) {
    railing(side * 12.22, .25, 4.8, 16.12, Math.PI / 2);
    for (const edge of [-3.28, 12.88]) railing(side * 6.52, .25, edge, 11.39);
    for (let i = 0; i < 3; i++) {
      const nearX = side * (6.2 + i * 4.5);
      terrace(nearX, -9.7, 4.4, 5.2, 5.65 + (2 - i) * .32, 0, false, i % 2 ? '#cabcaa' : stone);
      terrace(side * 16.65, 1.1 + i * 4.44, 4.35, 4.45, 4.6 + i * .25, -side * Math.PI / 2);
    }
    box('#cec1a8', side * 16.7, .09, 5.8, 6.4, .16, 17.1);
    railing(side * 3.2, .15, -5.08, 2.5);
    for (const zz of [-1.4, 10.6]) {
      for (const xx of [3.1, 8.0, 10.55]) tree(xx * side, zz, (xx === 3.1 ? .74 : 1.08));
    }
    for (const zz of [2.4, 7.3]) tree(side * 11.18, zz, .86);
    for (const zz of [2.45, 7.15]) {
      const xx = side * 4.05;
      box(wood, xx, .63, zz, 1.40, .10, .42);
      box(wood, xx, .89, zz + .18, 1.40, .30, .07);
      for (const leg of [-.52, .52]) box(iron, xx + leg, .45, zz, .08, .36, .34);
    }
    for (const zz of [-4.3, 13.6]) {
      column(iron, side * 8.25, .9, zz, .09, 1.8, .09);
      box('#ccb681', side * 8.25, 1.96, zz, .23, .36, .23);
      roof(side * 8.25, 2.2, zz, .32, .18, .32);
    }
  }
  function tree(x, z, s) {
    column('#67513f', x, .97 * s, z, .24 * s, 1.95 * s, .24 * s);
    for (const [dx, dy, dz, size, color] of [
      [0, 2.45, 0, 2.65, '#506a42'], [-.57, 2.15, .22, 1.8, '#5e7949'],
      [.63, 2.24, .29, 1.8, '#6d8250'], [.04, 3.22, -.26, 1.8, '#718550'],
    ]) shape('crown', color, x + dx * s, .20 + dy * s, z + dz * s, size * s, size * s, size * s);
  }

  terrace(x, z, width, depth, height, 0, true);
  box(wood, x, floor, z - .05, width - .42, .20, depth - .40);
  for (let i = -7; i <= 7; i++) box(i % 2 ? '#996c48' : '#916041', i * .47, floor + .105, z - .05, .455, .025, depth - .42);
  box('#314c3b', x, floor + 1.35, wallZ, width - .40, 2.70, .29);
  box('#314c3b', x - width / 2 + .28, floor + 1.35, z - .97, .30, 2.70, 3.86);
  box(trim, x, floor + 2.74, wallZ, width - .26, .18, .42);
  box(trim, x - width / 2 + .28, floor + 2.74, z - .97, .44, .18, 3.93);
  box(stone, x, floor + .28, z + depth / 2 - .24, width - .34, .41, .18);
  box(stone, x + width / 2 - .26, floor + .28, z, .18, .41, depth - .36);
  roof(x - 2.36, floor + 3.06, z - 1.98, 3.04, .57, 2.06);
  for (const u of [-1.34, 0, 1.34]) {
    shape('arch', '#c4b58a', u + .56, floor + 1.62, wallZ + .18, .84, 1.45, .10);
    shape('arch', '#759191', u + .56, floor + 1.62, wallZ + .24, .67, 1.28, .06);
    box('#e1d0a6', u + .56, floor + 1.50, wallZ + .28, .69, .045, .05);
  }
  box('#8d5342', .40, floor + .129, z + .55, 3.65, .027, 3.33);
  box('#b98458', .40, floor + .145, z + .55, 3.41, .024, 3.10);
  box('#794e35', .40, floor + .160, z + .55, 3.27, .020, 2.96);
  const deskZ = z - .83;
  box('#8d5c3a', .49, floor + 1.02, deskZ, 3.06, .16, 1.37);
  for (const xx of [-.84, 1.82]) for (const zz of [-.53, .53]) {
    box(wood, xx, floor + .58, deskZ + zz, .125, .87, .125);
  }
  box('#cdbd9f', .38, floor + 1.52, deskZ - .22, .94, .80, .62);
  box('#273c31', .38, floor + 1.55, deskZ + .105, .72, .51, .045);
  for (let i = 0; i < 3; i++) box('#9aa978', .27 - i * .035, floor + 1.62 - i * .086, deskZ + .134, .27 - i * .07, .018, .013);
  box('#cdbd9f', .38, floor + 1.135, deskZ + .43, .82, .07, .27);
  column('#b89457', 1.58, floor + 1.18, deskZ - .18, .34, .10, .34);
  column('#b89457', 1.58, floor + 1.49, deskZ - .18, .08, .62, .08);
  column('#e7c674', 1.58, floor + 1.88, deskZ - .18, .51, .28, .51);
  box('#304f42', .58, floor + .66, deskZ + 1.31, .82, .15, .80);
  box('#304f42', .58, floor + 1.01, deskZ + 1.66, .84, .74, .11);
  column(iron, .58, floor + .36, deskZ + 1.31, .14, .41, .14);
  column(iron, .58, floor + .15, deskZ + 1.31, .64, .09, .64);
  const shelfZ = z - 1.25;
  box(wood, -2.63, floor + 1.19, shelfZ, .51, 2.08, 1.53);
  for (const h of [.52, 1.13, 1.75]) {
    box('#b78354', -2.33, floor + h, shelfZ, .29, .08, 1.52);
    for (let i = 0; i < 6; i++) box(['#c7925c', '#9d624c', '#a8a371'][i % 3], -2.31, floor + h + .24, shelfZ - .55 + i * .18, .22, .38, .13);
  }

  for (const { type, color, transforms } of batches.values()) {
    const material = new THREE.MeshStandardMaterial({ color, roughness: .88 });
    const mesh = new THREE.InstancedMesh(geometries[type], material, transforms.length);
    transforms.forEach((matrix, i) => mesh.setMatrixAt(i, matrix));
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
  }
  const glow = new THREE.PointLight('#ffd18c', 22, 7);
  glow.position.set(1.58, floor + 1.86, deskZ - .02);
  scene.add(glow);

  return {
    desk: new THREE.Vector3(.47, floor + 1.22, deskZ),
    marker: new THREE.Vector3(.47, floor + 3.40, deskZ),
  };
}

function archGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(-.5, -.5);
  shape.lineTo(.5, -.5);
  shape.lineTo(.5, .17);
  shape.bezierCurveTo(.5, .61, -.5, .61, -.5, .17);
  shape.closePath();
  return new THREE.ExtrudeGeometry(shape, { depth: .5, bevelEnabled: false, curveSegments: 10 });
}
