# Techsider Content Overhaul — Phase 2 (/insights blog) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the `/insights` technical blog — Astro content collection, index + post pages, an on-page "Insights" surface, and an RSS feed — seeded with three flagship posts that serve as Techsider's primary demonstrated-expertise credibility signal.

**Architecture:** Astro 5 content collections (`src/content.config.ts` + `glob()` loader over `src/content/insights/*.md`), rendered to static pages at build time. A typography-focused `PostLayout`, a `/insights` index, a `[...id]` post route, an `Insights.astro` landing-page surface (3 latest), and an `@astrojs/rss` feed. No backend; no client JS.

**Tech Stack:** Astro 5.18.1, Tailwind v4, `@astrojs/rss`, Astro's built-in Shiki code highlighting. Markdown (not MDX) for v1.

---

## Verification model (read first)

Same as Phase 1: **no unit-test framework** (and we are not adding one — YAGNI for a content site). Per-task loop:

1. **Build gate:** `npm run build` → finishes with no errors (it now also generates `/insights/*` and `/rss.xml`).
2. **Visual check:** `npm run dev` → open the relevant URL and confirm it renders/reads correctly at desktop + mobile widths.
3. **Commit** (message ends with the repo trailer below).

**Trailer** on every commit:
```
Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
```

**Branch:** continue on `content-overhaul` (Phase 1 is already committed there).

**Design tokens** (from `src/styles/global.css`): `bg`, `bg-elev`, `bg-deep`, `text`, `text-mute`, `text-dim`, `accent`, `accent-ink`, `border`, `border-soft`; `font-serif`, `font-sans`. Use these — no raw hex.

**CONTENT VERIFICATION GATE (critical):** The three flagship posts assert how Techsider engineers things. They are drafts written from the methodology the site already states (evals/gates/tracing, hybrid retrieval, inline citations, abstention, vendor-neutrality, AU sovereignty). They contain **no fabricated client work, outcomes, or metrics** — they are framed as "how we approach this." **They must NOT be merged to `main` until the user has read and corrected every technical claim.** Authoring them is in scope; publishing them to production is user-gated.

**Astro 5 API reference** (verified against docs for 5.18.1 — do not use the Astro 4 patterns `src/content/config.ts` or `entry.render()`):
- Config file is `src/content.config.ts`; loader is `glob({ pattern, base })` from `astro/loaders`.
- Query: `getCollection('insights', ({ data }) => data.draft !== true)`.
- Render a post: `import { getCollection, render } from 'astro:content'` then `const { Content } = await render(post)`.
- Dynamic route uses `post.id` for params; entry fields are on `post.data`; raw markdown is `post.body`.

---

## File structure

| File | Action | Responsibility |
|------|--------|----------------|
| `package.json` / lockfile | Modify | Add `@astrojs/rss` |
| `src/content.config.ts` | **Create** | Define the `insights` collection + zod schema |
| `src/lib/readingTime.ts` | **Create** | Derive reading minutes from raw body (shared util) |
| `src/content/insights/evals-before-vibes.md` | **Create** | Flagship post 1 (LLMOps) |
| `src/content/insights/rag-that-survives-an-apra-audit.md` | **Create** | Flagship post 2 (RAG + sovereignty) |
| `src/content/insights/sovereign-llm-hosting-decision-matrix.md` | **Create** | Flagship post 3 (vendor-neutral + sovereignty) |
| `src/layouts/PostLayout.astro` | **Create** | Post page chrome: header, prose styles, Article JSON-LD, CTA |
| `src/pages/insights/[...id].astro` | **Create** | Per-post static route |
| `src/pages/insights/index.astro` | **Create** | Blog index (all posts, newest first) |
| `src/components/Insights.astro` | **Create** | Landing-page surface: 3 latest posts |
| `src/pages/rss.xml.js` | **Create** | RSS feed |
| `src/components/Nav.astro` | Modify | Root-relative anchors + an Insights link (works cross-page) |
| `src/components/Footer.astro` | Modify | Add the `/insights` link (page now exists) |
| `src/pages/index.astro` | Modify | Insert `<Insights />` between Industries and FAQ |

---

## Task 1: Collection config, reading-time util, deps, and the first post

This task installs the RSS dep, defines the collection (validated against a real post so the build exercises the schema), and adds the reading-time util.

**Files:**
- Modify: `package.json` (via npm)
- Create: `src/content.config.ts`
- Create: `src/lib/readingTime.ts`
- Create: `src/content/insights/evals-before-vibes.md`

