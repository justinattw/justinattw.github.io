import * as THREE from 'three';

export function createCat({ scene, sphere, material }) {
  const root = new THREE.Group();
  scene.add(root);
  const coat = '#be8954';
  const cream = '#e8d4af';
  sphere(0, .4, 0, .36, .2, .15, coat, root);
  sphere(.28, .54, 0, .17, .17, .15, coat, root);
  sphere(.4, .49, 0, .095, .065, .1, cream, root);
  sphere(.47, .52, 0, .025, .02, .03, '#80584e', root);
  for (const z of [-.105, .105]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(.075, .17, 3), material(coat));
    ear.position.set(.26, .73, z);
    root.add(ear);
    sphere(.365, .585, z, .023, .034, .018, '#40583a', root);
    sphere(.38, .585, z, .009, .025, .012, '#262b23', root);
  }
  const legs = [];
  for (const x of [-.23, .23]) for (const z of [-.105, .105]) {
    const leg = new THREE.Group();
    leg.position.set(x, .35, z);
    root.add(leg);
    sphere(0, -.13, 0, .055, .16, .055, coat, leg);
    sphere(.025, -.265, 0, .08, .045, .06, cream, leg);
    legs.push(leg);
  }
  const tail = new THREE.Group();
  tail.position.set(-.3, .46, 0);
  root.add(tail);
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0), new THREE.Vector3(-.2, .2, 0),
    new THREE.Vector3(-.24, .45, 0), new THREE.Vector3(-.12, .53, 0),
  ]);
  tail.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 12, .04, 6, false), material(coat)));
  root.traverse(mesh => { if (mesh.isMesh) mesh.castShadow = false; });
  let elapsed = 0;
  function update(delta) {
    elapsed += delta;
    const angle = elapsed * .18 + .5;
    root.position.set(3.2 * Math.sin(angle), .03, .95 + .2 * Math.cos(angle));
    root.rotation.y = Math.atan2(.2 * Math.sin(angle), 3.2 * Math.cos(angle));
    const stride = elapsed * 7;
    legs.forEach((leg, index) => {
      leg.rotation.z = Math.sin(stride + (index === 0 || index === 3 ? 0 : Math.PI)) * .38;
    });
    tail.rotation.x = Math.sin(elapsed * 2) * .2;
  }
  update(0);
  return { root, update };
}
