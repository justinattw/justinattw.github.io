import * as THREE from 'three';

export function createWindowPlants({ scene, cylinder, material }) {
  const leaves = [];
  function stem(points) {
    const curve = new THREE.CatmullRomCurve3(points.map(point => new THREE.Vector3(...point)));
    scene.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 8, .018, 5, false), material('#526b3a')));
  }
  function pot(x, z, color, radius) {
    cylinder(x, .27, z, radius * .75, .5, color, scene, radius);
    cylinder(x, .53, z, radius * .88, .025, '#332a1d');
  }
  const splitLeaf = new THREE.Shape();
  splitLeaf.moveTo(0, 0);
  splitLeaf.bezierCurveTo(-.25, -.07, -.5, .04, -.48, .24);
  splitLeaf.lineTo(-.18, .24);
  splitLeaf.lineTo(-.49, .38);
  splitLeaf.quadraticCurveTo(-.53, .49, -.44, .57);
  splitLeaf.lineTo(-.12, .43);
  splitLeaf.lineTo(-.35, .73);
  splitLeaf.quadraticCurveTo(-.2, .92, 0, 1.05);
  splitLeaf.quadraticCurveTo(.2, .92, .35, .73);
  splitLeaf.lineTo(.12, .43);
  splitLeaf.lineTo(.44, .57);
  splitLeaf.quadraticCurveTo(.53, .49, .49, .38);
  splitLeaf.lineTo(.18, .24);
  splitLeaf.lineTo(.48, .24);
  splitLeaf.bezierCurveTo(.5, .04, .25, -.07, 0, 0);
  for (const x of [-.11, .11]) {
    const hole = new THREE.Path();
    hole.absellipse(x, .16, .035, .06, 0, Math.PI * 2, true);
    splitLeaf.holes.push(hole);
  }
  const monsteraGeometry = new THREE.ShapeGeometry(splitLeaf);
  pot(4.95, -1.05, '#927354', .38);
  for (let index = 0; index < 7; index++) {
    const angle = index * 2.4;
    const x = 4.95 + Math.cos(angle) * .46;
    const y = .76 + (index % 3) * .3;
    const z = -1.05 + Math.sin(angle) * .3;
    stem([[4.95, .53, -1.05], [4.95, y - .12, -1.05], [x, y, z]]);
    const leaf = new THREE.Mesh(monsteraGeometry, new THREE.MeshStandardMaterial({ color: index % 2 ? '#3d643b' : '#56794a', side: THREE.DoubleSide, roughness: .7 }));
    leaf.position.set(x, y, z);
    leaf.scale.setScalar(.58 + (index % 2) * .12);
    leaf.rotation.set(-.2, Math.cos(angle) * .6, Math.cos(angle) * .65);
    scene.add(leaf);
    leaves.push({ leaf, angle: leaf.rotation.z });
  }
  pot(5.55, -2.6, '#758073', .43);
  const banana = new THREE.Shape();
  banana.moveTo(0, 0);
  banana.bezierCurveTo(-.32, .25, -.4, 1.15, 0, 1.65);
  banana.bezierCurveTo(.4, 1.15, .32, .25, 0, 0);
  const bananaGeometry = new THREE.ShapeGeometry(banana);
  for (let index = 0; index < 6; index++) {
    const angle = index * 2.4;
    const x = 5.55 + Math.cos(angle) * .35;
    const y = .85 + (index % 3) * .32;
    const z = -2.6 + Math.sin(angle) * .3;
    stem([[5.55, .53, -2.6], [5.55, y, -2.6], [x, y + .12, z]]);
    const leaf = new THREE.Mesh(bananaGeometry, new THREE.MeshStandardMaterial({ color: index % 2 ? '#476944' : '#698449', side: THREE.DoubleSide, roughness: .75 }));
    leaf.position.set(x, y, z);
    leaf.rotation.set(-.2, Math.sin(angle) * .8, Math.cos(angle) * .45);
    leaf.scale.setScalar(.7 + (index % 2) * .2);
    scene.add(leaf);
  }
  return {
    update(time, playing) {
      leaves.forEach(({ leaf, angle }, index) => {
        leaf.rotation.z = angle + (playing ? Math.sin(time * 9 + index) * .06 : 0);
      });
    },
  };
}
