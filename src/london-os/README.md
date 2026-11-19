# Ordnance Survey London variant

Route: `/london-os.html`. A continuous Three.js London world and top-floor study, with a charcoal/chalk interface informed by [Autopilot Careers](https://careers.joinautopilot.com/). “The Study” is the placeholder name. DM Sans is bundled with its [SIL Open Font Licence](./fonts/OFL.txt); headings use the local Georgia/Times serif stack. No reference artwork or models are reused.

The route reuses the existing garden-square geometry with optional flat-ground, uniform-roofline, palette and furnishing settings. Their defaults preserve `/gardens.html`. The main portfolio and other routes retain their existing content and behavior.

## Geography and licence

The bundled [`geography.json`](./geography.json) contains 679 named public parks/gardens from [OS Open Greenspace](https://www.ordnancesurvey.co.uk/products/os-open-greenspace) and 50 tidal-water features from [OS OpenMap Local](https://www.ordnancesurvey.co.uk/products/os-open-map-local). These are genuine TQ shapefile polygons, not traced or substituted approximations. The JSON records source IDs, anonymous download endpoints, archive checksums, retrieval date and processing parameters.

Contains Ordnance Survey data © Crown copyright and database right 2026. Reused under the [Open Government Licence v3.0](https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/). Attribution is available through the page’s “OS geography & credits” control.

Coordinates remain British National Grid, **EPSG:27700**. The 26 × 20 km clip is `[516000, 170000, 542000, 190000]` metres, over five times the original prototype’s area. Rendering maps eastings to x and negative northings to z at 100 metres per scene unit. Heights and object scales are independently exaggerated.

The offline conversion simplifies rings at up to 5 metres, triangulates polygons with holes, checks triangulated area against ring area, clips each triangle to the rectangle, then quantises vertices to 0.1 metres. Simplification is reduced when that area check fails; refinements are explicitly recorded. Clipping triangles avoids joining disconnected polygon fragments across the clip boundary. The bundled result has 12,975 triangles and is approximately 487 KB before compression. Rendering merges it into two meshes.

## Reproduce the bundle

Run from the repository root with Node.js, Python 3, `curl` and `unzip`. `npm ci` restores the locked build dependencies, including the Three.js triangulator. No GIS service or API key is required.

```sh
npm ci
mkdir -p .cache/london-os/greenspace .cache/london-os/water
curl -fL 'https://api.os.uk/downloads/v1/products/OpenGreenspace/downloads?area=TQ&format=ESRI%C2%AE+Shapefile&redirect' -o .cache/london-os/greenspace.zip
curl -fL 'https://api.os.uk/downloads/v1/products/OpenMapLocal/downloads?area=TQ&format=ESRI%C2%AE+Shapefile&redirect' -o .cache/london-os/openmap.zip
unzip -jo .cache/london-os/greenspace.zip '*GreenspaceSite.*' -d .cache/london-os/greenspace
unzip -jo .cache/london-os/openmap.zip '*TidalWater.*' -d .cache/london-os/water
curl -fL 'https://raw.githubusercontent.com/GeospatialPython/pyshp/2.3.1/shapefile.py' -o .cache/london-os/shapefile.py
PYTHONPATH=.cache/london-os python3 scripts/london-os-extract.py .cache/london-os > .cache/london-os/raw.json
node scripts/london-os-bundle.mjs
npm run build
npx playwright test --config scripts/london-os-playwright.config.js
```

The Python reader is unmodified, MIT-licensed [pyshp 2.3.1](https://github.com/GeospatialPython/pyshp/tree/2.3.1), used offline and not shipped. CP1252 decodes the source DBF names. Raw archives total approximately 225 MB and are not committed. Remove the specific `.cache/london-os` directory after processing.

The official download URLs track the current edition. The bundler verifies the original archive MD5 values recorded in its source before writing output. If OS replaces an archive, preserve the old zip for exact reproduction, or review the new [Greenspace metadata](https://api.os.uk/downloads/v1/products/OpenGreenspace/downloads?area=TQ&format=ESRI%C2%AE%20Shapefile) and [OpenMap Local metadata](https://api.os.uk/downloads/v1/products/OpenMapLocal/downloads?area=TQ&format=ESRI%C2%AE%20Shapefile), then deliberately update checksums and the retrieval date. Do not bypass the check. SHA-256 values for both original archives are also recorded in the bundle.

## Interaction and limitations

Drag or touch-drag to orbit; scroll or pinch to zoom. Buttons provide keyboard-accessible rotation, zoom and reset. One Explore button flies into the office. Its computer opens CV, shelves open Projects/Reading, passes open Work and the cupboard opens Interests. Each camera move stays in the same scene. Books open and passes turn over; the original readable content appears alongside them. Back, Escape, browser history and deep links work at every level. Reduced motion skips camera flights.

The content plugin injects the original `index.html` portfolio sections before the existing project and reading transforms. It fails the build if that source contract changes, rather than silently shipping empty content. `View contents`, a skip link, WebGL-failure handling and a JavaScript-disabled document keep the content accessible without navigating to the original room.

The scene renders on demand, with animation frames only during flights or object motion. Office furnishings are created on first entry. Geography, fonts and portfolio content are bundled locally: no runtime external requests, map SDKs, accounts or click-throughs to another portfolio study. Outbound links and the CV download remain explicit visitor actions.

Only the park and tidal-water footprints are OS geography. City blocks, street-like gaps, trees and all heights are illustrative. Royal Albert Hall, Big Ben, the London Eye and Buckingham Palace are original toy silhouettes at approximate locations, not surveyed buildings. The enlarged terrace and open-roof workspace are roughly in South Kensington, not at a precise address. Its garden square is part of that illustrative vignette, not an additional OS greenspace polygon.

TidalWater omits some under-bridge areas; those source gaps remain visible. Inland park lakes are not included. The selected greenspace class excludes private gardens and other land-use classes. Buildings are not a real street network, and their grid is not a substitute for OS building data. The garden-square terraces now share a consistent roofline; background blocks still vary illustratively. Distance fog hides the world’s horizon rather than exposing a tabletop edge.

The route-specific Playwright configuration uses port 4182 to avoid other variants. Tests cover desktop mouse/mobile touch orbit, zoom, keyboard controls and focus, all five office destinations, physical books/passes, history/deep links, reduced motion, no external requests, source geometry invariants, both fallbacks and the existing gardens route. Screenshots are written under `test-results/`.