- [ ] **Step 1: Install @astrojs/rss**

Run: `npm install @astrojs/rss`
Expected: adds `@astrojs/rss` to `package.json` dependencies; no errors.

- [ ] **Step 2: Create the reading-time util**

Create `src/lib/readingTime.ts`:

```ts
/** Estimate reading time in whole minutes from raw markdown body (~200 wpm). */
export function readingMinutes(body: string | undefined): number {
  const words = (body ?? "").trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}
```

- [ ] **Step 3: Create the collection config**

Create `src/content.config.ts`:

```ts
import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const insights = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/insights" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    publishDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    pillar: z.enum([
      "LLMOps & reliability",
      "RAG & retrieval",
      "Agentic systems",
      "Sovereignty & compliance",
      "Vendor-neutral platform",
      "How we deliver",
    ]),
    sectors: z
      .array(
        z.enum([
          "Financial services",
          "Government & public sector",
          "Healthcare & life sciences",
          "Resources, energy & utilities",
        ]),
      )
      .optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { insights };
```

- [ ] **Step 4: Create the first flagship post**

Create `src/content/insights/evals-before-vibes.md` with exactly:

```markdown
---
title: "Evals before vibes: the gates we run on every LLM release"
description: "How we stop 'looked good in the demo' from reaching production — the offline eval suite, the regression gate, and the tracing we wire in from day one."
publishDate: 2026-06-09
pillar: "LLMOps & reliability"
draft: false
---

Most LLM features ship on vibes. Someone tries a handful of prompts, the output looks good, and it goes live. Then a "small" prompt tweak three weeks later quietly breaks a case nobody re-checked — and in a regulated business, "it seemed fine" is not an answer you can give an auditor.

We treat an LLM system like any other production system: it doesn't ship until it passes a gate, and the gate is built on measurement, not impressions.

## Vibes don't survive change

The core problem is that LLM behaviour is coupled in ways you can't see. A change that improves one example often regresses ten others. Without a measurement you re-run on every change, you have no way to know whether you moved forward or sideways. Manual spot-checking doesn't scale past the first week, and it never covers the cases that actually matter — the rare, high-consequence ones.

## The offline eval suite is the unit test of an LLM system

Before a feature is "done," we build an evaluation set: representative inputs paired with the properties a correct answer must have. Not always exact strings — usually a mix of checks:

- **Programmatic checks** where behaviour is binary: did it cite a source? did it refuse when the answer wasn't in the provided documents? did it stay within scope?
- **Reference checks** where there's a known-good answer or required facts.
- **Rubric / LLM-as-judge** grading where quality is fuzzier, with the judge itself validated against human labels so we trust its scores.

A single case looks like this:

```yaml
- input: "What are our incident-notification timeframes under CPS 230?"
  must_cite: true
  must_contain: ["business day"]
  must_not: ["I think", "probably", "as an AI"]
```

The suite runs in CI on every change to a prompt, a model, a retrieval setting, or a tool definition.

## Gates, not dashboards

A dashboard you have to remember to look at is not a control. We turn the eval suite into a **promotion gate**: a change is allowed into production only if the aggregate score clears a threshold **and** there is zero regression on the "must never break" subset — the cases tied to compliance, safety, or money. Below the line, the release simply doesn't ship. The gate is the same whether the change is a one-word prompt edit or a model upgrade.

## Tracing so failures are explainable

Every request in production emits a trace: the retrieved context, the assembled prompt, the model and parameters, token counts, latency, cost, and — where applicable — the grader outcomes. When something goes wrong, you replay the exact request instead of guessing. For regulated buyers this is not just debugging; it is the audit trail that shows how a given answer was produced.

## What "day one" actually means

The eval harness, the CI gate, and tracing go in during the first week of a build — not bolted on after the first incident. It feels slower for a fortnight and then it is permanently faster, because every subsequent change is safe to make. That is the whole point: discipline up front is what lets you move quickly later without breaking the things you can't afford to break.

*This is how we build. If you want it on your own workload, our paid two-week discovery is where we scope it.*
```

- [ ] **Step 5: Build gate**

Run: `npm run build`
Expected: completes with no errors; the schema validates against the post (no zod errors).

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/content.config.ts src/lib/readingTime.ts src/content/insights/evals-before-vibes.md
git commit -m "feat: insights content collection, reading-time util, first post"
```

---

## Task 2: Post layout and the [...id] route

**Files:**
- Create: `src/layouts/PostLayout.astro`
- Create: `src/pages/insights/[...id].astro`

- [ ] **Step 1: Create PostLayout**

Create `src/layouts/PostLayout.astro` with exactly:

```astro
---
import BaseLayout from "./BaseLayout.astro";
import Nav from "../components/Nav.astro";

