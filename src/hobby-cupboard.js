import * as THREE from 'three';

export function createHobbyCupboard({ root, box, sphere, cylinder, surface, walnut, brass }) {
  root.position.set(3.35, 0, -2.85);
  box(0, 1.08, -.25, 2.2, 1.92, .08, walnut, root);
  for (const x of [-1.12, 1.12]) box(x, 1.08, 0, .1, 1.92, .72, walnut, root);
  for (const y of [.12, .75, 1.38, 2.02]) box(0, y, 0, 2.34, .09, .78, walnut, root);
  for (const x of [-.96, .96]) box(x, .06, 0, .15, .12, .58, walnut, root);
  box(0, 1.08, 0, .065, 1.85, .65, walnut, root);

  function plaque(text, x, y, width = .86, height = .12, parent = root) {
    const texture = surface((ctx, w, h) => {
      ctx.fillStyle = '#d9c79e'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#3e4635'; ctx.font = '44px Georgia, serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(text, w / 2, h / 2, w - 24);
    }, 512, 96);
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({ map: texture, toneMapped: false }));
    mesh.position.set(x, y, parent === root ? .405 : .12);
    parent.add(mesh);
  }
  const hobbies = ['Crosswords', 'Skiing', 'Football', 'Gym', 'Languages', 'Running'];
  const displays = hobbies.map((name, index) => {
    const x = index % 2 ? .56 : -.56;
    const y = 1.43 - Math.floor(index / 2) * .63;
    plaque(name, x, y + .04);
    const group = new THREE.Group();
    group.position.set(x, y + .3, .13);
    root.add(group);
    return group;
  });

  const crossword = surface((ctx, w, h) => {
    ctx.fillStyle = '#eee3c5'; ctx.fillRect(0, 0, w, h);
    for (let row = 0; row < 7; row++) for (let col = 0; col < 7; col++) {
      const black = (row + col) % 4 === 0;
      ctx.fillStyle = black ? '#3d4338' : '#f5edd8';
      ctx.fillRect(10 + col * 70, 10 + row * 70, 66, 66);
      if (!black) {
        ctx.fillStyle = '#46543b'; ctx.font = '17px Georgia, serif';
        ctx.fillText(String(row * 7 + col + 1), 15 + col * 70, 28 + row * 70);
      }
    }
  });
  const paper = new THREE.Mesh(new THREE.PlaneGeometry(.37, .39), new THREE.MeshBasicMaterial({ map: crossword, toneMapped: false }));
  paper.position.y = .015;
  displays[0].add(paper);
  const pencil = box(.23, 0, .025, .02, .38, .02, '#c49a46', displays[0]);
  pencil.rotation.z = -.18;

  for (const x of [-.1, .1]) {
    const ski = box(x, 0, 0, .06, .46, .045, '#587e80', displays[1]);
    ski.rotation.z = x * 1.1;
    sphere(x, .23, .02, .035, .045, .045, '#587e80', displays[1]);
    box(x, -.03, .04, .07, .08, .045, '#c8bba1', displays[1]);
  }
  sphere(0, .01, 0, .2, .2, .2, '#ede4cf', displays[2]);
  for (const [x, y] of [[0, 0], [-.12, .1], [.12, .1], [-.1, -.13], [.1, -.13]]) {
    sphere(x, y + .01, .17, .05, .05, .025, '#353d35', displays[2]);
  }
  const bar = cylinder(0, 0, 0, .025, .42, brass, displays[3]);
  bar.rotation.z = Math.PI / 2;
  for (const x of [-.17, -.12, .12, .17]) {
    const weight = cylinder(x, 0, 0, .12, .045, '#434b48', displays[3], .12, 12);
    weight.rotation.z = Math.PI / 2;
  }
  for (const [index, title] of ['ABC', 'Hola', 'Bonjour'].entries()) {
    const x = (index - 1) * .17;
    box(x, 0, 0, .14, .37 - index * .035, .2, ['#6b4c39', '#4b6557', '#65707e'][index], displays[4]);
    plaque(title, x, .03, .12, .055, displays[4]);
  }
  for (const [index, z] of [-.06, .09].entries()) {
    const x = index ? .04 : -.08;
    sphere(x, -.075, z, .2, .035, .09, '#e2d4b8', displays[5]);
    sphere(x - .025, -.02, z, .17, .075, .085, '#885740', displays[5]);
    sphere(x - .12, .025, z, .065, .085, .075, '#885740', displays[5]);
    for (let lace = 0; lace < 3; lace++) box(x - .055 + lace * .04, .045, z, .012, .012, .11, '#e2d4b8', displays[5]);
  }

  const doors = [-1, 1].map(side => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 1.1, 1.08, .43);
    root.add(pivot);
    box(-side * .55, 0, 0, 1.08, 1.8, .065, walnut, pivot);
    box(-side * .55, 0, .04, .88, 1.58, .025, '#29392c', pivot);
    sphere(-side * .96, 0, .09, .035, .035, .035, brass, pivot);
    return pivot;
  });
  let openness = 0;
  function update(delta, open, reduced) {
    const target = open ? 1 : 0;
    openness = reduced ? target : THREE.MathUtils.clamp(openness + Math.sign(target - openness) * delta * 1.5, 0, 1);
    doors.forEach((door, index) => { door.rotation.y = (index ? 1 : -1) * openness * Math.PI * .58; });
    return openness !== target;
  }
  return { update, get openness() { return openness; } };
}
