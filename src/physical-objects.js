import * as THREE from 'three';
import { drawLogo } from './company-logos.js';

const companyNames = ['GitHub', 'TradingHub', 'CoreStream', 'UCL', 'Nuveen'];
const accents = ['#395347', '#80693e', '#506b72', '#6e5c70', '#557765'];

function wrap(ctx, text, maxWidth) {
  const lines = [];
  let line = '';
  for (const word of text.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(next).width > maxWidth) { lines.push(line); line = word; }
    else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

export function createPhysicalObjects({ box, surface, brass, pinboard, shelf, readingShelf, jobs, projects, reading = [], schedule }) {
  const items = [];
  let motion;
  function plane(texture, w, h, z, parent, back = false) {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: texture, toneMapped: false }));
    mesh.position.z = z;
    if (back) mesh.rotation.y = Math.PI;
    parent.add(mesh);
    return mesh;
  }
  function cardFront(job, index) {
    return surface((ctx, w, h) => {
      ctx.fillStyle = '#eee3c9'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = accents[index]; ctx.fillRect(0, 0, w, 185);
      ctx.fillStyle = '#eadcba'; ctx.font = '32px sans-serif'; ctx.fillText('THE STUDY / ACCESS', 80, 110);
      ctx.fillStyle = '#c9bea2'; ctx.fillRect(w / 2 - 100, 34, 200, 30);
      drawLogo(ctx, index, w / 2, 490, 300, accents[index]);
      ctx.fillStyle = accents[index]; ctx.textAlign = 'center'; ctx.font = 'bold 76px Georgia';
      ctx.fillText(job.company, w / 2, 780, w - 80);
      ctx.font = '44px sans-serif'; ctx.fillText('Justin Wong', w / 2, 920);
      ctx.font = '32px sans-serif'; ctx.fillText(job.dates || '', w / 2, 1010);
      ctx.font = '28px sans-serif'; ctx.fillText('TURN OVER TO READ', w / 2, 1290);
      ctx.textAlign = 'left';
      for (let i = 0; i < 80; i++) if (i % 3 !== 0) ctx.fillRect(180 + i * 8, 1360, i % 2 ? 3 : 6, 65);
    }, 1024, 1536);
  }
  function cardBack(job, index) {
    return surface((ctx, w, h) => {
      ctx.fillStyle = '#eee3c9'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = accents[index]; ctx.fillRect(0, 0, w, 12);
      ctx.fillStyle = '#314335'; ctx.font = 'bold 60px Georgia, serif';
      ctx.fillText(job.company, 70, 105);
      ctx.font = '40px Georgia, serif';
      let y = 175;
      for (const line of wrap(ctx, job.role || '', w - 140)) { ctx.fillText(line, 70, y); y += 50; }
      ctx.font = '33px Georgia, serif'; ctx.fillStyle = '#68705b';
      ctx.fillText(job.dates || '', 70, y + 15);
      y += 90;
      const bullets = job.bullets?.length ? job.bullets : ['Experience details are available in the portfolio.'];
      let fontSize = 44, paragraphs;
      do {
        ctx.font = `${fontSize}px Georgia, serif`;
        paragraphs = bullets.map(text => wrap(ctx, text, w - 170));
        if (y + paragraphs.reduce((sum, lines) => sum + lines.length * fontSize * 1.3 + 25, 0) < h - 65) break;
        fontSize--;
      } while (fontSize > 28);
      ctx.fillStyle = '#344333';
      for (const lines of paragraphs) {
        ctx.fillText('·', 65, y);
        for (const line of lines) { ctx.fillText(line, 95, y); y += fontSize * 1.3; }
        y += 25;
      }
    }, 1024, 1536);
  }
  for (let i = 0; i < 5; i++) {
    const job = jobs[i] || { company: companyNames[i] };
    const x = 2.49 + (i % 3) * .63, y = (i < 3 ? 3.53 : 2.8) - .26;
    const root = new THREE.Group();
    root.position.set(x, y, -3.44);
    root.userData.interaction = { kind: 'job', index: i };
    pinboard.add(root);
    box(0, 0, 0, .46, .69, .035, '#e7dcc1', root);
    plane(cardFront(job, i), .46, .69, .024, root);
    plane(cardBack(job, i), .46, .69, -.024, root, true);
    items.push({ kind: 'job', index: i, root, name: job.company, home: root.position.clone(), stage: new THREE.Vector3(3.12, 3.05, .8), scale: 5, open: 0 });
  }

  function pageTexture(title, paragraphs, left = false) {
    return surface((ctx, w, h) => {
      ctx.fillStyle = '#e8d9b6'; ctx.fillRect(0, 0, w, h);
      const shade = ctx.createLinearGradient(0, 0, w, 0);
      shade.addColorStop(left ? 1 : 0, '#4d371526');
      shade.addColorStop(left ? 0 : 1, '#fff0');
      ctx.fillStyle = shade; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#344b39'; ctx.font = '90px Georgia';
      let y = 170;
      for (const line of wrap(ctx, title, w - 140)) { ctx.fillText(line, 70, y); y += 108; }
      y += 85;
      ctx.font = '86px Georgia';
      for (const paragraph of paragraphs) {
        for (const line of wrap(ctx, paragraph, w - 140)) { ctx.fillText(line, 70, y); y += 108; }
        y += 75;
      }
    }, 1024, 1400);
  }
  const volumes = [
    ...Array.from({ length: 2 }, (_, index) => ({ kind: 'book', index, data: projects[index] || { title: index ? 'Container runtime' : 'Momentum backtest', description: 'Project notes coming soon.', note: 'Not yet published.' } })),
    ...reading.map((data, index) => ({ kind: 'reading', index, data })),
  ];
  for (const { kind, index: i, data: project } of volumes) {
    const isReading = kind === 'reading';
    const rowIndex = isReading ? reading.slice(0, i).filter(book => book.shelf === project.shelf).length : i;
    const rowCount = isReading ? reading.filter(book => book.shelf === project.shelf).length : 2;
    const pitch = .35 * Math.min(1, 5 / rowCount);
    const root = new THREE.Group();
    root.position.set(-3.15 + (rowIndex - (rowCount - 1) / 2) * pitch, isReading ? project.shelf === 'recent' ? 2.59 : 3.55 : .69, -2.78);
    root.userData.interaction = { kind, index: i };
    (isReading ? readingShelf : shelf).add(root);
    const closed = new THREE.Group();
    closed.scale.x = pitch / .35;
    root.add(closed);
    const color = isReading ? ['#344e64', '#80583e', '#665a3e'][i % 3] : i ? '#6d4937' : '#385443';
    box(0, 0, 0, .28, .81, .61, '#d4c49e', closed);
    for (const x of [-.16, .16]) box(x, 0, 0, .035, .87, .66, color, closed);
    box(0, 0, .33, .35, .87, .045, color, closed);
    for (const y of [-.34, .34]) box(0, y, .36, .34, .02, .014, brass, closed);
    const spine = surface((ctx, w, h) => {
      ctx.fillStyle = color; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#dcc898'; ctx.font = '58px Georgia';
      ctx.textAlign = 'center'; ctx.fillText(project.title.split(':')[0], w / 2, h / 2 + 20, w - 80);
    }, 1024, 160);
    const spineMesh = plane(spine, .68, .15, .36, closed);
    spineMesh.rotation.z = Math.PI / 2;
    const opened = new THREE.Group();
    opened.visible = false;
    root.add(opened);
    const pages = [];
    for (let side = 0; side < 2; side++) {
      const leaf = new THREE.Group();
      opened.add(leaf);
      const x = side ? .31 : -.31;
      box(x, 0, -.025, .62, .86, .04, color, leaf);
      const texture = side
        ? pageTexture(isReading ? project.shelf === 'recent' ? 'Recently read' : 'Currently reading' : 'Field notes', isReading ? ['View this book on Goodreads using the link below.'] : [project.description, project.note])
        : pageTexture(project.title, [isReading ? project.author : i ? 'SYSTEMS / EXPERIMENTS' : 'FINANCE / RESEARCH'], true);
      const page = plane(texture, .59, .82, 0, leaf);
      page.position.x = x;
      pages.push(leaf);
    }
    items.push({ kind, index: i, root, name: project.title, home: root.position.clone(), stage: new THREE.Vector3(-3.15, isReading ? 3.1 : 1.5, .8), scale: 2.8, closed, opened, pages, open: 0 });
  }

  function animate(item, selected, reduced) {
    motion?.resolve(false);
    const from = { position: item.root.position.clone(), scale: item.root.scale.x, rotation: item.root.rotation.y, open: item.open };
    const to = { position: selected ? item.stage : item.home, scale: selected ? item.scale : 1, rotation: selected && item.kind === 'job' ? Math.PI : 0, open: selected ? 1 : 0 };
    const update = t => {
      item.root.position.lerpVectors(from.position, to.position, t);
      item.root.scale.setScalar(THREE.MathUtils.lerp(from.scale, to.scale, t));
      item.root.rotation.y = THREE.MathUtils.lerp(from.rotation, to.rotation, t);
      item.open = THREE.MathUtils.lerp(from.open, to.open, t);
      if (item.kind === 'book' || item.kind === 'reading') {
        item.closed.visible = item.open < .45;
        item.closed.rotation.y = -Math.PI / 2 * Math.min(item.open / .45, 1);
        item.opened.visible = item.open >= .45;
        item.pages.forEach((page, side) => { page.rotation.y = (1 - Math.max(0, (item.open - .45) / .55)) * (side ? -1 : 1) * Math.PI / 2; });
      }
    };
    if (reduced) { update(1); schedule(); return Promise.resolve(true); }
    return new Promise(resolve => { motion = { start: performance.now(), update, resolve }; schedule(); });
  }
  function flip(item, reduced) {
    motion?.resolve(false);
    const from = item.root.rotation.y, to = Math.abs(from) < .1 ? Math.PI : 0;
    const update = t => { item.root.rotation.y = THREE.MathUtils.lerp(from, to, t); };
    if (reduced) { update(1); schedule(); return Promise.resolve(true); }
    return new Promise(resolve => { motion = { start: performance.now(), update, resolve }; schedule(); });
  }
  function step(now, reduced) {
    if (!motion) return false;
    const t = reduced ? 1 : Math.min(1, (now - motion.start) / 1100);
    const eased = t < .5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2;
    motion.update(eased);
    if (t === 1) { const resolve = motion.resolve; motion = null; resolve(true); }
    return Boolean(motion);
  }
  function cancel() {
    motion?.resolve(false);
    motion = null;
  }
  return { items, animate, flip, step, cancel };
}

export function cvTexture(surface, text, page, total) {
  return surface((ctx, w, h) => {
    ctx.fillStyle = '#102d24'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#accb95';
    let y = 75;
    const lines = text.split('\n');
    lines.forEach((paragraph, index) => {
      ctx.font = `${index ? '' : 'bold '}64px "Courier New", Courier, monospace`;
      for (const line of wrap(ctx, paragraph, w - 100)) { ctx.fillText(line, 50, y); y += index ? 78 : 95; }
    });
    ctx.font = '30px "Courier New", Courier, monospace'; ctx.fillStyle = '#86a375';
    ctx.fillText(`${page + 1} / ${total}                         >`, 50, h - 30);
    ctx.fillStyle = '#00000020';
    for (let y = 0; y < h; y += 5) ctx.fillRect(0, y, w, 1);
  }, 1024, 700);
}
