# justinattw.github.io
Personal portfolio and CV, presented as an interactive 3D study.

An immersive, front-facing Victorian study with tall arched windows, walnut
panelling and a retro computer. The camera moves towards each destination.
Lanyard cards have playful, procedurally drawn company emblems and flip to reveal
the role's details. Titled books pull off the shelf and open to project notes.
The CV pages directly on the monitor. There are no popup panels.

Mouse, touch and keyboard all work. Escape or the back button returns one level.
Plain HTML remains available without JavaScript or WebGL, with a simple-view
toggle and printable public CV. The company emblems are original playful
representations, not official brand assets or access credentials.

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
a continuous idle animation loop. The display caps pixel density at 2; reduced
motion makes destination changes immediate instead of moving the camera.
Fonts are local system fonts; the deployed site makes no external asset requests.

## Updating content

Edit the semantic sections in `index.html`. The same content supplies the physical
objects, screen-reader descriptions, simple view and printable CV.
`src/room.js` defines the room and camera; `src/physical-objects.js` builds and
animates the cards and books. `src/style.css` includes responsive and print layouts.

Do not add private contact or visa details, source résumé files, unpublished
results or invented project metrics. Future ideas must stay explicitly labelled
as concepts. The CV's print button uses the browser's print/save-as-PDF interface
and includes public education and work history, not projects or room graphics.

## Publishing

Enable GitHub Pages with **GitHub Actions** as the source in repository settings.
The workflow builds and publishes `dist/` on pushes to `main`.
The intended URL is <https://justinattw.github.io>.

## Temporary interior chooser

`/styles.html` compares six palettes and finishes in the same room. It does not
change the default portfolio. The selection is encoded in the shareable URL;
following its preview link applies that style with `?style=<id>`. There is no
account, backend or tracking. Styles are defined in `src/styles.js`.
