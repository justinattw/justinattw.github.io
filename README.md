# Justin Wong's London study

The homepage at <https://justinattw.github.io/> is an orbitable Three.js London
miniature with an exposed South Kensington study. Explore the computer, project
and reading shelves, work-history pinboard and interests cabinet without leaving
the world. The original standalone room, garden exterior and style chooser have
been retired.

Park and water outlines come from real, reusable Ordnance Survey geography,
processed offline and bundled locally. Buildings, heights and landmarks are
original illustrative models, not surveyed architecture. See the
[geography, attribution and reproduction notes](src/london-os/README.md).

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
python3 -m unittest discover -s scripts -p 'test_*.py'
```

Vite publishes the single `index.html` entrypoint to `dist/`. Playwright exercises
the production build on desktop and mobile, including orbit, all destinations,
the terminal, deep links, content generation and no-JavaScript/no-WebGL fallbacks.
Its preview server uses port 4182.

The scene is in `src/london-os/`, with shared terrace, furniture, plant and cat
helpers in `src/`. Geometry, fonts and portfolio content are local; there are no
runtime external asset or map-service requests. Outbound links and downloads
require visitor actions. The cat pauses in close-ups, hidden tabs and reduced
motion; reduced motion also skips camera flights.

## Content

Edit the semantic portfolio sections in [`src/portfolio.html`](src/portfolio.html).
The build injects them into the homepage before generating projects and reading
shelves. The same content supplies the physical objects, side panels, terminal
education and accessible fallback. Keep factual content accurate; do not invent
project results or metrics.

Project books come from `.md` files in `projects/`, in filename order. Start each
with a `#` title. Supported Markdown includes paragraphs, `##`/`###` headings,
lists, fenced code, inline code, bold, italics and HTTP(S) links. Long books have
page controls; links remain available alongside the physical book and in the
fallback document.

The unbranded silver laptop runs a browser-only terminal, not a shell. Backslash
or the help button opens commands; arrows select and Enter or a click runs one.
Commands include `download resume.pdf`, `open resume.pdf`, `cat education.txt`,
`open linkedin` and `exit`. Its screen state remains visible when zoomed out.
The owner's approved résumé at `public/justin-wong-resume.pdf` is published
unchanged. Company illustrations are playful originals, not official access
credentials.

### Goodreads

[The reading workflow](.github/workflows/reading.yml) updates `src/reading.json`
on Mondays at 07:00 UTC, or manually from Actions. The updater uses Python's
standard library:

```sh
python3 scripts/update-reading.py
```

It tries public RSS, with the public profile as a fallback for current reads.
If completed books require a keyed feed, configure the Actions secret
`GOODREADS_RSS_KEY`. Never commit the key. Recently read keeps the latest five
entries in descending `date_read` order. Unavailable shelves are reported in the
Action summary and omitted from the site; unexpected fetch errors fail the run.
Data commits explicitly dispatch Pages because `GITHUB_TOKEN` pushes do not
trigger another push workflow.

## Publishing

GitHub Pages uses **GitHub Actions** as its source.
[The Pages workflow](.github/workflows/pages.yml) builds and deploys `dist/` on
pushes to `main`, or by manual dispatch. The live homepage is
<https://justinattw.github.io/>.
