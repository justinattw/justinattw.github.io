# justinattw.github.io
Personal portfolio and CV, presented as an interactive 3D study.

The bookshelf opens projects, the retro computer opens the CV, and the pinboard
opens work history as employee-style cards. Mouse, touch and keyboard navigation
all lead to the same content. Plain HTML remains available without JavaScript or
WebGL, with a simple-view toggle and printable public CV.

## Development

Requires Node.js 22.

```sh
npm ci
npm run dev
```

```sh
npm run build
npx playwright install chromium
npm test
```

Vite builds the static site to `dist/`. Three.js renders the procedural room,
with no downloaded models or image assets. Rendering happens on demand, not in
a continuous animation loop. The display caps pixel density at 2; reduced motion
disables pointer parallax. Google Fonts is optional and has local font fallbacks.

## Updating content

Edit the semantic sections in `index.html`. The same content is used for the
simple view, interactive panels and printable CV. `src/room.js` defines the room
and its destinations. `src/style.css` includes responsive and print layouts.

Do not add private contact or visa details, source résumé files, unpublished
results or invented project metrics. Future ideas must stay explicitly labelled
as concepts. The CV's print button uses the browser's print/save-as-PDF interface
and includes public education and work history, not projects or room graphics.

## Publishing

Enable GitHub Pages with **GitHub Actions** as the source in repository settings.
The workflow builds and publishes `dist/` on pushes to `main`.
The intended URL is <https://justinattw.github.io>.