interface Props {
  title: string;
  description: string;
  publishDate: Date;
  updatedDate?: Date;
  pillar: string;
  minutes: number;
}

const { title, description, publishDate, updatedDate, pillar, minutes } = Astro.props;
const fmt = (d: Date) =>
  d.toLocaleDateString("en-AU", { year: "numeric", month: "long", day: "numeric" });
const canonical = new URL(Astro.url.pathname, Astro.site).toString();
const articleJsonLd = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: title,
  description,
  datePublished: publishDate.toISOString(),
  ...(updatedDate ? { dateModified: updatedDate.toISOString() } : {}),
  author: { "@type": "Organization", name: "Techsider" },
  publisher: { "@type": "Organization", name: "Techsider" },
  mainEntityOfPage: canonical,
};
---
<BaseLayout title={`${title} — Techsider`} description={description}>
  <Nav />
  <article class="px-6 py-16 md:py-24">
    <div class="max-w-2xl mx-auto">
      <a href="/insights" class="text-xs uppercase tracking-[0.16em] text-accent hover:opacity-80 transition-opacity">
        ← Insights
      </a>
      <p class="mt-6 text-[11px] uppercase tracking-[0.18em] text-text-dim">{pillar}</p>
      <h1 class="font-serif font-normal text-3xl md:text-5xl leading-[1.1] tracking-tight text-text mt-3 mb-4">
        {title}
      </h1>
      <p class="text-sm text-text-dim">{fmt(publishDate)} · {minutes} min read</p>
      <div class="post-prose mt-10 text-text-mute">
        <slot />
      </div>
      <hr class="my-12 border-border" />
      <p class="text-sm text-text-mute">
        Want this on your own corpus and infrastructure? Our paid two-week discovery scopes it.
        <a href="mailto:admin@techsider.com.au" class="text-accent hover:opacity-90 transition-opacity whitespace-nowrap">Scope your AI build →</a>
      </p>
    </div>
  </article>
  <script type="application/ld+json" set:html={JSON.stringify(articleJsonLd)} />
</BaseLayout>

<style>
  .post-prose :global(h2) {
    font-family: var(--font-serif);
    color: var(--color-text);
    font-size: 1.6rem;
    line-height: 1.25;
    margin: 2.2rem 0 0.75rem;
  }
  .post-prose :global(h3) {
    color: var(--color-text);
    font-weight: 600;
    font-size: 1.1rem;
    margin: 1.8rem 0 0.5rem;
  }
  .post-prose :global(p) { margin: 0 0 1.1rem; line-height: 1.75; }
  .post-prose :global(ul),
  .post-prose :global(ol) { margin: 0 0 1.1rem 1.25rem; line-height: 1.75; }
  .post-prose :global(ul) { list-style: disc; }
  .post-prose :global(ol) { list-style: decimal; }
  .post-prose :global(li) { margin: 0.3rem 0; }
  .post-prose :global(strong) { color: var(--color-text); font-weight: 600; }
  .post-prose :global(em) { font-style: italic; }
  .post-prose :global(a) {
    color: var(--color-accent);
    text-decoration: underline;
    text-underline-offset: 2px;
  }
  .post-prose :global(blockquote) {
    border-left: 2px solid var(--color-accent);
    padding-left: 1rem;
    margin: 1.5rem 0;
    color: var(--color-text-dim);
    font-style: italic;
  }
  .post-prose :global(code) {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 0.85em;
    background: var(--color-bg-elev);
    padding: 0.15em 0.4em;
    border-radius: 4px;
    color: var(--color-text);
  }
  .post-prose :global(pre) {
    border: 1px solid var(--color-border);
    border-radius: 8px;
    padding: 1rem 1.25rem;
    overflow-x: auto;
    margin: 1.5rem 0;
    font-size: 0.85rem;
    line-height: 1.6;
  }
  .post-prose :global(pre code) { background: none; padding: 0; }
  .post-prose :global(table) {
    width: 100%;
    border-collapse: collapse;
    margin: 1.5rem 0;
    font-size: 0.9rem;
  }
  .post-prose :global(th),
  .post-prose :global(td) {
    border: 1px solid var(--color-border);
    padding: 0.5rem 0.75rem;
    text-align: left;
  }
  .post-prose :global(th) { color: var(--color-text); font-weight: 600; }
