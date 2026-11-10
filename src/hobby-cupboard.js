import * as THREE from 'three';

export function createHobbyCupboard({ root, box, sphere, cylinder, surface, walnut, brass }) {
  root.position.set(5.1, 0, -2.85);
  box(0, 2.6, -.35, 2.2, 5, .08, walnut, root);
  for (const x of [-1.12, 1.12]) box(x, 2.6, 0, .1, 5, .92, walnut, root);
  for (const y of [.12, 5.12]) box(0, y, 0, 2.34, .12, 1, walnut, root);
  for (const y of [1.12, 2.12, 3.12, 4.12]) box(-.46, y, 0, 1.24, .09, .92, walnut, root);
  for (const x of [-.96, .96]) box(x, .06, 0, .15, .12, .58, walnut, root);
  box(.2, 2.6, 0, .065, 5, .9, walnut, root);

  const displays = [
    [-.62, 4.38, .08], [.65, 2.1, .05], [-.42, 3.37, .1],
    [-.55, 2.29, .1], [-.48, 1.35, -.04], [-.48, .29, .15],
  ].map(position => {
    const group = new THREE.Group();
    group.position.fromArray(position);
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
  displays[0].rotation.z = -.08;
  displays[2].rotation.y = .3;
  displays[3].rotation.y = -.18;
  displays[5].rotation.y = -.25;

  for (const x of [-.1, .1]) {
    const ski = box(x, 0, 0, .1, 3.8, .065, '#587e80', displays[1]);
    ski.rotation.z = x * .2;
    sphere(x, 1.9, .04, .055, .12, .09, '#587e80', displays[1]);
    box(x, -.25, .07, .12, .4, .09, '#c8bba1', displays[1]);
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
  for (let index = 0; index < 3; index++) {
    const x = (index - 1) * .17;
    box(x, 0, 0, .14, .37 - index * .035, .2, ['#6b4c39', '#4b6557', '#65707e'][index], displays[4]);
    for (const y of [-.1, .1]) box(x, y, .105, .12, .012, .012, brass, displays[4]);
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
    pivot.position.set(side * 1.1, 2.6, .54);
    root.add(pivot);
    box(-side * .55, 0, 0, 1.08, 4.8, .065, walnut, pivot);
    box(-side * .55, 0, .04, .88, 4.55, .025, '#29392c', pivot);
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
