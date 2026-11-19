// Offline conversion. Clip triangulated polygons, not independent rings, to preserve holes.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { ShapeUtils, Vector2 } from 'three';

const root = process.argv[2] || '.cache/london-os';
const raw = JSON.parse(readFileSync(`${root}/raw.json`, 'utf8'));
const tolerance = 5;

function simplify(points, threshold) {
  if (points.length <= 4 || !threshold) return points.slice(0, -1);
  const keep = new Set([0, points.length - 1]);
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [start, end] = stack.pop();
    const a = points[start], b = points[end];
    const dx = b[0] - a[0], dy = b[1] - a[1], length = dx * dx + dy * dy;
    let maximum = threshold * threshold, selected = -1;
    for (let i = start + 1; i < end; i++) {
      const p = points[i];
      const t = length ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / length)) : 0;
      const distance = (p[0] - a[0] - t * dx) ** 2 + (p[1] - a[1] - t * dy) ** 2;
      if (distance > maximum) { maximum = distance; selected = i; }
    }
    if (selected !== -1) {
      keep.add(selected);
      stack.push([start, selected], [selected, end]);
    }
  }
  const result = [...keep].sort((a, b) => a - b).map(i => points[i]).slice(0, -1);
  return result.length >= 3 ? result : points.slice(0, -1);
}

function clip(points) {
  for (const [axis, limit, sign] of [[0, raw.bounds[0], 1], [0, raw.bounds[2], -1], [1, raw.bounds[1], 1], [1, raw.bounds[3], -1]]) {
    const output = [];
    for (let i = 0; i < points.length; i++) {
      const a = points[i], b = points[(i + 1) % points.length];
      const insideA = (a[axis] - limit) * sign >= 0;
      const insideB = (b[axis] - limit) * sign >= 0;
      if (insideA) output.push(a);
      if (insideA !== insideB) {
        const t = (limit - a[axis]) / (b[axis] - a[axis]);
        output.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
      }
    }
    points = output;
    if (!points.length) break;
  }
  return points;
}

const features = [], simplificationRefinements = [];
for (const feature of raw.features) {
  const polygons = feature.geometry.type === 'Polygon' ? [feature.geometry.coordinates] : feature.geometry.coordinates;
  const vertices = [], triangles = [], lookup = new Map();
  function index(point) {
    const value = point.map(n => Math.round(n * 10) / 10);
    const key = value.join(',');
    if (!lookup.has(key)) { lookup.set(key, vertices.length); vertices.push(value); }
    return lookup.get(key);
  }
  for (const polygon of polygons) {
    const ringArea = ring => Math.abs(ring.reduce((area, a, i) => {
      const b = ring[(i + 1) % ring.length];
      return area + a[0] * b[1] - b[0] * a[1];
    }, 0)) / 2;
    let points, tessellation, valid = false;
    for (const threshold of [tolerance, tolerance / 2, tolerance / 4, 0]) {
      const rings = polygon.map(ring => simplify(ring, threshold));
      points = rings.flat();
      const vectors = rings.map(ring => ring.map(([x, y]) => new Vector2(x, y)));
      tessellation = ShapeUtils.triangulateShape(vectors[0], vectors.slice(1));
      const expectedArea = ringArea(rings[0]) - rings.slice(1).reduce((area, ring) => area + ringArea(ring), 0);
      const triangleArea = tessellation.reduce((area, triangle) => area + ringArea(triangle.map(i => points[i])), 0);
      if (Math.abs(expectedArea - triangleArea) <= Math.max(.05, expectedArea * 1e-7)) {
        valid = true;
        if (threshold !== tolerance) {
          simplificationRefinements.push({ name: feature.name, sourceId: feature.sourceId, toleranceMetres: threshold });
          console.warn(`${feature.name}: reduced simplification to ${threshold}m to preserve triangulated area.`);
        }
        break;
      }
    }
    if (!valid) throw new Error(`Triangulation area mismatch in ${feature.name}, including unsimplified geometry. Inspect source topology.`);
    for (const triangle of tessellation) {
      const clipped = clip(triangle.map(i => points[i]));
      for (let i = 1; i < clipped.length - 1; i++) {
        const indices = [index(clipped[0]), index(clipped[i]), index(clipped[i + 1])];
        const [a, b, c] = indices.map(j => vertices[j]);
        const twiceArea = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
        if (Math.abs(twiceArea) > .01) {
          triangles.push(...(twiceArea > 0 ? indices : [indices[0], indices[2], indices[1]]));
        }
      }
    }
  }
  if (triangles.length) features.push({ kind: feature.kind, name: feature.name, sourceId: feature.sourceId, vertices, triangles });
}
const sources = [
  ['OpenGreenspace', 'greenspace.zip', '173ab5dc5e2645a40c33d23890bb9d1c'],
  ['OpenMapLocal', 'openmap.zip', '94c08ba6f3d9ce4a3b36339fc01b9334'],
].map(([product, archive, metadataMd5]) => {
  const bytes = readFileSync(`${root}/${archive}`);
  const downloadedMd5 = createHash('md5').update(bytes).digest('hex');
  if (downloadedMd5 !== metadataMd5) throw new Error(`${product}: archive differs from the recorded edition. Review new download metadata before updating its checksum.`);
  return {
    product, archive, metadataMd5,
    downloadedMd5,
    sha256: createHash('sha256').update(bytes).digest('hex'),
    bytes: bytes.length,
    url: `https://api.os.uk/downloads/v1/products/${product}/downloads?area=TQ&format=ESRI%C2%AE%20Shapefile`,
  };
});
const data = {
  crs: 'EPSG:27700', bounds: raw.bounds, toleranceMetres: tolerance,
  attribution: 'Contains Ordnance Survey data © Crown copyright and database right 2026.',
  retrieved: '2026-11-18', sources, simplificationRefinements, features,
};
writeFileSync('src/london-os/geography.json', JSON.stringify(data) + '\n');
console.log(`${features.length} OS features, ${features.reduce((n, f) => n + f.triangles.length / 3, 0)} clipped triangles`);
