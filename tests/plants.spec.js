import { test, expect } from '@playwright/test';
import * as THREE from 'three';
import { createWindowPlants } from '../src/window-plants.js';

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
