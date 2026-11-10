import { test, expect } from '@playwright/test';
import * as THREE from 'three';
import { createCat } from '../src/cat.js';
import { createGlobe } from '../src/globe.js';
import { createWindowPlants } from '../src/window-plants.js';

test('cat routine includes grooming, rests and jumps landing on furniture', () => {
  const scene = new THREE.Scene();
  const cat = createCat({
    scene,
    sphere(x, y, z, sx, sy, sz, color, parent) {
      const object = new THREE.Object3D();
      object.position.set(x, y, z);
      object.userData.color = color;
      parent.add(object);
      return object;
    },
    material: color => new THREE.MeshBasicMaterial({ color }),
  });
  const actions = new Set();
  const globe = createGlobe({
    scene,
    cylinder: () => {},
    surface: () => new THREE.Texture(),
    walnut: new THREE.MeshBasicMaterial(),
    brass: new THREE.MeshBasicMaterial(),
  });
  let spun = false;
  let stood = false;
  let chair = false, desk = false, airborne = false;
  let previousAction;
  const activityOrder = [];
  expect(cat.root.userData.action).toBe('groom');
  for (let frame = 0; frame < 2400; frame++) {
    cat.update(1 / 30);
    if (previousAction === 'jump-down' && cat.root.userData.action !== 'jump-down') {
      expect(cat.root.position.y).toBeCloseTo(.03, 3);
      expect(cat.root.position.x).toBe(-2.4);
      expect(cat.root.position.z).toBeCloseTo(-.25, 1);
    }
    if (previousAction !== cat.root.userData.action && ['groom', 'play-globe', 'drink-water', 'play-plant'].includes(cat.root.userData.action)) activityOrder.push(cat.root.userData.action);
    previousAction = cat.root.userData.action;
    if (cat.root.userData.action === 'groom') {
      expect(cat.root.position.toArray()).toEqual([-2.4, .03, -.25]);
    }
    const rotation = globe.earth.rotation.y;
    globe.update(1 / 30, cat.root.userData.globeTaps);
    if (cat.root.userData.action === 'play-globe') {
      spun ||= globe.earth.rotation.y > rotation;
      expect(cat.root.position.toArray()).toEqual([1.65, 1.825, -1.88]);
    }
    if (cat.root.userData.action === 'drink-water') {
      expect(cat.root.position.toArray()).toEqual([-.98, 1.825, -1.35]);
    }
    if (cat.root.userData.action === 'play-plant' && cat.root.getObjectByName('cat-torso').rotation.z > 1) {
      scene.updateMatrixWorld(true);
      const paws = [];
      cat.root.traverse(node => {
        if (node.name === 'paw') paws.push(node.getWorldPosition(new THREE.Vector3()));
      });
      expect(paws[0].y).toBeCloseTo(.078, 3);
      expect(paws[1].y).toBeCloseTo(.078, 3);
      expect(paws[2].y).toBeGreaterThan(.3);
      expect(paws[3].y).toBeGreaterThan(.3);
      stood = true;
    }
    actions.add(cat.root.userData.action);
    if (cat.root.userData.action === 'sit') chair ||= Math.abs(cat.root.position.y - 1.065) < .001;
    if (cat.root.userData.action === 'walk-desk') desk ||= Math.abs(cat.root.position.y - 1.825) < .001;
    airborne ||= cat.root.userData.action === 'jump-desk' && cat.root.position.y > 1.9;
  }
  expect([...actions]).toEqual(expect.arrayContaining(['walk', 'groom', 'jump-chair', 'sit', 'jump-desk', 'walk-desk', 'play-globe', 'drink-water', 'play-plant', 'jump-down']));
  expect(actions.has('groom-desk')).toBe(false);
  expect(activityOrder.slice(0, 5)).toEqual(['groom', 'play-globe', 'drink-water', 'play-plant', 'groom']);
  expect(spun).toBe(true);
  expect(stood).toBe(true);
  expect(globe.root.position.toArray()).toEqual([1.7, 1.8, -2.4]);
  const rotation = globe.earth.rotation.y;
  globe.update(0, cat.root.userData.globeTaps);
  expect(globe.earth.rotation.y).toBe(rotation);
  const taps = cat.root.userData.globeTaps + 1;
  globe.update(.1, taps);
  const firstCoast = globe.earth.rotation.y - rotation;
  expect(firstCoast).toBeGreaterThan(0);
  globe.update(.1, taps);
  expect(globe.earth.rotation.y - rotation - firstCoast).toBeLessThan(firstCoast);
  expect([...actions].some(action => action.includes('shelf'))).toBe(false);
  expect(chair && desk && airborne).toBe(true);
  expect(cat.root.scale.x).toBe(.8);
  const joints = [];
  cat.root.traverse(node => { if (['hip', 'shoulder', 'knee', 'elbow', 'paw'].includes(node.name)) joints.push(node); });
  expect(joints).toHaveLength(12);
  const socks = [];
  cat.root.traverse(node => {
    if (node.userData.color === '#e6e5df') socks.push(node);
    expect(node.geometry?.type).not.toBe('TorusGeometry');
  });
  expect(socks).toHaveLength(4);
  expect(socks.every(node => node.parent.name === 'paw')).toBe(true);
  expect(cat.root.getObjectByName('cat-head').children[0].userData.color).toBe('#202325');
});

test('larger monstera ruffles on contact and settles, with tall bamboo beside the desk', () => {
  const scene = new THREE.Scene();
  const plants = createWindowPlants({
    scene,
    cylinder: () => {},
    material: color => new THREE.MeshBasicMaterial({ color }),
  });
  expect(plants.monstera.scale.x).toBe(1.35);
  expect(plants.bamboo.position.x).toBe(-2.8);
  expect(plants.bamboo.scale.y).toBe(1.3);
  const sprig = plants.monstera.children.find(child => child.isGroup);
  plants.update(1, true);
  expect(Math.abs(sprig.rotation.x)).toBeGreaterThan(.01);
  for (let frame = 0; frame < 120; frame++) plants.update(1 + frame / 30, false);
  expect(Math.abs(sprig.rotation.x)).toBeLessThan(.0001);
});