</style>
```

(Shiki sets its own inline background on `<pre>` code blocks; the border/padding/radius above still apply. `<Nav>` is included so posts have site navigation — Task 5 makes its anchors root-relative so they work from a subpage.)

- [ ] **Step 2: Create the post route**

Create `src/pages/insights/[...id].astro` with exactly:

```astro
---
import { getCollection, render } from "astro:content";
import PostLayout from "../../layouts/PostLayout.astro";
import { readingMinutes } from "../../lib/readingTime";

export async function getStaticPaths() {
  const posts = await getCollection("insights", ({ data }) => data.draft !== true);
  return posts.map((post) => ({ params: { id: post.id }, props: { post } }));
}

const { post } = Astro.props;
const { Content } = await render(post);
const minutes = readingMinutes(post.body);
---
<PostLayout
  title={post.data.title}
  description={post.data.description}
  publishDate={post.data.publishDate}
  updatedDate={post.data.updatedDate}
  pillar={post.data.pillar}
  minutes={minutes}
>
  <Content />
</PostLayout>
```

- [ ] **Step 3: Build gate**

Run: `npm run build`
Expected: completes; build output lists `/insights/evals-before-vibes/index.html`.

- [ ] **Step 4: Visual check**

`npm run dev` → open `http://localhost:4321/insights/evals-before-vibes`. Confirm: header (pillar, title, date, reading time), readable prose, the code block is styled, the YAML block highlights, the back-link and CTA work, and the Nav renders.

- [ ] **Step 5: Commit**

```bash
git add src/layouts/PostLayout.astro src/pages/insights/[...id].astro
git commit -m "feat: post layout and /insights/[id] route"
```

---

## Task 3: The /insights index page

**Files:**
- Create: `src/pages/insights/index.astro`

- [ ] **Step 1: Create the index**

Create `src/pages/insights/index.astro` with exactly:

```astro
---
import BaseLayout from "../../layouts/BaseLayout.astro";
import Nav from "../../components/Nav.astro";
import { getCollection } from "astro:content";
import { readingMinutes } from "../../lib/readingTime";

const posts = (await getCollection("insights", ({ data }) => data.draft !== true)).sort(
  (a, b) => b.data.publishDate.valueOf() - a.data.publishDate.valueOf(),
);
const fmt = (d: Date) =>
  d.toLocaleDateString("en-AU", { year: "numeric", month: "long", day: "numeric" });
---
<BaseLayout
  title="Insights — Techsider"
  description="Field notes on production LLM systems, RAG, agents, and AI data sovereignty for Australian regulated industries."
>
  <Nav />
  <section class="px-6 py-16 md:py-24">
    <div class="max-w-3xl mx-auto">
      <p class="text-xs uppercase tracking-[0.2em] text-accent font-medium mb-4">Insights</p>
      <h1 class="font-serif font-normal text-4xl md:text-5xl leading-[1.1] tracking-tight text-text mb-4">
        Notes from the build.
      </h1>
      <p class="text-text-mute text-base leading-relaxed max-w-[54ch] mb-12">
        How we engineer production AI for regulated industries — evals, retrieval, agents, and sovereignty. Written for the people who'll run it.
      </p>
      <ul class="border-t border-border">
        {posts.map((post) => (
          <li class="border-b border-border py-7">
            <a href={`/insights/${post.id}`} class="group block">
              <p class="text-[11px] uppercase tracking-[0.18em] text-text-dim mb-2">
                {post.data.pillar} · {fmt(post.data.publishDate)} · {readingMinutes(post.body)} min read
              </p>
              <h2 class="font-serif font-normal text-xl md:text-2xl text-text leading-snug mb-2 group-hover:text-accent transition-colors">
                {post.data.title}
              </h2>
              <p class="text-text-dim text-sm leading-relaxed">{post.data.description}</p>
            </a>
          </li>
        ))}
      </ul>
    </div>
  </section>
</BaseLayout>
```

- [ ] **Step 2: Build gate**

Run: `npm run build`
Expected: completes; `/insights/index.html` generated.

- [ ] **Step 3: Visual check**

`npm run dev` → open `http://localhost:4321/insights`. Confirm the post is listed with pillar/date/reading-time, and the title links to the post.

- [ ] **Step 4: Commit**

```bash
git add src/pages/insights/index.astro
git commit -m "feat: /insights index page"
```

---

