import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildGardens } from './gardens-model.js';

const canvas = document.querySelector('#gardens-view');
const focus = document.querySelector('.gardens-focus');
const status = document.querySelector('#gardens-status');
const orbit = document.querySelector('.gardens-orbit');
const hint = document.querySelector('#gardens-hint');

try {
  start();
} catch (error) {
  unavailable(error);
}

function unavailable(error) {
  console.error('Unable to render Cornwall Gardens:', error);
  status.textContent = 'The 3D view is unavailable. Try reloading with WebGL enabled.';
  status.hidden = false;
  orbit.hidden = focus.hidden = hint.hidden = true;
}

function start() {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.13;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#303c33');
  scene.add(new THREE.HemisphereLight('#fff2d6', '#707965', 2.05));
  const sunlight = new THREE.DirectionalLight('#ffe3b9', 2.15);
  sunlight.position.set(-23, 38, 17);
  sunlight.castShadow = true;
  sunlight.shadow.mapSize.set(1536, 1536);
  Object.assign(sunlight.shadow.camera, { left: -26, right: 26, top: 26, bottom: -26, far: 85 });
  sunlight.shadow.normalBias = .045;
  sunlight.shadow.bias = -.00025;
  scene.add(sunlight);
  const model = buildGardens(scene);
  const baseTarget = new THREE.Vector3(0, 3.5, .7);
  const homeDirection = new THREE.Vector3(.29, .59, 1).normalize();
  const camera = new THREE.PerspectiveCamera(36, 1, .1, 240);
  const controls = new OrbitControls(camera, canvas);
  controls.enablePan = false;
  controls.enableZoom = true;
  controls.minDistance = 5;
  controls.maxDistance = 180;
  controls.minPolarAngle = Math.PI * .16;
  controls.maxPolarAngle = Math.PI * .39;
  controls.rotateSpeed = .75;

  let distance = 0, redraw = 0, lost = false;
  let view = 'gardens';

  function render() {
    if (lost) return;
    renderer.render(scene, camera);
    canvas.dataset.view = view;
    canvas.dataset.orbit = camera.position.toArray().map(value => value.toFixed(3)).join(',');
  }

  function reset() {
    view = 'gardens';
    controls.maxDistance = Math.max(180, distance * 1.5);
    controls.target.copy(baseTarget);
    camera.position.copy(homeDirection).multiplyScalar(distance).add(baseTarget);
    controls.update();
    render();
  }

  function resize() {
    const { clientWidth: width, clientHeight: height } = canvas;
    if (lost || !width || !height) return;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    const nextDistance = Math.max(65, 75 / camera.aspect);
    if (!distance) {
      distance = nextDistance;
      reset();
    } else {
      if (view === 'gardens') camera.position.sub(controls.target).multiplyScalar(nextDistance / distance).add(controls.target);
      distance = nextDistance;
      if (view === 'workspace') frameWorkspace();
      else render();
    }
  }

  controls.addEventListener('change', () => {
    if (redraw) return;
    redraw = requestAnimationFrame(() => {
      redraw = 0;
      render();
    });
  });
  orbit.addEventListener('click', event => {
    const direction = event.target.closest('button')?.dataset.orbit;
    if (!direction || lost) return;
    if (direction === 'reset') {
      reset();
      return;
    }
    camera.position.sub(controls.target).applyAxisAngle(camera.up, direction === 'left' ? -Math.PI / 6 : Math.PI / 6).add(controls.target);
    controls.update();
  });

  function frameWorkspace() {
    if (lost) return;
    view = 'workspace';
    controls.target.copy(model.desk).add(new THREE.Vector3(-.47, 0, .8));
    const radius = Math.max(13, 14 / camera.aspect);
    controls.maxDistance = Math.max(180, radius * 2);
    camera.position.copy(new THREE.Vector3(.13, .52, 1).normalize())
      .multiplyScalar(radius).add(controls.target);
    controls.update();
    render();
  }

  resize();
  new ResizeObserver(resize).observe(canvas);
  canvas.addEventListener('webglcontextlost', () => {
    lost = true;
    controls.enabled = false;
    unavailable(new Error('WebGL context lost'));
  });
  focus.addEventListener('click', frameWorkspace);
  status.hidden = true;
  orbit.hidden = hint.hidden = focus.hidden = false;
}
