import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildGardens } from './gardens-model.js';

const canvas = document.querySelector('#gardens-view');
const marker = document.querySelector('.gardens-marker');
const enter = document.querySelector('.gardens-enter');
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
  status.textContent = 'The 3D view is unavailable. You can still enter the study below.';
  status.hidden = false;
  orbit.hidden = marker.hidden = hint.hidden = true;
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
  const projected = new THREE.Vector3();
  const camera = new THREE.PerspectiveCamera(36, 1, .1, 240);
  const controls = new OrbitControls(camera, canvas);
  controls.enablePan = false;
  controls.enableZoom = false;
  controls.minPolarAngle = Math.PI * .16;
  controls.maxPolarAngle = Math.PI * .39;
  controls.rotateSpeed = .75;

  let distance = 0, flight = 0, redraw = 0, flying = false, lost = false;

  function render() {
    if (lost) return;
    renderer.render(scene, camera);
    if (flying) return;
    projected.copy(model.marker).project(camera);
    const x = (projected.x + 1) / 2 * canvas.clientWidth;
    const y = (1 - projected.y) / 2 * canvas.clientHeight;
    marker.hidden = camera.position.z < model.desk.z + 4 || camera.position.x < -24 ||
      x < 58 || x > canvas.clientWidth - 58 || y < 52 || y > canvas.clientHeight;
    if (!marker.hidden) {
      marker.style.left = `${x}px`;
      marker.style.top = `${y}px`;
    }
    canvas.dataset.orbit = camera.position.toArray().map(value => value.toFixed(3)).join(',');
  }

  function reset() {
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
      if (!flying) camera.position.sub(controls.target).multiplyScalar(nextDistance / distance).add(controls.target);
      distance = nextDistance;
      render();
    }
  }

  controls.addEventListener('change', () => {
    if (redraw) return;
    redraw = requestAnimationFrame(() => {
      redraw = 0;
      if (!flying) render();
    });
  });
  orbit.addEventListener('click', event => {
    const direction = event.target.closest('button')?.dataset.orbit;
    if (!direction || flying || lost) return;
    if (direction === 'reset') {
      reset();
      return;
    }
    camera.position.sub(controls.target).applyAxisAngle(camera.up, direction === 'left' ? -Math.PI / 6 : Math.PI / 6).add(controls.target);
    controls.update();
  });

  function visit(event) {
    if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey || lost ||
        matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    event.preventDefault();
    if (flying) return;
    flying = true;
    controls.enabled = false;
    if (document.activeElement === marker) enter.focus({ preventScroll: true });
    marker.hidden = true;
    const href = event.currentTarget.href;
    const startTarget = controls.target.clone();
    const startOffset = camera.position.clone().sub(startTarget);
    const endTarget = model.desk;
    const startAngle = Math.atan2(startOffset.x, startOffset.z);
    const angleDelta = Math.atan2(Math.sin(.12 - startAngle), Math.cos(.12 - startAngle));
    const startRadius = Math.hypot(startOffset.x, startOffset.z);
    const look = new THREE.Vector3();
    let begin;
    function advance(now) {
      begin ??= now;
      const step = Math.min(1, (now - begin) / 1050);
      // Swing toward the open facade before closing in from the front.
      const angle = startAngle + angleDelta * (1 - (1 - step) ** 4);
      const travel = step * step * (3 - 2 * step);
      const radius = THREE.MathUtils.lerp(startRadius, 1.95, travel);
      look.lerpVectors(startTarget, endTarget, travel);
      camera.position.set(look.x + Math.sin(angle) * radius,
        look.y + THREE.MathUtils.lerp(startOffset.y, .88, travel), look.z + Math.cos(angle) * radius);
      camera.lookAt(look);
      render();
      if (step < 1) flight = requestAnimationFrame(advance);
      else location.assign(href);
    }
    flight = requestAnimationFrame(advance);
  }

  function restore() {
    if (!flying) return;
    cancelAnimationFrame(flight);
    flying = false;
    controls.enabled = true;
    reset();
  }

  resize();
  new ResizeObserver(resize).observe(canvas);
  window.addEventListener('pagehide', () => cancelAnimationFrame(flight));
  window.addEventListener('pageshow', event => { if (event.persisted) restore(); });
  canvas.addEventListener('webglcontextlost', () => {
    lost = true;
    cancelAnimationFrame(flight);
    controls.enabled = false;
    unavailable(new Error('WebGL context lost'));
  });
  marker.addEventListener('click', visit);
  enter.addEventListener('click', visit);
  status.hidden = true;
  orbit.hidden = hint.hidden = false;
}
