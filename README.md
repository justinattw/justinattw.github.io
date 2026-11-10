# justinattw.github.io
Personal portfolio and CV, presented as an interactive 3D study.

An immersive, front-facing townhouse study with three closely spaced arched windows, walnut
panelling and a retro computer. The camera moves towards each destination.
Lanyard cards have playful, procedurally drawn company emblems and flip to reveal
the role's details. Titled books pull off the shelf and open to project notes.
The CV pages directly on the monitor. There are no popup panels.
The monitor also has a browser-only terminal: `open resume.pdf`, `ls`, `cv`,
`help`, `clear` and `exit` (return to the room). The distant monitor remains an
empty terminal. Backslash (`\`) opens command suggestions; Tab retains normal
keyboard navigation. A visible
commands button provides the same access on touch devices. Selecting a suggestion
runs it immediately. No shell is executed.
The right-hand cupboard opens to show crosswords, skis, a football, dumbbells,
language books, running shoes, and a diving mask, snorkel, tank and fins.

Mouse, touch and keyboard all work. Escape or the back button returns one level.
On the computer, Left and Right arrow keys turn the fixed-width CV pages.
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
with no downloaded models or image assets. Potted plants and a black cat with white socks
bring the room to life. The cat animates at up to 30 frames per second in the
room overview, alternating walks, rests, grooming and jumps onto the chair and desk.
Its loop starts with grooming on the left, then the desk globe, water glass and
monstera. It jumps down on the left of the desk. The globe spins and slows when
pawed; the monstera ruffles as the cat stands on its hind legs and swats.
Tall bamboo sits left of the desk. The cat pauses in close-ups and hidden tabs. Otherwise rendering happens
on demand. The display caps pixel density at 2; reduced motion keeps the cat
still and makes destination changes immediate instead of moving the camera.
Fonts are local system fonts; the deployed site makes no external asset requests.
The wall clock follows UK time (`Europe/London`), including GMT/BST changes.
It refreshes each minute and when the page becomes visible again.
Reading and Projects focus separately on the upper and lower shelves. Reading
has "Currently reading" and "Recently read" shelves, the latter limited to five books.
Unavailable categories have unnamed decorative books instead of labels or links.

## Updating content

Edit the semantic sections in `index.html`. The same content supplies the physical
objects, screen-reader descriptions, simple view and printable CV.
`src/room.js` defines the room and camera; `src/physical-objects.js` builds and
animates the cards and books. `src/style.css` includes responsive and print layouts.

### Goodreads sync

`.github/workflows/reading.yml` refreshes `src/reading.json` weekly on Mondays at
07:00 UTC, or manually from Actions. The updater uses Python's standard library:

```sh
python3 -m unittest discover -s scripts -p 'test_*.py'
python3 scripts/update-reading.py
```

The Action tries Goodreads RSS, with the public profile as a fallback for current
reads. To enable the completed shelf when Goodreads requires a keyed feed, add
the key from your Goodreads RSS URL as the repository Actions secret
`GOODREADS_RSS_KEY`. Do not put it in source, a workflow input or a public issue.
Recently read uses the feed's descending `date_read` order and keeps five entries.
The key is never written to the generated data.

The build renders the snapshot into static HTML, so the same books work in 3D,
simple view and without JavaScript. Unavailable shelves are explicitly reported
in the Action summary and omitted from the site. Unexpected fetch errors fail the
run after publishing the availability change. A missing RSS key reports a warning.
Data commits explicitly dispatch the Pages workflow because `GITHUB_TOKEN` pushes
do not trigger another push workflow.

The owner has explicitly approved publishing the original résumé PDF at
`public/justin-wong-resume.pdf`, including its contact and visa details.
Both Download CV links download that file unchanged. The in-room and HTML CV
remain limited to work history, education and the GitHub link.
Do not add unpublished results or invented project metrics. Future ideas must
stay explicitly labelled as concepts.

## Publishing

Enable GitHub Pages with **GitHub Actions** as the source in repository settings.
The workflow builds and publishes `dist/` on pushes to `main`.
The intended URL is <https://justinattw.github.io>.

## Temporary interior chooser

`/styles.html` offers six palettes and finishes in the same room. Clicking a
style opens the portfolio immediately with that style applied. It does not
change the default portfolio. The selection is encoded in the shareable URL
as `?style=<id>`. There is no
account, backend or tracking. Styles are defined in `src/styles.js`.
