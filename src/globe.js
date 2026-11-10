import * as THREE from 'three';

export function createGlobe({ scene, cylinder, surface, walnut, brass }) {
  const root = new THREE.Group();
  root.position.set(1.7, 1.8, -2.4);
  scene.add(root);
  cylinder(0, .025, 0, .23, .05, walnut, root);
  cylinder(0, .09, 0, .045, .12, brass, root);
  const axis = new THREE.Group();
  axis.position.y = .4;
  axis.rotation.z = -.3;
  root.add(axis);
  const meridian = new THREE.Mesh(new THREE.TorusGeometry(.285, .012, 8, 48), brass);
  axis.add(meridian);
  const texture = surface((ctx, width, height) => {
    ctx.fillStyle = '#637f7d';
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = '#a8b79c';
    ctx.lineWidth = 1;
    for (let x = 0; x <= width; x += width / 12) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
    }
    for (let y = height / 6; y < height; y += height / 6) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
    }
    ctx.fillStyle = '#c2b27b';
    const continents = [
      [[.08, .2], [.18, .12], [.29, .2], [.25, .36], [.2, .43], [.18, .55], [.13, .39]],
      [[.23, .52], [.31, .56], [.34, .68], [.27, .88], [.24, .73]],
      [[.44, .27], [.49, .19], [.56, .28], [.54, .38], [.48, .36]],
      [[.46, .4], [.56, .39], [.6, .54], [.54, .75], [.49, .65]],
      [[.56, .23], [.68, .14], [.86, .23], [.91, .36], [.81, .46], [.73, .4], [.68, .57], [.61, .4]],
      [[.79, .67], [.87, .63], [.91, .76], [.83, .8]],
    ];
    for (const points of continents) {
      ctx.beginPath();
      points.forEach(([x, y], index) => ctx[index ? 'lineTo' : 'moveTo'](x * width, y * height));
      ctx.closePath();
      ctx.fill();
    }
  }, 512, 256);
  const earth = new THREE.Mesh(
    new THREE.SphereGeometry(.25, 32, 24),
    new THREE.MeshStandardMaterial({ map: texture, roughness: .65 }),
  );
  axis.add(earth);
  let speed = 0;
  let previousTaps = 0;
  return {
    root,
    earth,
    update(delta, taps) {
      if (delta <= 0) return;
      if (taps > previousTaps) speed += (taps - previousTaps) * 2;
      previousTaps = taps;
      const decay = Math.exp(-1.3 * delta);
      earth.rotation.y += speed * (1 - decay) / 1.3;
      speed *= decay;
    },
  };
}
