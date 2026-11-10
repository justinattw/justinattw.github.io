import { test, expect } from '@playwright/test';
import * as THREE from 'three';
import { createCat } from '../src/cat.js';

test('cat routine includes grooming, rests and jumps landing on furniture', () => {
  const scene = new THREE.Scene();
  const cat = createCat({
    scene,
    sphere(x, y, z, sx, sy, sz, color, parent) {
      const object = new THREE.Object3D();
      object.position.set(x, y, z);
      parent.add(object);
      return object;
    },
    material: color => new THREE.MeshBasicMaterial({ color }),
  });
  const actions = new Set();
  let chair = false, desk = false, airborne = false;
  for (let frame = 0; frame < 2400; frame++) {
    cat.update(1 / 30);
    actions.add(cat.root.userData.action);
    if (cat.root.userData.action === 'sit') chair ||= Math.abs(cat.root.position.y - 1.065) < .001;
    if (cat.root.userData.action === 'groom-desk') desk ||= Math.abs(cat.root.position.y - 1.825) < .001;
    airborne ||= cat.root.userData.action === 'jump-desk' && cat.root.position.y > 1.9;
  }
  expect([...actions]).toEqual(expect.arrayContaining(['walk', 'pause', 'groom', 'jump-chair', 'sit', 'jump-desk', 'walk-desk', 'groom-desk', 'play-plant', 'jump-down']));
  expect([...actions].some(action => action.includes('shelf'))).toBe(false);
  expect(chair && desk && airborne).toBe(true);
  expect(cat.root.scale.x).toBe(.7);
  const joints = [];
  cat.root.traverse(node => { if (['hip', 'shoulder', 'knee', 'elbow', 'paw'].includes(node.name)) joints.push(node); });
  expect(joints).toHaveLength(12);
});
