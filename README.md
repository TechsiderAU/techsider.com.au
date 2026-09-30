# techsider.com.au

The Techsider website, published at https://techsider.com.au. It is a static Astro site: production deploys from `main` only, and every push is built, checked and tested in CI.

## Stack

- [Astro 7](https://astro.build/): static output, no UI framework. `astro check` type-checks every build.
- [Tailwind CSS 4](https://tailwindcss.com/) through `@tailwindcss/vite`. The design tokens live in `src/styles/global.css`.
- Content collections validated by Zod (through `astro/zod`): `src/content.config.ts`, with the schemas in `src/content/schemas.ts` and `src/content/page-schemas.ts`.
- Archivo Variable and JetBrains Mono, self-hosted through Fontsource.
- `node:test` for unit and built-markup tests; Playwright with `@axe-core/playwright` for browser and accessibility tests.
- Node 22.18 or later: the tests import the TypeScript sources directly, through Node's type stripping.
- GitHub Pages hosting, with the custom domain in `public/CNAME`.

## Development

```bash
npm install
npm run dev             # http://localhost:4321
npm run build           # type-check, gated build and CI checks → dist/
npm run build:preview   # every planned page in the nav, plus the /preview/ gallery → dist-preview/
npm test                # unit and markup tests: run both builds first
npm run test:e2e        # both builds, then Playwright
npm run verify          # the CI checks again, against the existing dist/
npm run preview         # serves dist/ at http://localhost:4321
```

`npm run check` runs `astro check` on its own. `npm run brand` regenerates the logo and icon kit in `public/` from `scripts/generate_brand.py`; its header lists the Python and Node packages it needs.

### `npm run build`

The production build has three stages, and any one of them fails it:

1. `astro check --minimumFailingSeverity hint`: no errors, no warnings, no hints.
2. `scripts/ci/build.mjs` runs `astro build` into `dist/` and fails on any `[WARN]` or `[ERROR]` line in the log that `scripts/ci/build-allow.json` doesn't allow.
3. `scripts/ci/run-all.mjs` runs the content checks in `scripts/ci/checks/` against `dist/`:

| Check | What it holds the site to |
|---|---|
| `01-slugs` | Nav slugs follow the naming rules, live nav pages and content files pair up, and every cross-reference between content files resolves. |
| `02-links` | Every internal link and fragment resolves; every live page is built; no hub is empty. |
| `03-anchors` | The Home page keeps its section anchors (`#services`, `#approach`, `#industries`, `#demo`, `#insights`, `#faq`, `#contact`). |
| `04-banned-phrases` | No banned phrase in `src/` or the built pages and feeds; the watch-list phrases are printed. |
| `05-captions` | The fixed MockPanel and sample-report captions appear on every render. |
| `06-provenance` | Demo and trace data declare their provenance, metric-shaped numbers stay out of free text, and every illustrative item shows its label. |
| `07-verify-markers` | No open `⚑` or `VERIFY` marker in content or data (launch gate). |
| `08-regulatory-kits` | Regulatory rows are complete, every Government section renders a row, and every Safe-Use Kit is complete and lawyer-reviewed (launch gate). |
| `10-package-status` | On-request and internal packages never render as a tab or a full package block, and the onshore pillar appears only on onshore packages. |
| `11-pricing` | No pricing language and no currency figures in offer copy. |

Check 09 is stages 1 and 2. Check 12, the accessibility smoke test, is the Playwright suite.

`VERIFY_MODE` decides what the launch gates do. With `report` (the default) they print their open items as warnings, and with `gate` those items fail the build. CI gates pull requests into `main`, and the deploy build always gates. To re-run the checks without building again, use `npm run verify` or `VERIFY_MODE=gate npm run verify`, or pick checks and a build with `node scripts/ci/run-all.mjs --dist dist-preview --checks 04,11`.

### Exceptions

Every exception is data with a reason, reviewed like code:

- `scripts/ci/build-allow.json`: build-log lines the build gate lets through, as `{ "match", "reason" }`. `match` is a substring of the line, and it must name the message, not just its level. Fix the cause before adding an entry.
- `src/data/banned-phrase-exceptions.json`: phrase hits that checks 04 and 11 let through, as `{ "file", "phrase", "reason" }`. `file` is a glob under `src/`, or `"dist"` for any built page. A unit test fails when an exception stops matching anything, so the list only shrinks.
- `src/data/metric-exceptions.json`: metric-shaped tokens that check 06 lets through, as `{ "file", "token", "reason" }`.

### The preview build and the `/preview/` gallery

`npm run build:preview` builds with `TECHSIDER_NAV_PREVIEW=1` into `dist-preview/`, then runs the checks that read built pages, `03,04,05,06,08,10,11`. Two things differ from production:

- every planned page shows in the nav and the footer, so the whole shell can be tested before the pages exist;
- `src/preview/integration.mjs` injects `src/preview/gallery.astro` at `/preview/`. The gallery renders the shared components (`/preview/components/`, `/preview/tabs/`, `/preview/page-kit/`) and every page template, one page per variant at `/preview/templates/<kind>/`, from fictional fixture data.

A production build never contains `/preview/`, fixture data or the gallery's CSS and scripts. `tests/preview-route.test.mjs` and `tests/dist-assets.test.mjs` hold it to that.

To browse the gallery, build it and serve `dist-preview/` the way the browser tests do:

```bash
npm run build:preview
node tests/support/static-server.mjs dist-preview 4322   # then open http://127.0.0.1:4322/preview/
```

For live reloading, run `TECHSIDER_NAV_PREVIEW=1 npm run dev` and open http://localhost:4321/preview/.

To add a gallery page:

1. Append it to `PREVIEW_PAGES` in `src/fixtures/preview-pages.ts`, and add its kind to `PreviewKind`. A template page's slug is `templates/<kind>`, and every title contains "Fixture".
2. Write its specimen in `src/preview/specimens/`. A specimen takes no props, imports its fixtures statically, and passes them to the template.
3. Map the kind to the specimen in `SPECIMENS` in `src/preview/gallery.astro`. `astro check` fails while a registered kind has no specimen.
4. Update the registry test in `tests/preview-route.test.mjs`. `tests/template-gallery.test.mjs` and `tests/e2e/template-gallery.spec.mjs` then sweep the new page with every other one: unique ids, one `h1`, headings in order, no link to a planned page, every link landing, no horizontal scroll at 320px and no axe violations.

### Fixtures

`src/fixtures/` holds the gallery's data. `tests/fixtures.test.mjs` enforces the rules:

- every fixture parses with the same Zod schemas as real content;
- every human-readable string contains "Fixture" or uses example.com, and every URL points at example.com, so nothing can pass for a real organisation, client, document or result;
- only `src/preview/` imports the fixtures, always statically. A module imported both statically and through a dynamic import makes Vite log a warning, and the build gate fails on it;
- every export is deep-frozen, so map, filter or spread a fixture to change it.

Templates never import fixtures: the specimens pass fixture data in, together with `fixtureSite`, the gallery's `SiteContext`, whose links all stay inside the gallery.

### Adding a page

Every page type has a body-only template in `src/templates/`. Its logic lives in a pure TypeScript view builder in `src/lib/views/`, unit-tested with fixtures. A route stays thin:

1. Put the content in its collection or typed data file, where the schemas validate it.
2. Add the route under `src/pages/`, with the helpers in `src/lib/pages.ts`. A single page is a `[...page].astro` file in its own directory (`src/pages/services/[...page].astro` serves `/services/`), whose `getStaticPaths` returns `singletonPaths()` for its path; a collection page is an `[id].astro` file, whose `getStaticPaths` builds the ids `shownIds()` gives for its hub. Either way a page is built only while the nav shows it. The route loads the content, builds the view with the page's builder, passing `siteContext(isPreview())` from `src/lib/site.ts` so that every link follows the nav, and renders the template inside `BaseLayout` with `pageTitle()` and `pageDescription()` from `src/lib/meta.ts` as the title and the meta description. `BaseLayout` has no default description, so `astro check` fails a route that leaves it out. Fixed copy, such as the disclaimers and badges, comes from `src/lib/fixed-copy.ts`, never from content.
3. Write the page's meta description in `src/data/nav.ts`, the single source of page identity, by wrapping its entry in `describe(page(…), "…")`: unique, and 150–160 characters (spec §11.3). `pageDescription()` fails the build without one, and `tests/meta.test.mjs` requires one of every live page and holds each built page to its own.
4. Set the page's `status` to `"live"` in `src/data/nav.ts`. Until then the production build leaves the page out, the nav skips it, every link to it renders as plain text, and contact links fall back to email.

`src/pages/404.astro` and `src/pages/insights/index.astro` are working examples. A single page's route is short:

```astro
---
// src/pages/services/[...page].astro
import type { GetStaticPaths } from "astro";
import BaseLayout from "../../layouts/BaseLayout.astro";
import ServicesTemplate from "../../templates/ServicesTemplate.astro";
import { isPreview } from "../../data/nav";
import { SERVICES } from "../../data/services"; // the typed Services data (servicesData in page-schemas.ts)
import { pageDescription, pageTitle } from "../../lib/meta";
import { pageAt, singletonPaths } from "../../lib/pages";
import { siteContext } from "../../lib/site";

export const getStaticPaths = (() => singletonPaths("/services/")) satisfies GetStaticPaths;

const page = pageAt("/services/");
---
<BaseLayout title={pageTitle(page)} description={pageDescription(page)}>
  <ServicesTemplate services={SERVICES} site={siteContext(isPreview())} />
</BaseLayout>
```

A collection page builds the shown ids that have content:

```astro
---
// src/pages/solutions/[id].astro
import type { GetStaticPaths } from "astro";
import { getCollection } from "astro:content";
import BaseLayout from "../../layouts/BaseLayout.astro";
import SolutionTemplate from "../../templates/SolutionTemplate.astro";
import { isPreview } from "../../data/nav";
import { SERVICES } from "../../data/services";
import { pageDescription, pageTitle } from "../../lib/meta";
import { pageAt, shownIds } from "../../lib/pages";
import { siteContext } from "../../lib/site";
import { solutionView } from "../../lib/views/solution";

export const getStaticPaths = (async () => {
  const entries = await getCollection("solutions");
  return shownIds("/solutions/").map((id) => {
    const entry = entries.find((e) => e.id === id);
    if (!entry) throw new Error(`/solutions/${id}/ is shown, but src/content/solutions/${id}.yaml doesn't exist`);
    return { params: { id }, props: { entry } };
  });
}) satisfies GetStaticPaths;

