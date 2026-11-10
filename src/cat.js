import * as THREE from 'three';

export function createCat({ scene, sphere, material }) {
  const root = new THREE.Group();
  root.scale.setScalar(.7);
  scene.add(root);
  const coat = '#969b9d';
  const cream = '#e6e5df';
  const stripe = '#50565c';
  const torso = new THREE.Group();
  root.add(torso);
  function marking(points, radius, parent) {
    const curve = new THREE.CatmullRomCurve3(points);
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 20, radius, 5, false), material(stripe));
    parent.add(mesh);
  }
  const body = sphere(-.02, .35, 0, .29, .18, .145, coat, torso);
  sphere(.1, .32, 0, .14, .14, .14, cream, torso);
  for (const x of [-.2, -.09, .025]) {
    const radius = Math.sqrt(1 - ((x + .02) / .29) ** 2);
    marking(Array.from({ length: 9 }, (_, index) => {
      const angle = -1.9 + index * 3.8 / 8;
      return new THREE.Vector3(x, .35 + .183 * radius * Math.cos(angle), .15 * radius * Math.sin(angle));
    }), .014, torso);
  }
  const head = new THREE.Group();
  head.position.set(.22, .5, 0);
  torso.add(head);
  sphere(0, 0, 0, .18, .18, .17, coat, head);
  for (const z of [-.115, .115]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(.095, .2, 3), material(coat));
    ear.position.set(-.035, .18, z);
    head.add(ear);
    const inner = new THREE.Mesh(new THREE.ConeGeometry(.055, .13, 3), material('#d69b99'));
    inner.position.set(-.005, .19, z);
    head.add(inner);
    const eyeZ = Math.sign(z) * .105;
    sphere(.127, .035, eyeZ, .025, .031, .021, '#78896d', head);
    sphere(.145, .035, eyeZ, .009, .023, .014, '#222e28', head);
    sphere(.15, .046, eyeZ, .006, .008, .007, '#fff3d8', head);
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
    torso.add(leg);
    leg.name = x < 0 ? 'hip' : 'shoulder';
    const knee = new THREE.Group();
    knee.name = x < 0 ? 'knee' : 'elbow';
    knee.position.y = -.12;
    leg.add(knee);
    const ankle = new THREE.Group();
    ankle.name = 'paw';
    ankle.position.y = -.12;
    knee.add(ankle);
    sphere(0, -.06, 0, .047, .08, .045, coat, leg);
    sphere(0, -.06, 0, .035, .075, .035, coat, knee);
    for (const y of [-.04, -.08]) {
      const band = new THREE.Mesh(new THREE.TorusGeometry(.045, .009, 5, 12), material(stripe));
      band.rotation.x = Math.PI / 2;
      band.position.y = y;
      knee.add(band);
    }
    sphere(.025, -.005, 0, .07, .045, .06, cream, ankle);
    legs.push({ upper: leg, knee, ankle, hind: x < 0 });
  }
  const tail = new THREE.Group();
  tail.position.set(-.28, .39, 0);
  torso.add(tail);
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
    { action: 'jump-chair', duration: 1.25, to: [0, 1.065, .05], clearance: .12 },
    { action: 'sit', duration: 3 },
    { action: 'jump-desk', duration: 1.35, to: [.9, 1.825, -1.25], clearance: .14 },
    { action: 'walk-desk', duration: 2, to: [1.5, 1.825, -1.2] },
    { action: 'groom-desk', duration: 4 },
    { action: 'jump-down', duration: 1.3, to: [2.6, .03, .1], clearance: .12 },
    { action: 'walk', duration: 4, to: [2.35, .03, -2.5] },
    { action: 'play-plant', duration: 4 },
    { action: 'walk', duration: 4, to: [2.6, .03, .1] },
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
    const jumping = step.clearance !== undefined;
    const flight = THREE.MathUtils.clamp((t - .2) / .62, 0, 1);
    const crouch = jumping ? (t < .2 ? Math.sin(t / .2 * Math.PI / 2) : t > .82 ? Math.sin((t - .82) / .18 * Math.PI) : 0) : 0;
    root.position.copy(from);
    if (step.to) {
      const to = new THREE.Vector3(...step.to);
      root.position.lerp(to, jumping ? flight : t);
      if (jumping) {
        const height = to.y - from.y;
        const apex = Math.max(0, height) + step.clearance;
        const velocity = 2 * apex + 2 * Math.sqrt(apex * (apex - height));
        const gravity = 2 * (velocity - height);
        root.position.y = from.y + velocity * flight - .5 * gravity * flight * flight;
      }
      const heading = Math.atan2(-(to.z - from.z), to.x - from.x);
      root.rotation.y += Math.atan2(Math.sin(heading - root.rotation.y), Math.cos(heading - root.rotation.y)) * Math.min(delta * 6, 1);
    }
    const walking = step.action.startsWith('walk');
    const grooming = step.action.startsWith('groom');
    const playing = step.action.startsWith('play');
    const stride = elapsed * 10;
    legs.forEach(({ upper, knee, ankle, hind }, index) => {
      const phase = stride + (index === 0 || index === 3 ? 0 : Math.PI);
      const fold = jumping ? (t < .2 || t > .82 ? crouch * .85 : Math.sin(flight * Math.PI) * .75) : 0;
      upper.rotation.z = walking ? Math.sin(phase) * .35 : fold * (hind ? -.65 : .55);
      knee.rotation.z = walking ? Math.max(0, Math.cos(phase)) * (hind ? -.55 : .55) : fold * (hind ? 1.2 : -1.1);
      ankle.rotation.z = -(upper.rotation.z + knee.rotation.z) * .75;
    });
    if (grooming || playing) {
      legs[3].upper.rotation.z = 1 + Math.sin(elapsed * 7) * .15;
      legs[3].knee.rotation.z = -.8;
      legs[3].ankle.rotation.z = .4;
    }
    torso.position.y = -crouch * .07;
    torso.rotation.z = jumping && t >= .2 && t <= .82 ? .16 * Math.cos(flight * Math.PI) : 0;
    head.rotation.z = grooming ? -.35 + Math.sin(elapsed * 8) * .14 : playing ? Math.sin(elapsed * 4) * .1 : walking ? Math.sin(stride) * .025 : 0;
    body.scale.y = .18 * (step.action.startsWith('sit') || grooming ? .87 : 1);
    tail.rotation.x = Math.sin(elapsed * 2) * .2;
    root.userData.action = step.action;
  }
  update(0);
  return { root, update };
}