## Task 4: RSS feed

**Files:**
- Create: `src/pages/rss.xml.js`

- [ ] **Step 1: Create the feed**

Create `src/pages/rss.xml.js` with exactly:

```js
import rss from "@astrojs/rss";
import { getCollection } from "astro:content";

export async function GET(context) {
  const posts = (await getCollection("insights", ({ data }) => data.draft !== true)).sort(
    (a, b) => b.data.publishDate.valueOf() - a.data.publishDate.valueOf(),
  );
  return rss({
    title: "Techsider — Insights",
    description:
      "Field notes on production LLM systems, RAG, agents, and AI data sovereignty for Australian regulated industries.",
    site: context.site,
    items: posts.map((post) => ({
      title: post.data.title,
      pubDate: post.data.publishDate,
      description: post.data.description,
      link: `/insights/${post.id}/`,
    })),
  });
}
```

- [ ] **Step 2: Build gate**

Run: `npm run build`
Expected: completes; `dist/rss.xml` exists.

- [ ] **Step 3: Verify the feed**

Run: `npm run preview`, open the served `/rss.xml`. Confirm it is valid XML listing the post with an absolute link under `https://techsider.com.au/insights/...`.

- [ ] **Step 4: Commit**

```bash
git add src/pages/rss.xml.js
git commit -m "feat: RSS feed for /insights"
```

---

## Task 5: On-page Insights surface + cross-page nav wiring

