import * as THREE from 'three';

export function createWindowPlants({ scene, cylinder, material }) {
  const leaves = [];
  function stem(points, parent = scene) {
    const curve = new THREE.CatmullRomCurve3(points.map(point => new THREE.Vector3(...point)));
    parent.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 8, .018, 5, false), material('#526b3a')));
  }
  function pot(x, z, color, radius, parent = scene) {
    cylinder(x, .27, z, radius * .75, .5, color, parent, radius);
    cylinder(x, .53, z, radius * .88, .025, '#332a1d', parent);
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
  const positions = monsteraGeometry.attributes.position;
  for (let index = 0; index < positions.count; index++) {
    positions.setZ(index, .12 * Math.sin(positions.getY(index) * Math.PI) + .12 * positions.getX(index) ** 2);
  }
  monsteraGeometry.computeVertexNormals();
  const monstera = new THREE.Group();
  monstera.position.set(3, 0, -3.1);
  monstera.scale.setScalar(1.35);
  scene.add(monstera);
  pot(0, 0, '#927354', .38, monstera);
  for (let index = 0; index < 9; index++) {
    const angle = index * 2.4;
    const x = index === 8 ? 0 : Math.cos(angle) * .46;
    const y = index === 8 ? .95 : .8 + (index % 3) * .35;
    const z = index === 8 ? .45 : Math.sin(angle) * .3;
    const sprig = new THREE.Group();
    sprig.position.y = .53;
    monstera.add(sprig);
    stem([[0, 0, 0], [0, y - .65, 0], [x, y - .53, z]], sprig);
    const leaf = new THREE.Mesh(monsteraGeometry, new THREE.MeshStandardMaterial({ color: index % 2 ? '#3d643b' : '#56794a', side: THREE.DoubleSide, roughness: .7 }));
    leaf.position.set(x, y - .53, z);
    leaf.scale.setScalar(.58 + (index % 2) * .12);
    leaf.rotation.set(-.2, Math.cos(angle) * .6, Math.cos(angle) * .65);
    if (index === 8) leaf.rotation.set(-.1, 0, 2.6);
    sprig.add(leaf);
    leaves.push({ leaf, sprig, angle: leaf.rotation.z });
  }
  const bamboo = new THREE.Group();
  bamboo.position.set(-2.8, 0, -2.6);
  bamboo.scale.y = 1.3;
  scene.add(bamboo);
  pot(0, 0, '#6d7762', .32, bamboo);
  const bambooLeaf = new THREE.Shape();
  bambooLeaf.moveTo(0, 0);
  bambooLeaf.quadraticCurveTo(.1, .2, .5, .23);
  bambooLeaf.quadraticCurveTo(.23, -.015, 0, 0);
  const bambooGeometry = new THREE.ShapeGeometry(bambooLeaf);
  const bambooMaterial = new THREE.MeshStandardMaterial({ color: '#567644', roughness: .7, side: THREE.DoubleSide });
  for (let stalk = 0; stalk < 5; stalk++) {
    const x = Math.cos(stalk * 2.4) * .16, z = Math.sin(stalk * 2.4) * .16;
    const height = 1.65 + (stalk % 3) * .28;
    cylinder(x, .53 + height / 2, z, .025, height, '#809052', bamboo);
    for (let y = .8; y < height + .5; y += .3) {
      cylinder(x, y, z, .032, .025, '#b2b77a', bamboo);
      if (y < 1.05) continue;
      for (const side of [-1, 1]) {
        const leaf = new THREE.Mesh(bambooGeometry, bambooMaterial);
        leaf.position.set(x, y, z);
        leaf.rotation.set(-.2, stalk * 1.2, side > 0 ? -.25 : Math.PI + .25);
        bamboo.add(leaf);
      }
    }
  }
  pot(8.35, -3.3, '#758073', .43);
  const banana = new THREE.Shape();
  banana.moveTo(0, 0);
  banana.bezierCurveTo(-.32, .25, -.4, 1.15, 0, 1.65);
  banana.bezierCurveTo(.4, 1.15, .32, .25, 0, 0);
  const bananaGeometry = new THREE.ShapeGeometry(banana);
  for (let index = 0; index < 6; index++) {
    const angle = index * 2.4;
    const x = 8.35 + Math.cos(angle) * .35;
    const y = .85 + (index % 3) * .32;
    const z = -3.3 + Math.sin(angle) * .3;
    stem([[8.35, .53, -3.3], [8.35, y, -3.3], [x, y + .12, z]]);
    const leaf = new THREE.Mesh(bananaGeometry, new THREE.MeshStandardMaterial({ color: index % 2 ? '#476944' : '#698449', side: THREE.DoubleSide, roughness: .75 }));
    leaf.position.set(x, y, z);
    leaf.rotation.set(-.2, Math.sin(angle) * .8, Math.cos(angle) * .45);
    leaf.scale.setScalar(.7 + (index % 2) * .2);
    scene.add(leaf);
  }
  let ruffle = 0;
  return {
    monstera,
    bamboo,
    update(time, playing) {
      ruffle = playing ? 1 : ruffle * .88;
      leaves.forEach(({ leaf, sprig, angle }, index) => {
        leaf.rotation.z = angle + Math.sin(time * 11 + index) * .16 * ruffle;
        sprig.rotation.z = Math.sin(time * 7 + index * .8) * .07 * ruffle;
        sprig.rotation.x = Math.sin(time * 9 + index) * .08 * ruffle;
      });
    },
  };
}
