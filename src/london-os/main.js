import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildLondon } from './model.js';

const canvas = document.querySelector('#london-view');
const status = document.querySelector('#status');
const panel = document.querySelector('.controls');
let controls;
function unavailable(error) {
  console.error('London OS miniature unavailable:', error);
  status.textContent = 'The miniature could not render. Reload with WebGL enabled to try again.';
  status.hidden = false;
  panel.hidden = true;
  if (controls) controls.enabled = false;
}
try { start(); } catch (error) { unavailable(error); }

function start() {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#34443d');
  scene.add(new THREE.HemisphereLight('#fff0d5', '#63766a', 2.7));
  const sun = new THREE.DirectionalLight('#ffdfaa', 2.5);
  sun.position.set(-35, 75, 35);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -85, right: 85, top: 85, bottom: -85, near: .1, far: 180 });
  sun.shadow.normalBias = .06;
  scene.add(sun);
  const model = buildLondon(scene);
  const camera = new THREE.PerspectiveCamera(36, 1, .1, 750);
  controls = new OrbitControls(camera, canvas);
  controls.enablePan = false;
  controls.minPolarAngle = Math.PI * .07;
  controls.maxPolarAngle = Math.PI * .465;
  controls.minDistance = 7;
  controls.maxDistance = 440;
  controls.rotateSpeed = .65;
  let view = 'city', distance = 155, frame = 0, lost = false;
  const homeDirection = new THREE.Vector3(.26, .95, 1).normalize();
  function render() {
    frame = 0;
    if (lost) return;
    for (const label of model.labels) label.visible = camera.position.distanceTo(controls.target) > 55;
    renderer.render(scene, camera);
    canvas.dataset.orbit = camera.position.toArray().map(n => n.toFixed(3)).join(',');
    canvas.dataset.view = view;
    canvas.dataset.features = model.featureCount;
  }
  function home() {
    view = 'city';
    controls.target.set(0, 0, 0);
    camera.position.copy(homeDirection).multiplyScalar(distance);
    controls.update(); render();
  }
  function studio() {
    view = 'workspace';
    controls.target.copy(model.desk);
    camera.position.copy(new THREE.Vector3(.2, .57, 1).normalize())
      .multiplyScalar(Math.max(8, 7 / camera.aspect)).add(controls.target);
    controls.update(); render();
  }
  controls.addEventListener('change', () => {
    if (!frame) frame = requestAnimationFrame(render);
  });
  function resize() {
    if (lost) return;
    const width = canvas.clientWidth, height = canvas.clientHeight;
    if (!width || !height) return;
    const previous = distance;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    const right = new THREE.Vector3().crossVectors(camera.up, homeDirection).normalize();
    const up = new THREE.Vector3().crossVectors(homeDirection, right).normalize();
    const tangent = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    distance = 0;
    for (const x of [-61, 61]) for (const y of [-3.2, 9]) for (const z of [-44, 44]) {
      const corner = new THREE.Vector3(x, y, z);
      distance = Math.max(distance,
        Math.abs(corner.dot(right)) / (tangent * camera.aspect) + corner.dot(homeDirection),
        Math.abs(corner.dot(up)) / tangent + corner.dot(homeDirection));
    }
    distance *= 1.08;
    if (!canvas.dataset.view) home();
    else if (view === 'workspace') studio();
    else {
      camera.position.sub(controls.target).multiplyScalar(distance / previous).add(controls.target);
      controls.update(); render();
    }
  }
  panel.addEventListener('click', event => {
    const action = event.target.closest('button')?.dataset.action;
    if (!action || lost) return;
    if (action === 'reset') return home();
    if (action === 'workspace') return studio();
    const offset = camera.position.clone().sub(controls.target);
    if (action === 'left' || action === 'right') offset.applyAxisAngle(camera.up, (action === 'left' ? -1 : 1) * Math.PI / 6);
    else offset.multiplyScalar(action === 'in' ? .8 : 1.25).clampLength(controls.minDistance, controls.maxDistance);
    camera.position.copy(controls.target).add(offset);
    controls.update(); render();
  });
  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault(); lost = true;
    unavailable(new Error('WebGL context lost'));
  });
  resize();
  new ResizeObserver(resize).observe(canvas);
  renderer.shadowMap.needsUpdate = true;
  render();
  status.hidden = true;
  panel.hidden = false;
}