const { entry } = Astro.props;
const page = pageAt(`/solutions/${entry.id}/`);
const view = solutionView({ id: entry.id, data: entry.data, shared: SERVICES, site: siteContext(isPreview()) });
---
<BaseLayout title={pageTitle(page)} description={pageDescription(page)}>
  <SolutionTemplate view={view} />
</BaseLayout>
```

### Putting a page live

`src/data/nav.ts` decides what production builds. Every page there is `planned` or `live`:

- **Planned:** the preview build renders it, so its route, template and content are built and tested, but production builds no file for it. The nav and footer leave it out, and every link to it renders as plain text (while `/contact/` is planned, contact links fall back to email).
- **Live:** production builds it, and it is held to every rule the production build is: the CI checks, including check `02-links` (every link and fragment lands, so a live page can't link to a planned one), and the three site-wide sweeps of `dist/`. `tests/site-sweep.test.mjs` checks one `h1`, heading order, unique ids, a title and description no other page shares, and one canonical URL. `tests/e2e/prod-site-sweep.spec.mjs` runs axe at 390px and 1280px, checks for horizontal scroll at 320px with and without JavaScript, and follows every link in `<main>`. `tests/e2e/prod-interactive-sweep.spec.mjs` holds what a visitor reaches with JavaScript to the same rules: each demo paused mid-run and at its result, and every checkbox ticked. It also checks that no page requests anything from another origin or makes a network call of its own (fetch, XHR, WebSocket, EventSource or a beacon, even to the site itself), that every request succeeds, and that no script errs. All three read the page list from `dist/`, so a page is swept from the build in which it goes live.

A page goes live in one commit. It writes the page's content, its route and its meta description (`describe()` in `src/data/nav.ts`), flips its `status`, and updates the tests that pin the live set, such as `tests/nav-data.test.mjs` and the production shell specs. A page written before it goes live, such as Trust, already has its route under `src/pages/`: its `getStaticPaths` returns `singletonPaths()` from `src/lib/pages.ts`, which builds the page only while `nav.ts` shows it, so flipping its `status` publishes it and no route file moves.

Content can be written and still wait: for a fact to be re-checked, a review, or a business confirmation. Until then the statement stays out of the copy, or its page stays `planned`, and the open item is a `⚑` comment beside the data it concerns. Check `07-verify-markers`, a launch gate, lists every open `⚑` and fails the launch build while any is left. `tests/content-language.test.mjs` keeps held and unverified statements out of the built pages, keeps enterprise vocabulary off the mid-market pages, and checks the proper names the banned-phrase exceptions let through.

### Demos and the checker

Every demo is a canned replay or a client-side tool: no demo, and not the checker, calls a model or any other network endpoint (spec §8.7, §9.1). Each solution has one demo file, `src/data/demos/<solution id>.json`, which `makeDemoSchema()` in `src/content/schemas.ts` validates by its `kind`:

| Kind | Solution | What the demo shows |
|---|---|---|
| `register` | ① Document Registers | A management agreement register over synthetic agreements, and a trust deed register over synthetic deeds. Each value opens the page it came from, and the synthetic set downloads from `public/downloads/`. |
| `assistant` | ② Knowledge Assistant | Cited answers over public CC BY 4.0 text: the Victorian public sector's generative AI guideline and its guidance first, then APRA's CPS 230. It shows refusals, and a false answer the acceptance test caught. |
| `inbox` | ③ Draft-for-Approval | Eight synthetic property-management emails and texts. Each is sorted, then drafted for approval, filed or, for the one ambiguous message, escalated. The drafts are internal (a work order, a task, two owner updates and a reply to a contractor), never a reply to a tenant. The run ends on the approval queue and the trace. |
| `report` | ④ AI Evaluation | The sample evaluation report on the ② demo, with the fixed sample-report caption. |
| `checker` | ⑤ AI Switch-On | The "What you already pay for" checker. |

Every demo file keeps three rules:

- **Provenance.** Every replay and the sample report are `provenance: "illustrative"`, and every page that renders one shows the label. The checker's file is `"sourced"`: its data is real, dated vendor facts, so its frame carries no illustrative label, and check `06-provenance` accepts `"sourced"` from a checker file only. A `measured` file needs `run`, a committed harness run under `src/data/runs/`, which check `06-provenance` verifies. Scores, latencies and counts are typed `{ value, unit? }` metrics, never numbers in free text.
- **Synthetic data looks synthetic.** Organisation and person names are invented, every document title says "Synthetic", and nothing is a real address, ABN or phone number. The only email domain is `example.com`.
- **Public text keeps its licence terms.** Each ② corpus carries its publisher's attribution, with the licence and source links, and its source panel quotes the passages as published. Where the answers paraphrase (CPS 230), the attribution's changes clause says so (CC BY 4.0 §3(a)(1)(B)); where they quote word for word (the Victorian guideline), it says "wording unchanged".

The replay engine is `src/scripts/demo-engine.ts`, over `src/scripts/playback.ts`, with one renderer for each replayed kind (`register`, `assistant` and `inbox`) in `src/scripts/demo/`. Each replay sits in a `DemoFrame` (`src/components/page/DemoFrame.astro`) and keeps the same contract (spec §6.5, §8.8):

- the controls, `src/components/demo/DemoControls.astro` (Pause/Resume, "Skip to result" and Replay), come before the animation in DOM order, and stay hidden without JavaScript;
- Pause/Resume and "Skip to result" work for the whole run, and Replay is never the only control and is never disabled. When a run ends and disables a control that has keyboard focus, focus moves to Replay first, never to `<body>`;
- the animation plays in an `aria-hidden` stage that is never a live region, and each finished step is announced once through a visually hidden `aria-live="polite"` log. The engine then holds the run for `STEP_GAP` (2.5 s), so a screen reader can finish one line before the next lands;
- "Skip to result" shows the static transcript's content, and with `prefers-reduced-motion` nothing animates: the final state shows at once;
- without JavaScript, the static transcript (the frame's `transcript` slot) reads in full;
- each demo's script is its own chunk, loaded only on a page that shows that demo (spec §11.4).

The checker, `src/components/demo/PlatformChecker.astro` with `src/scripts/checker.ts`, renders on `/resources/what-you-already-pay-for/`, its canonical page, and on the ⑤ demo page. It reads the dated vendor facts in `src/data/platform-ai.json`, bundled at build time, and shows their "as at" date. Re-check every entry against its `source` every quarter (spec §11.6): update the entry and its `asAt`, then the file's `asAt`. A fact the research couldn't verify stays out of the file until someone does. A processing location the vendor doesn't publish starts with "Not published", and the checker shows exactly that.

The ④ sample report stays illustrative until the evaluation harness produces a measured run. `SampleReport` labels it "Illustrative sample: not a real test run", and the `⚑` in `src/data/runs/README.md` keeps check `07-verify-markers` failing the launch build until the report comes from a committed run.

### Tests

`npm test` runs every `tests/*.test.mjs` file with `node:test`. The unit tests import the TypeScript sources directly. The markup tests read the built pages through `readDist()` (`dist/`) and `readPreviewDist()` (`dist-preview/`) from `tests/helpers.mjs`, so build both first:

```bash
npm run build && npm run build:preview && npm test
```

`npm run test:e2e` builds both, then runs Playwright. `playwright.config.mjs` has four projects, and `tests/support/static-server.mjs` serves each build:

| Project | Specs | Build |
|---|---|---|
| `chromium`, `webkit`, `firefox` | every spec in `tests/e2e/` except `prod-*.spec.mjs` | `dist-preview/`, on port 4322 |
| `prod-chromium` | `prod-*.spec.mjs` | `dist/`, on port 4323 |

Once both builds exist, run Playwright directly. Put spec paths before `--project`, which takes several values:

```bash
npx playwright install chromium webkit firefox   # once
npx playwright test tests/e2e/template-gallery.spec.mjs --project chromium --project webkit
```

The specs move focus with `focusKeys()` from `tests/support/keys.mjs`, because WebKit on macOS skips links on a plain Tab. They run axe against the WCAG 2.2 A and AA rules. CI (`.github/workflows/ci.yml`) runs every project on Ubuntu, Firefox included.

## Deploy

Push to `main`. `.github/workflows/deploy.yml` runs `npm run build` with `VERIFY_MODE=gate` and publishes `dist/` to GitHub Pages. It also rebuilds `main` on a weekly schedule, so date-based content, such as the Home page's latest insights, moves on without a push. No other branch deploys: a push to any branch, and every pull request, runs `.github/workflows/ci.yml` instead.

The custom domain is configured via `public/CNAME`. After enabling GitHub Pages (Settings → Pages → Source: GitHub Actions), point DNS at your registrar:

- Apex `techsider.com.au` → ALIAS/ANAME `techsiderau.github.io`, or A records to `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
- Optional `www.techsider.com.au` → CNAME `techsiderau.github.io`

Then enable "Enforce HTTPS" once the cert provisions.

## Where things live

- `src/data/nav.ts`: every page's names, path, group, status (`live` or `planned`) and meta description.
- `src/content/`: the content collections (insights, solutions, industries, kits, documents) and their schemas.
- `src/data/`: typed data (regulatory rows, demos, traces, harness runs, the checker's vendor facts) and the CI exception lists.
- `src/layouts/`: `BaseLayout.astro` (the shell), `PostLayout.astro` (one insight) and `PreviewLayout.astro` (the gallery only).
- `src/components/site/`: the header and the footer. `src/components/ui/`: the shared components. `src/components/page/`: the page kit that templates are built from. `src/components/demo/`: the demo controls, engines and static transcripts, and the checker.
- `src/templates/`: the page templates.
- `src/lib/`: the site context, the route helpers (`src/lib/pages.ts`), page titles and descriptions, fixed copy, JSON-LD and smaller helpers, with the view builders in `src/lib/views/`.
- `src/pages/`: the routes.
- `src/preview/`: the `/preview/` gallery, in preview builds only. `src/fixtures/`: its data.
- `src/scripts/`: the client scripts (nav, mobile menu, tabs, the demo engine with its renderers in `src/scripts/demo/`, and the checker).
- `scripts/ci/`: the build gate and the CI checks.
- `tests/`: the `node:test` suites, with Playwright specs in `tests/e2e/` and shared helpers in `tests/support/`.
- `public/`: files copied into the build as they are.
