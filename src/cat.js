import * as THREE from 'three';

export function createCat({ scene, sphere, material }) {
  const root = new THREE.Group();
  root.scale.setScalar(.7);
  scene.add(root);
  const coat = '#969b9d';
  const cream = '#e6e5df';
  const stripe = '#50565c';
  const torso = new THREE.Group();
  torso.name = 'cat-torso';
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
    }), .005, torso);
  }
  const head = new THREE.Group();
  head.name = 'cat-head';
  head.position.set(.22, .5, 0);
  torso.add(head);
  sphere(0, 0, 0, .18, .175, .17, coat, head);
  const earShape = new THREE.Shape();
  earShape.moveTo(-.07, 0);
  earShape.quadraticCurveTo(-.035, .08, -.014, .135);
  earShape.quadraticCurveTo(0, .16, .018, .132);
  earShape.quadraticCurveTo(.065, .065, .07, 0);
  earShape.quadraticCurveTo(0, -.025, -.07, 0);
  const earGeometry = new THREE.ExtrudeGeometry(earShape, {
    depth: .025, bevelEnabled: true, bevelSize: .012, bevelThickness: .012, bevelSegments: 3, steps: 1,
  });
  for (const z of [-.115, .115]) {
    const ear = new THREE.Mesh(earGeometry, material(coat));
    ear.rotation.y = Math.PI / 2;
    ear.position.set(-.025, .115, z);
    head.add(ear);
    const inner = new THREE.Mesh(earGeometry, material('#b79395'));
    inner.rotation.y = Math.PI / 2;
    inner.scale.set(.55, .65, .35);
    inner.position.set(.007, .13, z);
    head.add(inner);
    const side = Math.sign(z);
    const eyeZ = side * .096;
    const eye = sphere(.146, .025, eyeZ, .012, .038, .029, '#3c3830', head);
    eye.rotation.y = -side * .6;
    const pupil = sphere(.155, .026, eyeZ + side * .005, .006, .028, .021, '#17201e', head);
    pupil.rotation.y = -side * .6;
    sphere(.16, .04, eyeZ - side * .003, .005, .009, .006, '#fff4df', head);
    sphere(.132, -.05, side * .038, .052, .044, .05, cream, head);
    for (const offset of [-.02, .015]) {
      const points = [new THREE.Vector3(.162, -.052, side * .065), new THREE.Vector3(.165, -.045 + offset, side * .175)];
      head.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({ color: '#b7b9b4', transparent: true, opacity: .7 })));
    }
  }
  sphere(.177, -.033, 0, .016, .012, .019, '#c48c8e', head);
  const tongue = sphere(.17, -.08, 0, .035, .012, .018, '#cf9492', head);
  for (const z of [-.055, 0, .055]) {
    marking([new THREE.Vector3(-.07, .15, z), new THREE.Vector3(0, .17, z), new THREE.Vector3(.055, .155, z)], .004, head);
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
    sphere(0, -.04, 0, x < 0 ? .09 : .06, .105, x < 0 ? .075 : .055, coat, leg);
    sphere(0, -.055, 0, .043, .085, .042, coat, knee);
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
  tail.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 24, .045, 10, false), material(coat)));
  for (const t of [.22, .42, .62, .82, .96]) {
    const band = new THREE.Mesh(new THREE.TorusGeometry(.045, .003, 5, 16), material(stripe));
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
    { action: 'walk-desk', duration: 1.5, to: [1.65, 1.825, -1.88] },
    { action: 'play-globe', duration: 4, facing: Math.PI / 2 },
    { action: 'walk-desk', duration: 1.5, to: [1.5, 1.825, -1.2] },
    { action: 'walk-desk', duration: 2, to: [-.98, 1.825, -1] },
    { action: 'walk-desk', duration: .8, to: [-.98, 1.825, -1.35] },
    { action: 'drink-water', duration: 5, facing: Math.PI },
    { action: 'walk-desk', duration: .8, to: [-.98, 1.825, -1] },
    { action: 'walk-desk', duration: 2, to: [1.5, 1.825, -1.2] },
    { action: 'jump-down', duration: 1.3, to: [2.6, .03, .1], clearance: .12 },
    { action: 'walk', duration: 4, to: [2.55, .03, -2.6] },
    { action: 'play-plant', duration: 5, facing: Math.atan2(.5, .45) },
    { action: 'walk', duration: 4, to: [2.6, .03, .1] },
    { action: 'walk', duration: 5, to: floor.toArray() },
  ];
  let actionIndex = 0, elapsed = 0;
  let globeTaps = 0;
  let from = floor.clone();
  root.position.copy(floor);
  const tapsAt = time => Math.max(0, Math.floor((time - .5) / 1.2) + 1);
  function update(delta) {
    let previousElapsed = elapsed;
    elapsed += delta;
    while (elapsed >= route[actionIndex].duration) {
      const step = route[actionIndex];
      if (step.action === 'play-globe') globeTaps += tapsAt(step.duration) - tapsAt(previousElapsed);
      elapsed -= step.duration;
      previousElapsed = 0;
      if (step.to) from.fromArray(step.to);
      actionIndex = (actionIndex + 1) % route.length;
    }
    const step = route[actionIndex];
    if (step.action === 'play-globe') globeTaps += tapsAt(elapsed) - tapsAt(previousElapsed);
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
    if (step.facing !== undefined) {
      root.rotation.y += Math.atan2(Math.sin(step.facing - root.rotation.y), Math.cos(step.facing - root.rotation.y)) * Math.min(delta * 6, 1);
    }
    const walking = step.action.startsWith('walk');
    const grooming = step.action.startsWith('groom');
    const playing = step.action.startsWith('play');
    const drinking = step.action === 'drink-water';
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
    if (step.action === 'play-globe') {
      const reach = Math.max(0, Math.sin(elapsed / 1.2 * Math.PI * 2 - Math.PI / 3));
      legs[3].upper.rotation.z = .45 + reach * .8;
      legs[3].knee.rotation.z = -.7 + reach * .65;
      legs[3].ankle.rotation.z = -.1;
    }
    torso.position.y = drinking ? -.025 : -crouch * .07;
    torso.position.x = 0;
    torso.rotation.z = jumping && t >= .2 && t <= .82 ? .16 * Math.cos(flight * Math.PI) : 0;
    if (step.action === 'play-plant') {
      const rise = THREE.MathUtils.smoothstep(elapsed, 0, .7) * (1 - THREE.MathUtils.smoothstep(elapsed, step.duration - .7, step.duration));
      const angle = rise * 1.05;
      torso.rotation.z = angle;
      // Rotate around the hips so the two supporting paws stay on the floor.
      torso.position.set(-.2 + .2 * Math.cos(angle) + .3 * Math.sin(angle), .3 + .2 * Math.sin(angle) - .3 * Math.cos(angle), 0);
      legs.forEach(({ upper, knee, ankle, hind }, index) => {
        const swat = Math.sin(elapsed * 7 + index * Math.PI / 2);
        upper.rotation.z = hind ? -angle : rise * (.3 + swat * .45);
        knee.rotation.z = hind ? 0 : rise * (-.55 + swat * .35);
        ankle.rotation.z = hind ? 0 : rise * .2;
      });
    }
    head.rotation.z = drinking ? -.35 + Math.sin(elapsed * 12) * .04 : grooming ? -.35 + Math.sin(elapsed * 8) * .14 : playing ? Math.sin(elapsed * 4) * .1 : walking ? Math.sin(stride) * .025 : 0;
    tongue.visible = drinking;
    tongue.scale.x = .035 * (.4 + Math.max(0, Math.sin(elapsed * 12)));
    body.scale.y = .18 * (step.action.startsWith('sit') || grooming ? .87 : 1);
    tail.rotation.x = Math.sin(elapsed * 2) * .2;
    root.userData.action = step.action;
    root.userData.globeTaps = globeTaps;
  }
  update(0);
  return { root, update };
}
