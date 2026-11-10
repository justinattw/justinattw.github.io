import { createRoom } from './room.js';
import { interiorStyles } from './styles.js';

const options = document.querySelector('#style-options');
const status = document.querySelector('#scene-status');
let room;
let selected = interiorStyles.find(style => style.id === new URLSearchParams(location.search).get('style')) || interiorStyles[0];

function choose(style) {
  selected = style;
  room?.setStyle(style);
  for (const button of options.children) button.setAttribute('aria-pressed', String(button.dataset.style === style.id));
  document.querySelector('#preview-name').textContent = style.name;
  const link = document.querySelector('#choose-style');
  link.textContent = `Try ${style.name} in the portfolio ↗`;
  link.href = `./?style=${style.id}`;
  history.replaceState(null, '', `?style=${style.id}`);
}

for (const style of interiorStyles) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'style-option';
  button.dataset.style = style.id;
  button.setAttribute('aria-pressed', String(style.id === selected.id));
  const swatches = document.createElement('span');
  swatches.className = 'swatches';
  swatches.setAttribute('aria-hidden', 'true');
  for (const color of [style.wall, style.wood, style.trim]) {
    const swatch = document.createElement('i');
    swatch.style.backgroundColor = color;
    swatches.append(swatch);
  }
  const copy = document.createElement('span');
  const name = document.createElement('strong');
  name.textContent = style.name;
  const note = document.createElement('small');
  note.textContent = style.note;
  copy.append(name, note);
  button.append(swatches, copy);
  button.addEventListener('click', () => choose(style));
  options.append(button);
}

try {
  room = createRoom({
    canvas: document.querySelector('#room'),
    targets: document.querySelector('#room-targets'),
    overview: true,
    onSelect: () => {},
    onReady: () => { status.hidden = true; },
    onError: error => {
      console.error('Style preview interrupted:', error);
      status.hidden = false;
      status.textContent = '3D is unavailable. You can still compare the colour swatches.';
    },
  });
  choose(selected);
} catch (error) {
  console.error('Unable to load style preview:', error);
  status.textContent = '3D is unavailable. You can still compare the colour swatches.';
}