Add the landing-page "3 latest posts" surface, make the Nav usable from sub-pages, add the `/insights` links, and wire the surface into the page between Industries and FAQ (spec slot #9).

**Files:**
- Create: `src/components/Insights.astro`
- Modify: `src/components/Nav.astro`
- Modify: `src/components/Footer.astro`
- Modify: `src/pages/index.astro`

- [ ] **Step 1: Create the Insights surface**

Create `src/components/Insights.astro` with exactly:

```astro
---
import { getCollection } from "astro:content";
import { readingMinutes } from "../lib/readingTime";

const posts = (await getCollection("insights", ({ data }) => data.draft !== true))
  .sort((a, b) => b.data.publishDate.valueOf() - a.data.publishDate.valueOf())
  .slice(0, 3);
const fmt = (d: Date) =>
  d.toLocaleDateString("en-AU", { year: "numeric", month: "long", day: "numeric" });
---
<section id="insights" class="px-6 py-24 md:py-32 border-b border-border">
  <div class="max-w-6xl mx-auto">
    <div class="flex items-end justify-between gap-6 mb-12">
      <div>
        <p class="text-xs uppercase tracking-[0.2em] text-accent font-medium mb-4">Insights</p>
        <h2 class="font-serif font-normal text-3xl md:text-4xl leading-[1.15] text-text max-w-[22ch]">
          How we think about production AI.
        </h2>
      </div>
      <a href="/insights" class="hidden sm:inline text-sm text-text-mute hover:text-text transition-colors whitespace-nowrap">
        All insights →
      </a>
    </div>
    <div class="grid gap-6 md:grid-cols-3">
      {posts.map((post) => (
        <a href={`/insights/${post.id}`} class="group bg-bg-elev border border-border rounded-xl p-6 md:p-7 block">
          <p class="text-[11px] uppercase tracking-[0.16em] text-text-dim mb-3">
            {post.data.pillar}
          </p>
          <h3 class="text-text font-semibold text-base leading-snug mb-3 group-hover:text-accent transition-colors">
            {post.data.title}
          </h3>
          <p class="text-text-dim text-sm leading-relaxed mb-4">{post.data.description}</p>
          <p class="text-[11px] text-text-dim">{fmt(post.data.publishDate)} · {readingMinutes(post.body)} min read</p>
        </a>
      ))}
    </div>
    <a href="/insights" class="sm:hidden inline-block mt-8 text-sm text-text-mute hover:text-text transition-colors">
      All insights →
    </a>
  </div>
</section>
```

- [ ] **Step 2: Make Nav anchors root-relative and add an Insights link**

In `src/components/Nav.astro`, replace the inner links container so the section anchors are root-relative (work from `/insights/*` too) and an Insights link is added:

```astro
    <div class="flex items-center gap-5 sm:gap-7">
      <a href="/#services" class="hidden sm:inline text-xs uppercase tracking-[0.08em] text-text-mute hover:text-text transition-colors">Services</a>
      <a href="/#industries" class="hidden sm:inline text-xs uppercase tracking-[0.08em] text-text-mute hover:text-text transition-colors">Industries</a>
      <a href="/#approach" class="hidden sm:inline text-xs uppercase tracking-[0.08em] text-text-mute hover:text-text transition-colors">Approach</a>
      <a href="/insights" class="hidden sm:inline text-xs uppercase tracking-[0.08em] text-text-mute hover:text-text transition-colors">Insights</a>
      <a href="/#contact" class="hidden sm:inline text-xs uppercase tracking-[0.08em] text-text-mute hover:text-text transition-colors">Contact</a>
      <a href="mailto:admin@techsider.com.au" class="text-xs font-semibold bg-accent text-accent-ink px-3 py-1.5 rounded hover:opacity-90 transition-opacity">
        Scope your AI build
      </a>
    </div>
```

- [ ] **Step 3: Add the /insights link to the Footer**

In `src/components/Footer.astro`, add an Insights link in the right-hand link group, before LinkedIn:

```astro
      <div class="flex gap-5 text-xs text-text-dim">
        <a href="/insights" class="hover:text-text transition-colors">Insights</a>
        <a href="https://www.linkedin.com/" target="_blank" rel="noopener" class="hover:text-text transition-colors">LinkedIn</a>
        <a href="https://github.com/" target="_blank" rel="noopener" class="hover:text-text transition-colors">GitHub</a>
      </div>
```

- [ ] **Step 4: Wire the surface into the landing page**

In `src/pages/index.astro`, import `Insights` and place it between `<Industries />` and `<Faq />`. The frontmatter import list and body become:

```astro
---
import BaseLayout from "../layouts/BaseLayout.astro";
import Nav from "../components/Nav.astro";
import Hero from "../components/Hero.astro";
import TrustStrip from "../components/TrustStrip.astro";
import Services from "../components/Services.astro";
import Approach from "../components/Approach.astro";
import WhyUs from "../components/WhyUs.astro";
import Industries from "../components/Industries.astro";
import Insights from "../components/Insights.astro";
import Faq from "../components/Faq.astro";
import Contact from "../components/Contact.astro";
---

<BaseLayout>
  <Nav />
  <Hero />
  <TrustStrip />
  <Services />
  <Approach />
  <WhyUs />
  <Industries />
  <Insights />
  <Faq />
  <Contact />
</BaseLayout>
```

- [ ] **Step 5: Build gate**

Run: `npm run build`
Expected: completes with no errors.

- [ ] **Step 6: Visual check**

`npm run dev` → on `/` confirm the Insights section appears between Industries and FAQ with the (currently one) post card and the "All insights →" link; confirm the nav Insights link works and, from a post page, the `/#services` etc. links jump back to the homepage sections.

- [ ] **Step 7: Commit**

```bash
git add src/components/Insights.astro src/components/Nav.astro src/components/Footer.astro src/pages/index.astro
git commit -m "feat: on-page Insights surface; cross-page nav + footer links"
```

---

## Task 6: Flagship post 2 — RAG that survives an APRA audit

**Files:**
- Create: `src/content/insights/rag-that-survives-an-apra-audit.md`

- [ ] **Step 1: Create the post**

Create `src/content/insights/rag-that-survives-an-apra-audit.md` with exactly:

```markdown
---
title: "Shipping a RAG system that survives an APRA audit"
description: "Grounding, inline citations, retrieval evals, and a refusal path — the engineering that makes a retrieval system answer to an auditor, not just a demo."
publishDate: 2026-06-12
pillar: "RAG & retrieval"
sectors: ["Financial services"]
draft: false
---

A retrieval system that "answers questions about your documents" demos beautifully and ages badly. In financial services the answer it gives can shape a decision a regulator later reviews, and APRA's expectations around operational risk (CPS 230) and information security (CPS 234) push hard toward traceability and control. A system that cannot show *where* an answer came from is not an asset — it is a liability waiting for an audit.

Here is the engineering that separates a RAG system you can stand behind from a chatbot bolted onto your document store.

## Citations down to the clause

Every factual sentence in an answer must resolve to the exact source it came from — the document, the section, and the specific text that grounds the claim — not just a filename in a footnote. That means the generation step is constrained to cite as it writes, and the UI lets a reviewer click any claim and land on the sentence that supports it. If a statement can't be traced to a retrieved source, it doesn't belong in the answer.

## Retrieval is the part that actually fails

Most "hallucinations" in a well-built RAG system are really retrieval misses: the model was never given the right context, so it filled the gap. We evaluate retrieval as its own layer, separately from generation:

| Layer | What we measure | The gate |
|---|---|---|
| Retrieval | recall@k on a labelled query set | the right chunk is in the top-k |
| Generation | faithfulness / groundedness | every claim is supported by retrieved text |
| Behaviour | abstention correctness | refuses when the answer isn't present |

We use hybrid retrieval — lexical and dense together — because pure embedding search reliably misses exact-term queries, and "what does clause 34 of CPS 230 require" is exactly the kind of query a compliance user types.

## The most important answer is "no"

The single most valuable behaviour in a regulated RAG system is a clean refusal: *"That isn't stated in the provided documents."* We build an explicit abstention path with a confidence threshold, and when it trips, the system escalates to a human rather than guessing. A system that always produces a confident-sounding answer is the dangerous one — it has simply moved its failures somewhere you can't see them.

## A trace per query, for the auditor

Every query emits a trace: the question, the retrieved chunks and their scores, the assembled prompt, the generated answer, the citations, and the eval outcomes. This is the same observability we use to debug — and it is exactly what an auditor needs to understand how a specific answer was produced on a specific day.

## Sovereignty is part of the design, not a deployment note

For an APRA-regulated workload, where the data lives and who can touch it is a design input, not an afterthought. The pipeline runs inside your boundary, your documents aren't sent offshore, and they aren't used to train anyone's model. The sovereignty story and the audit story are the same story: control you can demonstrate.

*This is how we approach regulated retrieval. Bringing it to your corpus starts with a paid two-week discovery.*
```

- [ ] **Step 2: Build gate**

Run: `npm run build`
Expected: completes; `/insights/rag-that-survives-an-apra-audit/index.html` generated and the table renders.

- [ ] **Step 3: Visual check**

`npm run dev` → open the post; confirm the markdown table renders with the prose styles.

- [ ] **Step 4: Commit**

```bash
git add src/content/insights/rag-that-survives-an-apra-audit.md
git commit -m "content: flagship post — RAG that survives an APRA audit"
```

---

## Task 7: Flagship post 3 — Sovereign LLM hosting decision matrix

**Files:**
- Create: `src/content/insights/sovereign-llm-hosting-decision-matrix.md`

- [ ] **Step 1: Create the post**

Create `src/content/insights/sovereign-llm-hosting-decision-matrix.md` with exactly:

```markdown
---
title: "Self-hosted vs Bedrock vs Azure OpenAI for sovereign workloads in Australia"
description: "A practical decision framework for where your model actually runs when data residency and sovereignty are hard constraints — and how to keep the choice reversible."
publishDate: 2026-06-14
pillar: "Vendor-neutral platform"
sectors: ["Government & public sector", "Financial services"]
draft: false
---

"Which model should we use?" is almost never the real question. Underneath it is a harder one: *where does our data go, and who is able to touch it?* For Australian regulated workloads, residency and control frequently decide the architecture before raw model capability gets a vote. This is a framework for making that decision deliberately — and for making sure you can change your mind later.

## The three shapes of the answer

- **Self-hosted** — open-weight models running on infrastructure you control (your VPC, or on-prem). Maximum control over data and isolation; you own the operational burden of serving, scaling, and patching.
- **AWS Bedrock (Sydney region)** — managed, regional access to multiple model families including Anthropic's, with data kept in-region under AWS's contractual terms.
- **Azure OpenAI (Australia East)** — managed, regional access to the OpenAI model family, often the path of least resistance for organisations already standardised on Microsoft and aligned to government frameworks.

## A decision matrix, not a favourite

| Dimension | Self-hosted | Bedrock (Sydney) | Azure OpenAI (AU East) |
|---|---|---|---|
| Data residency | Wherever you run it | In-region | In-region |
| Control over data use | Full | Contractual | Contractual |
| Model choice | Open weights | Multi-vendor (incl. Anthropic) | OpenAI family |
| Operational burden | High | Low | Low |
| Typical best fit | Strict isolation / IRAP-heavy | Multi-model needs / AWS estate | Microsoft estate / gov alignment |

There is no globally correct row. A government agency with strict isolation requirements lands in a different place than a bank already deep in one cloud. The job is to weight the dimensions against *your* constraints — and the residency and control columns usually carry the most weight in regulated settings.

> Cloud regions, model availability, and certifications change frequently. Treat the specifics above as a starting framework and confirm current regional and compliance details for your own procurement.

## Build so the choice is reversible

Whatever you pick first, you will eventually want to change it — a new model lands, pricing shifts, a residency rule tightens. We put a **model gateway** between the application and the provider, so the model is a configuration choice rather than an architectural commitment. Prompts, evals, and tracing sit above the gateway and don't care who serves the tokens. Done well, switching providers is a config change and a re-run of the eval suite — not a rebuild.

## How we actually choose

Not by a partner badge. We run a bake-off on your real workload — capability on your tasks, latency, cost, and residency — and let the evidence decide. Being vendor-neutral isn't a slogan; it's the only honest way to recommend an option when we don't earn a referral fee on any of them.

*Choosing a sovereign AI stack is exactly what our paid two-week discovery is for.*
```

- [ ] **Step 2: Build gate**

Run: `npm run build`
Expected: completes; the third post and its table render; `/insights` and the on-page surface now show three posts (surface shows the 3 newest).

- [ ] **Step 3: Visual check**

`npm run dev` → confirm `/insights` lists all three newest-first, the on-page Insights section shows three cards, and `/rss.xml` lists three items.

- [ ] **Step 4: Commit**

```bash
git add src/content/insights/sovereign-llm-hosting-decision-matrix.md
git commit -m "content: flagship post — sovereign LLM hosting decision matrix"
```

---

## Task 8: Acceptance pass (verification only — no new code)

- [ ] **Step 1: Clean build + preview**

Run: `npm run build` then `npm run preview`. Confirm no errors and that these all render: `/`, `/insights`, all three `/insights/<id>`, and `/rss.xml`.

- [ ] **Step 2: Surface + ordering**

Confirm the landing-page Insights section sits between Industries and FAQ and shows the **3 newest** posts; confirm `/insights` lists all three newest-first with pillar/date/reading-time.

- [ ] **Step 3: Discoverability**

Confirm each post page emits `Article` JSON-LD (view source) and the `Organization` JSON-LD from BaseLayout is present; confirm `/rss.xml` is valid and uses absolute `https://techsider.com.au/...` links; confirm the sitemap includes the new pages.

- [ ] **Step 4: No fabrication review (spec §2 rule)**

Re-read all three posts. Confirm: no client names, no logos, no quantified outcomes/metrics presented as past results, no certification claims. Everything is framed as methodology ("how we approach / how we build"). The hosting post carries the "confirm current regional details" caveat.

- [ ] **Step 5: Scope + deps**

Confirm the only new dependency is `@astrojs/rss` (`git diff main...HEAD -- package.json`). No demo, no form, no MDX.

- [ ] **Step 6: Flag the content gate**

Phase 2 build is complete, but the three posts are **drafts pending the user's technical verification**. Do not merge to `main` until the user has confirmed/corrected the technical claims. Report this clearly.

---

## Self-review (plan author)

**Spec coverage (design spec §6):**
- Astro content collection, `src/content.config.ts`, glob loader, schema (title/description/publishDate/updatedDate/pillar/sectors/draft) → Task 1 ✓
- Reading time derived from word count, no dependency → Task 1 (`readingTime.ts`), used in Tasks 2/3/5 ✓
- `/insights` index + `/insights/[...id]` post pages, typography-first, Shiki code blocks → Tasks 2, 3 ✓
- On-page Insights surface (3 latest) between Industries and FAQ → Task 5 ✓
- 6 pillars (schema enum) + 3 flagship posts with the specified titles → Task 1, 6, 7 ✓
- Content drafted by Claude, user-verified before publish → CONTENT VERIFICATION GATE + Task 8 Step 6 ✓
- Article JSON-LD + Organization (BaseLayout) + RSS + sitemap → Tasks 2, 4; sitemap auto ✓
- `@astrojs/rss` only new dep; Markdown not MDX → Task 1; scope confirmed Task 8 ✓

**Placeholder scan:** No TBD/TODO. All component code and all three article bodies are provided in full. The only deferral (MDX) is an explicit scope boundary.

**Type/identifier consistency:** `readingMinutes(body)` defined in Task 1, imported and called with `post.body` in Tasks 2, 3, 5 — consistent signature. The route uses `params: { id: post.id }` matching the `[...id].astro` filename and `getStaticPaths`. Collection name `"insights"` is identical across config, all `getCollection` calls, and `render`. `PostLayout` prop names (`title`, `description`, `publishDate`, `updatedDate`, `pillar`, `minutes`) match exactly what `[...id].astro` passes. Post `id`s used in links (`/insights/${post.id}`) derive from the filenames created in Tasks 1/6/7.
```
