import * as THREE from 'three';

export function createCat({ scene, sphere, material }) {
  const root = new THREE.Group();
  root.scale.setScalar(.7);
  scene.add(root);
  const coat = '#ca925e';
  const cream = '#f3e5cd';
  const stripe = '#805337';
  function marking(points, radius, parent) {
    const curve = new THREE.CatmullRomCurve3(points);
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 20, radius, 5, false), material(stripe));
    parent.add(mesh);
  }
  const body = sphere(-.02, .35, 0, .29, .18, .145, coat, root);
  sphere(.1, .32, 0, .14, .14, .14, cream, root);
  for (const x of [-.2, -.09, .025]) {
    const radius = Math.sqrt(1 - ((x + .02) / .29) ** 2);
    marking(Array.from({ length: 9 }, (_, index) => {
      const angle = -1.9 + index * 3.8 / 8;
      return new THREE.Vector3(x, .35 + .183 * radius * Math.cos(angle), .15 * radius * Math.sin(angle));
    }), .014, root);
  }
  const head = new THREE.Group();
  head.position.set(.22, .5, 0);
  root.add(head);
  sphere(0, 0, 0, .18, .18, .17, coat, head);
  for (const z of [-.115, .115]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(.095, .2, 3), material(coat));
    ear.position.set(-.035, .18, z);
    head.add(ear);
    const inner = new THREE.Mesh(new THREE.ConeGeometry(.055, .13, 3), material('#d69b99'));
    inner.position.set(-.005, .19, z);
    head.add(inner);
    const eyeZ = Math.sign(z) * .105;
    sphere(.135, .035, eyeZ, .047, .058, .042, '#4d6650', head);
    sphere(.17, .035, eyeZ, .023, .043, .03, '#222e28', head);
    sphere(.187, .055, eyeZ + .008, .012, .015, .012, '#fff3d8', head);
    sphere(.15, -.055, Math.sign(z) * .045, .065, .052, .06, cream, head);
    for (const offset of [-.02, .015]) {
      const points = [new THREE.Vector3(.175, -.065, Math.sign(z) * .07), new THREE.Vector3(.18, -.045 + offset, Math.sign(z) * .25)];
      head.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({ color: '#e5cdb0' })));
    }
  }
  sphere(.2, -.035, 0, .023, .018, .026, '#bd8480', head);
  marking([[-.09, .1], [-.05, .145], [0, .105], [.05, .145], [.09, .1]].map(([z, y]) => new THREE.Vector3(.11, y, z)), .012, head);
  for (const side of [-1, 1]) for (const y of [-.005, -.055]) {
    marking([new THREE.Vector3(-.06, y, side * .16), new THREE.Vector3(0, y - .015, side * .17), new THREE.Vector3(.045, y - .035, side * .155)], .009, head);
  }
  const legs = [];
  for (const x of [-.2, .18]) for (const z of [-.105, .105]) {
    const leg = new THREE.Group();
    leg.position.set(x, .3, z);
    root.add(leg);
    sphere(0, -.115, 0, .045, .135, .045, coat, leg);
    for (const y of [-.09, -.15]) {
      const band = new THREE.Mesh(new THREE.TorusGeometry(.045, .009, 5, 12), material(stripe));
      band.rotation.x = Math.PI / 2;
      band.position.y = y;
      leg.add(band);
    }
    sphere(.025, -.245, 0, .07, .045, .06, cream, leg);
    legs.push(leg);
  }
  const tail = new THREE.Group();
  tail.position.set(-.28, .39, 0);
  root.add(tail);
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0), new THREE.Vector3(-.2, .2, 0),
    new THREE.Vector3(-.24, .45, 0), new THREE.Vector3(-.12, .53, 0),
  ]);
  tail.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 12, .04, 6, false), material(coat)));
  for (const t of [.22, .42, .62, .82, .96]) {
    const band = new THREE.Mesh(new THREE.TorusGeometry(.04, .01, 5, 12), material(stripe));
    band.position.copy(curve.getPoint(t));
    band.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), curve.getTangent(t).normalize());
    tail.add(band);
  }
  root.traverse(mesh => { if (mesh.isMesh) mesh.castShadow = false; });
  const floor = new THREE.Vector3(1.65, .03, 1);
  const route = [
    { action: 'walk', duration: 4, to: [2.7, .03, .85] },
    { action: 'pause', duration: 2 },
    { action: 'groom', duration: 4 },
    { action: 'walk', duration: 5, to: [.85, .03, .05] },
    { action: 'jump-chair', duration: 1.1, to: [0, 1.065, .05], arc: .55 },
    { action: 'sit', duration: 3 },
    { action: 'jump-desk', duration: 1.2, to: [.9, 1.825, -1.25], arc: .55 },
    { action: 'walk-desk', duration: 2, to: [1.5, 1.825, -1.2] },
    { action: 'groom-desk', duration: 4 },
    { action: 'walk-desk', duration: 5, to: [-1.6, 1.825, -1.25] },
    { action: 'jump-bookshelf', duration: 1.7, to: [-3.8, 4.36, -2.9], arc: 1.1 },
    { action: 'sit-bookshelf', duration: 3 },
    { action: 'play-shelf-plant', duration: 4 },
    { action: 'jump-to-desk', duration: 1.7, to: [-1.6, 1.825, -1.25], arc: 1.1 },
    { action: 'walk-desk', duration: 5, to: [1.5, 1.825, -1.2] },
    { action: 'jump-down', duration: 1.3, to: [2.6, .03, .1], arc: 1 },
    { action: 'walk', duration: 3, to: [4.15, .03, -.75] },
    { action: 'play-plant', duration: 4 },
    { action: 'walk', duration: 3, to: [2.6, .03, .1] },
    { action: 'walk', duration: 5, to: floor.toArray() },
  ];
  let actionIndex = 0, elapsed = 0;
  let from = floor.clone();
  root.position.copy(floor);
  function update(delta) {
    elapsed += delta;
    while (elapsed >= route[actionIndex].duration) {
      const step = route[actionIndex];
      elapsed -= step.duration;
      if (step.to) from.fromArray(step.to);
      actionIndex = (actionIndex + 1) % route.length;
    }
    const step = route[actionIndex];
    const t = elapsed / step.duration;
    root.position.copy(from);
    if (step.to) {
      const to = new THREE.Vector3(...step.to);
      root.position.lerp(to, t);
      root.position.y += Math.sin(t * Math.PI) * (step.arc || 0);
      const heading = Math.atan2(-(to.z - from.z), to.x - from.x);
      root.rotation.y += Math.atan2(Math.sin(heading - root.rotation.y), Math.cos(heading - root.rotation.y)) * Math.min(delta * 6, 1);
    }
    const walking = step.action.startsWith('walk');
    const grooming = step.action.startsWith('groom');
    const playing = step.action.startsWith('play');
    const jumping = Boolean(step.arc);
    const stride = elapsed * 10;
    legs.forEach((leg, index) => {
      leg.rotation.z = walking ? Math.sin(stride + (index === 0 || index === 3 ? 0 : Math.PI)) * .35 : jumping ? -.5 * Math.sin(t * Math.PI) : 0;
    });
    if (grooming) legs[3].rotation.z = 1.5 + Math.sin(elapsed * 8) * .12;
    if (playing) legs[3].rotation.z = 1.4 + Math.sin(elapsed * 7) * .4;
    head.rotation.z = grooming ? -.35 + Math.sin(elapsed * 8) * .14 : playing ? Math.sin(elapsed * 4) * .1 : walking ? Math.sin(stride) * .025 : 0;
    body.scale.y = .18 * (step.action.startsWith('sit') || grooming ? .87 : 1);
    tail.rotation.x = Math.sin(elapsed * 2) * .2;
    root.userData.action = step.action;
  }
  update(0);
  return { root, update };
}
