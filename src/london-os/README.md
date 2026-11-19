# Ordnance Survey London variant

Route: `/london-os.html`. This standalone Three.js miniature reuses the existing garden-square model without changing it. The only shared-file edit registers the HTML entry in `vite.config.js`.

## Geography and licence

The bundled [`geography.json`](./geography.json) contains 221 named public parks/gardens from [OS Open Greenspace](https://www.ordnancesurvey.co.uk/products/os-open-greenspace) and 23 tidal-water features from [OS OpenMap Local](https://www.ordnancesurvey.co.uk/products/os-open-map-local). These are genuine TQ shapefile polygons, not traced or substituted approximations. The JSON records source IDs, anonymous download endpoints, archive checksums, retrieval date and processing parameters.

Contains Ordnance Survey data © Crown copyright and database right 2026. Reused under the [Open Government Licence v3.0](https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/). Attribution appears on the page, with further credits in its expandable source note.

Coordinates remain British National Grid, **EPSG:27700**. The clip is `[522000, 175000, 534000, 183500]` metres. Rendering maps eastings to x and negative northings to z at 100 metres per scene unit. Heights and object scales are independently exaggerated.

The offline conversion simplifies rings at up to 5 metres, triangulates polygons with holes, checks triangulated area against ring area, clips each triangle to the rectangle, then quantises vertices to 0.1 metres. Simplification is reduced when that area check fails. Vauxhall Pleasure Gardens retains its original rings; this refinement is explicitly recorded. Clipping triangles avoids joining disconnected polygon fragments across the clip boundary. The bundled result is approximately 120 KB before compression.

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

Drag or touch-drag to orbit; scroll or pinch to zoom. Buttons provide keyboard-accessible rotation, zoom, reset and a studio close-up. The scene renders on demand rather than running an animation loop. There are no runtime external requests, fonts, map SDKs, accounts or click-throughs to the portfolio room.

Only the park and tidal-water footprints are OS geography. City blocks, street-like gaps, trees and all heights are illustrative. Royal Albert Hall, Big Ben, the London Eye and Buckingham Palace are original toy silhouettes at approximate locations, not surveyed buildings. The enlarged terrace and open-roof workspace are roughly in South Kensington, not at a precise address. Its garden square is part of that illustrative vignette, not an additional OS greenspace polygon.

TidalWater omits some under-bridge areas; those source gaps remain visible. Inland park lakes are not included. The selected greenspace class excludes private gardens and other land-use classes. Buildings are not a real street network, and their grid is not a substitute for OS building data. WebGL is required; failure and JavaScript-disabled states explain this.

The route-specific Playwright configuration uses port 4182 to avoid other variants. Tests cover desktop mouse orbit, mobile touch orbit, zoom, keyboard rotation, studio focus/reset, no external requests, source geometry invariants and JavaScript-disabled fallback. Screenshots are written under `test-results/`.
