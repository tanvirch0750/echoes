# ECHOES — Next.js replica

A faithful, locally hosted recreation of [voxen.framer.website](https://voxen.framer.website/), rebranded as **ECHOES** with an electric-blue accent and built with Next.js App Router, React, and TypeScript. The source content and assets are reproduced with the permission provided for this project.

## Run

Requires Node.js 20.9 or newer.

```sh
npm install
npm run dev
```

Open **http://localhost:3000**.

For production:

```sh
npm run build
npm start
```

## Included

- All **21 original routes**, including six episode pages, seven articles, and the original 404 design.
- **138 local assets**: original photography, SVG graphics, fonts, and MP4 video. The imported media remains at its original quality.
- Original responsive layouts and content variations at **768px** and **1360px**.
- Desktop/tablet/mobile navigation with the working destinations from the original hydrated menus.
- Episode search, keyboard navigation, FAQ accordions, responsive testimonials, animated counters, video dialogs, and hover treatments.
- Word/element reveals, a native WebGL studio-image reveal, and the pinned desktop type sequence.
- Newsletter and contact forms with validation and a local API.
- Static generation, page metadata, keyboard focus states, reduced-motion support, and a skip link.
- The footer credit links to **Tanvir Chowdhury** at [tanvir.qom.bd](https://tanvir.qom.bd/).

No live Framer page is embedded. No Framer runtime, analytics, editor code, or remote font service is required. The original template’s floating promotions, close button, and “Made in Framer” badge are excluded from every page.

## Structure

```text
src/app/[[...path]]/page.tsx      All original routes, statically generated
src/app/api/submissions/         Contact/newsletter endpoint
src/components/                 Native React interactive components
src/content/pages.json          Authorized page markup and metadata
src/content/widgets.json        Responsive visual states for shared widgets
src/content/search.json         Local search index
public/assets/                  Original fonts, images, SVGs, videos
public/styles/                  Original scoped layout styles
scripts/                        Reproducible import and comparison tools
tests/                          Browser and API regression tests
```

The original visual markup and scoped CSS are retained as local content templates to avoid approximate typography, spacing, and image crops. `PageComposition` turns these into React elements, replaces internal anchors with Next.js links, and mounts native React components for the interactive regions. Pages do not run the original JavaScript bundles.

## Forms

Without configuration, valid requests are saved to **`.data/submissions.jsonl`** on the local server, outside the public directory. The directory and file are created with private permissions and ignored by Git. This saves submissions; it does not send email or subscribe someone to a third-party mailing provider.

For deployment, configure an HTTPS webhook in `.env.local`:

```dotenv
FORMS_WEBHOOK_URL=https://your-service.example/submissions
FORMS_WEBHOOK_SECRET=your-optional-bearer-token
```

The endpoint sends `{ id, receivedAt, kind, email, name?, subject?, message? }`. A successful response is shown only after the record is saved or the webhook accepts it. If using file storage in production, set `SUBMISSIONS_DIRECTORY` to a persistent, writable directory. On serverless/read-only hosts, use the webhook instead.

The endpoint includes email and size validation, a honeypot, same-origin checking, and basic in-process rate limiting. For a large public deployment, add persistent/distributed rate limiting at your hosting provider.

## Verify

```sh
npm run typecheck
npm test
npm run build
```

Browser tests use `/usr/bin/google-chrome` by default; override `CHROME_PATH` if necessary. Tests cover every route at 1440px, 1024px, and 390px, plus interactive behavior, local media, form submission, and 404 handling. Form tests add clearly labeled test records to the private submissions file.

To re-run visual layout comparisons against the original:

```sh
node scripts/compare-layouts.mjs
```

Reports and screenshots are written to the ignored `reference/` directory. Live video frames and the exact intermediate timing of motion are not deterministic screenshot targets.

## Reference import

The authorized original was investigated through REA MCP, including its sitemap, DOM, source styles, responsive variants, menu/search/FAQ interactions, testimonials, and video playback. To refresh local reference content:

```sh
npm run import:reference
node scripts/refine-reference.mjs
```

These development-only tools need internet access and Chrome. They do not run during production builds or at runtime.
