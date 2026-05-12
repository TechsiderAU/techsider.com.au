# Techsider Landing Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the Techsider v1 marketing landing page — a single long-scroll page in the "Enterprise Trust" visual direction — to GitHub Pages at `techsider.com.au`.

**Architecture:** Astro 5 static site, composed of one `index.astro` that mounts seven small section components inside a single `BaseLayout.astro`. Tailwind CSS v4 (via `@tailwindcss/vite`) provides utility classes; design tokens (palette, fonts) are defined as CSS variables in `@theme`. Zero JavaScript hydration. Built and deployed by a single GitHub Actions workflow using `withastro/action@v3` → `actions/deploy-pages@v4`.

**Tech Stack:** Astro 5 · Tailwind CSS v4 · `@fontsource-variable/inter` · `@fontsource/eb-garamond` · `@astrojs/sitemap` · GitHub Actions · GitHub Pages.

**Spec:** [`docs/superpowers/specs/2026-05-12-techsider-landing-design.md`](../specs/2026-05-12-techsider-landing-design.md)

---

## File map

Files this plan creates (no modifications — repo is empty):

| Path | Responsibility |
|---|---|
| `package.json` | npm manifest + scripts (dev/build/preview) |
| `tsconfig.json` | Astro's strict TypeScript config |
| `astro.config.mjs` | Astro config: `site`, Vite plugins (Tailwind), `@astrojs/sitemap` integration |
| `src/styles/global.css` | Tailwind import + `@theme` design tokens (palette, fonts) + font-face imports |
| `src/layouts/BaseLayout.astro` | `<html>`, `<head>` (title/meta/OG/JSON-LD/favicon), `<body>` with `<slot />` and `<Footer />` |
| `src/components/Nav.astro` | Sticky top bar: logo + 3 anchor links + email button |
| `src/components/Hero.astro` | Eyebrow + serif H1 + sub + primary mailto CTA + "See services ↓" anchor |
| `src/components/Services.astro` | H2 + three service cards (LLM Ops / RAG / Agents) |
| `src/components/WhyUs.astro` | H2 + 2×2 grid of four pillars |
| `src/components/Approach.astro` | H2 + three numbered steps (i. Discovery → ii. Build → iii. Operate) |
| `src/components/Contact.astro` | Centred H2 + paragraph + prominent mailto link |
| `src/components/Footer.astro` | Copyright + Sydney line + LinkedIn/GitHub placeholders |
| `src/pages/index.astro` | Composes `Nav → Hero → Services → WhyUs → Approach → Contact` inside `BaseLayout` |
| `public/CNAME` | Single line: `techsider.com.au` |
| `public/robots.txt` | Allow-all |
| `public/favicon.svg` | Minimal mark for browser tabs |
| `.github/workflows/deploy.yml` | Build + deploy to GitHub Pages on push to `main` |
| `README.md` | Dev/build/deploy commands |

**Excluded from v1** (per spec "out of scope"): blog, per-service pages, case studies, contact form, calendar booking, analytics, light mode, i18n.

**Deferred from spec** (decision: do not block v1 on this): `public/og.png`. The `<meta property="og:image">` tag is omitted from v1 — adding it later requires only a 1200×630 PNG drop into `public/` and one line of meta. Documented in README handoff.

---

### Task 1: Scaffold the Astro project

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `astro.config.mjs`
- Create: `src/env.d.ts`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "techsider-landing",
  "type": "module",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "dev": "astro dev",
    "start": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "astro": "astro"
  },
  "dependencies": {
    "@astrojs/sitemap": "^3.2.1",
    "@fontsource-variable/inter": "^5.1.0",
    "@fontsource/eb-garamond": "^5.1.0",
    "@tailwindcss/vite": "^4.0.0",
    "astro": "^5.0.0",
    "tailwindcss": "^4.0.0"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "extends": "astro/tsconfigs/strict",
  "include": [".astro/types.d.ts", "**/*"],
  "exclude": ["dist"]
}
```

- [ ] **Step 3: Create `src/env.d.ts`**

```ts
/// <reference path="../.astro/types.d.ts" />
```

- [ ] **Step 4: Create `astro.config.mjs`**

```js
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  site: "https://techsider.com.au",
  integrations: [sitemap()],
  vite: {
    plugins: [tailwindcss()],
  },
});
```

- [ ] **Step 5: Install dependencies**

Run: `npm install`
Expected: Completes without errors, `node_modules/` and `package-lock.json` created.

- [ ] **Step 6: Verify Astro CLI is reachable**

Run: `npx astro --version`
Expected: Prints a version `5.x.x`.

- [ ] **Step 7: Add `node_modules` and build artifacts to `.gitignore`**

Append to existing `.gitignore` (file already contains `.superpowers/`):

```
node_modules/
dist/
.astro/
.DS_Store
```

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json tsconfig.json astro.config.mjs src/env.d.ts .gitignore
git commit -m "chore: scaffold astro 5 project with tailwind v4 and sitemap"
```

---

### Task 2: Design tokens and global styles

**Files:**
- Create: `src/styles/global.css`

- [ ] **Step 1: Create `src/styles/global.css`**

```css
@import "tailwindcss";
@import "@fontsource-variable/inter";
@import "@fontsource/eb-garamond/400.css";
@import "@fontsource/eb-garamond/400-italic.css";
@import "@fontsource/eb-garamond/500.css";

@theme {
  /* Surfaces */
  --color-bg: #0b1424;
  --color-bg-elev: #101c34;
  --color-bg-deep: #07101e;

  /* Text */
  --color-text: #f4f6fa;
  --color-text-mute: #a7b1c4;
  --color-text-dim: #8893a8;

  /* Accent */
  --color-accent: #6da9ff;
  --color-accent-ink: #0b1424;

  /* Borders */
  --color-border: #1f2a40;
  --color-border-soft: #2a3650;

  /* Fonts */
  --font-serif: "EB Garamond", Georgia, "Times New Roman", serif;
  --font-sans: "Inter Variable", "Inter", system-ui, -apple-system, sans-serif;
}

html {
  scroll-behavior: smooth;
  background: var(--color-bg);
}

body {
  font-family: var(--font-sans);
  color: var(--color-text);
  background: var(--color-bg);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/styles/global.css
git commit -m "feat: define palette, fonts, and global styles via tailwind v4 @theme"
```

---

### Task 3: Base layout

**Files:**
- Create: `src/layouts/BaseLayout.astro`
- Create: `public/favicon.svg`
- Create: `src/pages/index.astro` (temporary minimal placeholder, replaced in Task 10)

- [ ] **Step 1: Create `public/favicon.svg`**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="12" fill="#0b1424"/>
  <text x="50%" y="50%" text-anchor="middle" dominant-baseline="central"
        font-family="Georgia, serif" font-size="34" font-style="italic"
        font-weight="500" fill="#6da9ff">T</text>
</svg>
```

- [ ] **Step 2: Create `src/layouts/BaseLayout.astro`**

```astro
---
import "../styles/global.css";
import Footer from "../components/Footer.astro";

interface Props {
  title?: string;
  description?: string;
}

const {
  title = "Techsider — Enterprise AI for Australian business",
  description = "Techsider builds production LLM platforms, retrieval systems, and AI agents for Australian businesses. Enterprise-grade, sovereign, vendor-neutral.",
} = Astro.props;

const canonical = new URL(Astro.url.pathname, Astro.site).toString();
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Techsider",
  url: "https://techsider.com.au",
  email: "admin@techsider.com.au",
  areaServed: "AU",
  description,
  knowsAbout: ["LLM Ops", "Retrieval-Augmented Generation", "AI Agents"],
};
---

<!doctype html>
<html lang="en-AU">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="generator" content={Astro.generator} />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <link rel="canonical" href={canonical} />

    <title>{title}</title>
    <meta name="description" content={description} />

    <meta property="og:type" content="website" />
    <meta property="og:title" content={title} />
    <meta property="og:description" content={description} />
    <meta property="og:url" content={canonical} />
    <meta property="og:site_name" content="Techsider" />
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:title" content={title} />
    <meta name="twitter:description" content={description} />

    <script type="application/ld+json" set:html={JSON.stringify(jsonLd)} />
  </head>
  <body class="bg-bg text-text font-sans antialiased">
    <slot />
    <Footer />
  </body>
</html>
```

- [ ] **Step 3: Create a temporary `src/pages/index.astro` so dev/build doesn't 404**

```astro
---
import BaseLayout from "../layouts/BaseLayout.astro";
---

<BaseLayout>
  <main class="min-h-screen flex items-center justify-center">
    <p class="font-serif italic text-text-mute">Coming soon.</p>
  </main>
</BaseLayout>
```

- [ ] **Step 4: Stub the Footer so BaseLayout's import resolves**

Create `src/components/Footer.astro` with minimal content (real version comes in Task 9):

```astro
---
---
<footer class="bg-bg-deep py-6 px-6 text-xs text-text-dim">
  <div class="max-w-5xl mx-auto">© 2026 Techsider</div>
</footer>
```

- [ ] **Step 5: Run dev server and verify it boots**

Run: `npm run dev`
Expected: Dev server starts at `http://localhost:4321`. Visiting in browser shows "Coming soon." on a dark navy background with the favicon visible in the tab. Stop the server with Ctrl+C.

- [ ] **Step 6: Run the production build to confirm zero errors**

Run: `npm run build`
Expected: Exit 0. `dist/index.html`, `dist/favicon.svg`, `dist/sitemap-index.xml`, and a built CSS file appear.

- [ ] **Step 7: Commit**

```bash
git add public/favicon.svg src/layouts/BaseLayout.astro src/pages/index.astro src/components/Footer.astro
git commit -m "feat: base layout with head metadata, json-ld, and footer stub"
```

---

### Task 4: Nav component

**Files:**
- Create: `src/components/Nav.astro`

- [ ] **Step 1: Create `src/components/Nav.astro`**

```astro
---
---
<nav class="sticky top-0 z-50 bg-bg/85 backdrop-blur border-b border-border">
  <div class="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
    <a href="/" class="text-text font-semibold tracking-[0.18em] text-sm">
      TECHSIDER
    </a>
    <div class="flex items-center gap-8">
      <a href="#services" class="hidden sm:inline text-xs uppercase tracking-[0.08em] text-text-mute hover:text-text transition-colors">Services</a>
      <a href="#approach" class="hidden sm:inline text-xs uppercase tracking-[0.08em] text-text-mute hover:text-text transition-colors">Approach</a>
      <a href="#contact" class="hidden sm:inline text-xs uppercase tracking-[0.08em] text-text-mute hover:text-text transition-colors">Contact</a>
      <a href="mailto:admin@techsider.com.au" class="text-xs font-semibold bg-accent text-accent-ink px-3 py-1.5 rounded hover:opacity-90 transition-opacity">
        admin@techsider.com.au
      </a>
    </div>
  </div>
</nav>
```

- [ ] **Step 2: Mount Nav in `src/pages/index.astro` to preview it**

Replace `src/pages/index.astro` contents:

```astro
---
import BaseLayout from "../layouts/BaseLayout.astro";
import Nav from "../components/Nav.astro";
---

<BaseLayout>
  <Nav />
  <main class="min-h-screen flex items-center justify-center">
    <p class="font-serif italic text-text-mute">Coming soon.</p>
  </main>
</BaseLayout>
```

- [ ] **Step 3: Verify in dev**

Run: `npm run dev` and open `http://localhost:4321`.
Expected: Sticky nav at top with TECHSIDER on the left, three uppercase links + a blue email pill on the right. Hovering email pill slightly fades; hovering links lightens them. At <640px width, the three middle links hide and only the email pill shows. Stop with Ctrl+C.

- [ ] **Step 4: Commit**

```bash
git add src/components/Nav.astro src/pages/index.astro
git commit -m "feat: sticky top nav with anchor links and email cta"
```

---

### Task 5: Hero component

**Files:**
- Create: `src/components/Hero.astro`

- [ ] **Step 1: Create `src/components/Hero.astro`**

```astro
---
---
<section class="px-6 pt-24 pb-32 md:pt-32 md:pb-40 border-b border-border">
  <div class="max-w-6xl mx-auto">
    <p class="text-xs uppercase tracking-[0.18em] text-accent font-medium mb-5">
      Enterprise AI for Australian business
    </p>
    <h1 class="font-serif font-normal text-4xl md:text-6xl leading-[1.1] tracking-tight text-text max-w-[28ch] mb-6">
      Production AI systems, built for <em class="italic text-accent">regulated industries</em>.
    </h1>
    <p class="text-text-mute text-base md:text-lg leading-relaxed max-w-[55ch] mb-10">
      We design and operate LLM platforms, retrieval systems, and AI agents that meet enterprise security, sovereignty, and reliability standards — from proof of concept to production.
    </p>
    <div class="flex flex-wrap items-center gap-4">
      <a href="mailto:admin@techsider.com.au"
         class="inline-flex items-center gap-2 bg-accent text-accent-ink px-5 py-2.5 rounded text-sm font-semibold tracking-wide hover:opacity-90 transition-opacity">
        admin@techsider.com.au
        <span aria-hidden="true">→</span>
      </a>
      <a href="#services"
         class="inline-flex items-center gap-2 text-text-mute text-sm hover:text-text transition-colors">
        See our services
        <span aria-hidden="true">↓</span>
      </a>
    </div>
  </div>
</section>
```

- [ ] **Step 2: Mount Hero in `src/pages/index.astro`**

Replace `src/pages/index.astro`:

```astro
---
import BaseLayout from "../layouts/BaseLayout.astro";
import Nav from "../components/Nav.astro";
import Hero from "../components/Hero.astro";
---

<BaseLayout>
  <Nav />
  <Hero />
</BaseLayout>
```

- [ ] **Step 3: Verify in dev**

Run: `npm run dev` and reload `http://localhost:4321`.
Expected: Below the nav, see the eyebrow in light blue, a large serif heading with "regulated industries" in blue italics, a muted sub-paragraph, then a blue email CTA pill and a "See our services ↓" link. The page is dark navy throughout. Click "See our services ↓" — should anchor-scroll (target doesn't exist yet, that's fine).

- [ ] **Step 4: Commit**

```bash
git add src/components/Hero.astro src/pages/index.astro
git commit -m "feat: hero section with serif headline and mailto cta"
```

---

### Task 6: Services component

**Files:**
- Create: `src/components/Services.astro`

- [ ] **Step 1: Create `src/components/Services.astro`**

```astro
---
const services = [
  {
    num: "01",
    tag: "LLM OPS",
    title: "Production LLM platforms",
    body: "Evaluation harnesses, prompt versioning, observability, cost controls, model gateways. Whatever takes your AI from prototype to operations.",
  },
  {
    num: "02",
    tag: "RAG",
    title: "Retrieval systems",
    body: "Document ingestion, embedding pipelines, hybrid retrieval, grounded answers with citations. Built for your data, your privacy boundary.",
  },
  {
    num: "03",
    tag: "AGENTS",
    title: "Agentic workflows",
    body: "Tool-using agents for internal operations, customer service, and analyst-grade research. Designed with eval gates and human-in-the-loop.",
  },
];
---
<section id="services" class="px-6 py-24 md:py-32 border-b border-border">
  <div class="max-w-6xl mx-auto">
    <p class="text-xs uppercase tracking-[0.2em] text-accent font-medium mb-4">What we build</p>
    <h2 class="font-serif font-normal text-3xl md:text-4xl leading-[1.15] text-text max-w-[24ch] mb-12">
      Three practices, one engineering team.
    </h2>
    <div class="grid gap-6 md:grid-cols-3">
      {services.map((s) => (
        <article class="bg-bg-elev border border-border rounded-xl p-6 md:p-7">
          <p class="text-[11px] tracking-[0.18em] text-accent font-semibold mb-4">
            {s.num} / {s.tag}
          </p>
          <h3 class="text-text font-semibold text-base mb-2">{s.title}</h3>
          <p class="text-text-dim text-sm leading-relaxed">{s.body}</p>
        </article>
      ))}
    </div>
  </div>
</section>
```

- [ ] **Step 2: Mount Services in `src/pages/index.astro`**

```astro
---
import BaseLayout from "../layouts/BaseLayout.astro";
import Nav from "../components/Nav.astro";
import Hero from "../components/Hero.astro";
import Services from "../components/Services.astro";
---

<BaseLayout>
  <Nav />
  <Hero />
  <Services />
</BaseLayout>
```

- [ ] **Step 3: Verify in dev**

Run: `npm run dev`, reload page.
Expected: Below the hero, a "What we build" eyebrow, a serif H2, then three card columns on desktop (stacks vertically on mobile) — each card has a tagged code "01 / LLM OPS", a bold title, and a muted body. Cards sit on a slightly lighter navy than the page. Click "See our services ↓" from the hero — should anchor-scroll to this section.

- [ ] **Step 4: Commit**

```bash
git add src/components/Services.astro src/pages/index.astro
git commit -m "feat: services section with llm ops, rag, and agents cards"
```

---

### Task 7: Why Techsider component

**Files:**
- Create: `src/components/WhyUs.astro`

- [ ] **Step 1: Create `src/components/WhyUs.astro`**

```astro
---
const pillars = [
  {
    title: "Australian operations",
    body: "AU-based team. AU business hours. Data stays in your sovereign boundary.",
  },
  {
    title: "Production discipline",
    body: "We measure before we ship. Evals, tracing, and gates from day one.",
  },
  {
    title: "Vendor-neutral",
    body: "Anthropic, OpenAI, AWS Bedrock, Azure, self-hosted. We pick what fits.",
  },
  {
    title: "Senior engineers only",
    body: "No bench staffing. The people who scope are the people who build.",
  },
];
---
<section class="px-6 py-24 md:py-32 border-b border-border">
  <div class="max-w-6xl mx-auto">
    <p class="text-xs uppercase tracking-[0.2em] text-accent font-medium mb-4">Why us</p>
    <h2 class="font-serif font-normal text-3xl md:text-4xl leading-[1.15] text-text max-w-[26ch] mb-12">
      An engineering-led practice, <em class="italic text-accent">local to your timezone</em>.
    </h2>
    <div class="grid gap-8 md:grid-cols-2 md:gap-x-12 md:gap-y-10">
      {pillars.map((p) => (
        <div class="flex gap-4">
          <span class="mt-2 w-1.5 h-1.5 bg-accent rounded-full flex-shrink-0" aria-hidden="true"></span>
          <div>
            <h3 class="text-text font-semibold text-base mb-1">{p.title}</h3>
            <p class="text-text-dim text-sm leading-relaxed">{p.body}</p>
          </div>
        </div>
      ))}
    </div>
  </div>
</section>
```

- [ ] **Step 2: Mount WhyUs in `src/pages/index.astro`**

```astro
---
import BaseLayout from "../layouts/BaseLayout.astro";
import Nav from "../components/Nav.astro";
import Hero from "../components/Hero.astro";
import Services from "../components/Services.astro";
import WhyUs from "../components/WhyUs.astro";
---

<BaseLayout>
  <Nav />
  <Hero />
  <Services />
  <WhyUs />
</BaseLayout>
```

- [ ] **Step 3: Verify in dev**

Run: `npm run dev`, reload.
Expected: Below the services section, a "Why us" eyebrow, a serif H2 with "local to your timezone" in blue italics, then four pillar items in a 2-column grid (single column on mobile). Each pillar has a small blue dot, a bold title, and a muted description.

- [ ] **Step 4: Commit**

```bash
git add src/components/WhyUs.astro src/pages/index.astro
git commit -m "feat: why-techsider section with four pillars"
```

---

### Task 8: Approach component

**Files:**
- Create: `src/components/Approach.astro`

- [ ] **Step 1: Create `src/components/Approach.astro`**

```astro
---
const steps = [
  {
    num: "i.",
    title: "Discovery",
    body: "Two-week paid discovery. We scope the problem, your data, and the success criteria. You get an architecture and a quote.",
  },
  {
    num: "ii.",
    title: "Build",
    body: "Fixed-scope engagements. Source code is yours. We instrument it for evaluation as we build it.",
  },
  {
    num: "iii.",
    title: "Operate",
    body: "Optional ongoing operations: model upgrades, eval drift monitoring, incident response.",
  },
];
---
<section id="approach" class="px-6 py-24 md:py-32 border-b border-border">
  <div class="max-w-6xl mx-auto">
    <p class="text-xs uppercase tracking-[0.2em] text-accent font-medium mb-4">How we work</p>
    <h2 class="font-serif font-normal text-3xl md:text-4xl leading-[1.15] text-text max-w-[28ch] mb-12">
      From conversation to operations in three steps.
    </h2>
    <div class="grid gap-10 md:grid-cols-3">
      {steps.map((s) => (
        <div>
          <p class="font-serif italic text-accent text-4xl mb-3 leading-none">{s.num}</p>
          <h3 class="text-text font-semibold text-base mb-2">{s.title}</h3>
          <p class="text-text-dim text-sm leading-relaxed">{s.body}</p>
        </div>
      ))}
    </div>
  </div>
</section>
```

- [ ] **Step 2: Mount Approach in `src/pages/index.astro`**

```astro
---
import BaseLayout from "../layouts/BaseLayout.astro";
import Nav from "../components/Nav.astro";
import Hero from "../components/Hero.astro";
import Services from "../components/Services.astro";
import WhyUs from "../components/WhyUs.astro";
import Approach from "../components/Approach.astro";
---

<BaseLayout>
  <Nav />
  <Hero />
  <Services />
  <WhyUs />
  <Approach />
</BaseLayout>
```

- [ ] **Step 3: Verify in dev**

Run: `npm run dev`, reload.
Expected: Below WhyUs, a "How we work" eyebrow, a serif H2, then three columns showing serif italic blue numerals (i., ii., iii.) followed by a step title and short paragraph. Click "Approach" in the nav — should scroll to this section.

- [ ] **Step 4: Commit**

```bash
git add src/components/Approach.astro src/pages/index.astro
git commit -m "feat: approach section with three-step engagement model"
```

---

### Task 9: Contact and Footer components

**Files:**
- Modify: `src/components/Footer.astro` (replacing the Task 3 stub)
- Create: `src/components/Contact.astro`

- [ ] **Step 1: Create `src/components/Contact.astro`**

```astro
---
---
<section id="contact" class="px-6 py-24 md:py-32 bg-gradient-to-b from-bg to-[#0e1a31]">
  <div class="max-w-3xl mx-auto text-center">
    <h2 class="font-serif font-normal text-3xl md:text-4xl leading-[1.15] text-text mb-4">
      Have a problem <em class="italic text-accent">worth solving</em>?
    </h2>
    <p class="text-text-mute text-base leading-relaxed max-w-[42ch] mx-auto mb-8">
      Email us with a sentence on what you're trying to build. We reply within two business days.
    </p>
    <a href="mailto:admin@techsider.com.au"
       class="inline-block text-accent text-lg md:text-xl font-semibold tracking-wide hover:opacity-90 transition-opacity">
      admin@techsider.com.au
    </a>
  </div>
</section>
```

- [ ] **Step 2: Replace `src/components/Footer.astro` with the full version**

```astro
---
const year = new Date().getFullYear();
---
<footer class="bg-bg-deep border-t border-border">
  <div class="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-text-dim">
    <p>© {year} Techsider · Built with ❤️ in Sydney, Australia.</p>
    <div class="flex gap-5">
      <a href="https://www.linkedin.com/" target="_blank" rel="noopener" class="hover:text-text transition-colors">LinkedIn</a>
      <a href="https://github.com/" target="_blank" rel="noopener" class="hover:text-text transition-colors">GitHub</a>
    </div>
  </div>
</footer>
```

- [ ] **Step 3: Mount Contact in `src/pages/index.astro`**

```astro
---
import BaseLayout from "../layouts/BaseLayout.astro";
import Nav from "../components/Nav.astro";
import Hero from "../components/Hero.astro";
import Services from "../components/Services.astro";
import WhyUs from "../components/WhyUs.astro";
import Approach from "../components/Approach.astro";
import Contact from "../components/Contact.astro";
---

<BaseLayout>
  <Nav />
  <Hero />
  <Services />
  <WhyUs />
  <Approach />
  <Contact />
</BaseLayout>
```

(Footer is rendered by `BaseLayout.astro` — no change needed in `index.astro`.)

- [ ] **Step 4: Verify in dev**

Run: `npm run dev`, reload.
Expected: After the Approach section, a centred Contact block with a serif H2, a short paragraph, and the email address rendered large and blue. Clicking it opens the user's mail client. Below it, the footer reads "© 2026 Techsider · Built with ❤️ in Sydney, Australia." with LinkedIn and GitHub on the right. Click "Contact" in the nav — should scroll smoothly.

- [ ] **Step 5: Commit**

```bash
git add src/components/Contact.astro src/components/Footer.astro src/pages/index.astro
git commit -m "feat: contact section and final footer with sydney location"
```

---

### Task 10: Public static assets

**Files:**
- Create: `public/CNAME`
- Create: `public/robots.txt`

- [ ] **Step 1: Create `public/CNAME`**

File contents (single line, no trailing newline preferred but tolerated):

```
techsider.com.au
```

- [ ] **Step 2: Create `public/robots.txt`**

```
User-agent: *
Allow: /

Sitemap: https://techsider.com.au/sitemap-index.xml
```

- [ ] **Step 3: Build and confirm assets land in `dist/`**

Run: `npm run build`
Expected: Exit 0. Confirm with `ls dist/` that `CNAME`, `robots.txt`, `favicon.svg`, `index.html`, `sitemap-index.xml`, `sitemap-0.xml` are all present.

- [ ] **Step 4: Commit**

```bash
git add public/CNAME public/robots.txt
git commit -m "chore: add CNAME for custom domain and robots.txt"
```

---

### Task 11: GitHub Actions deploy workflow

**Files:**
- Create: `.github/workflows/deploy.yml`

- [ ] **Step 1: Create `.github/workflows/deploy.yml`**

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Build with Astro
        uses: withastro/action@v3
        with:
          node-version: 20

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: Validate YAML syntax locally**

Run: `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/deploy.yml'))"`
Expected: No output (exit 0). If `python3` isn't available, skip — the workflow will be validated on push.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/deploy.yml
git commit -m "ci: github pages deploy workflow using withastro action"
```

---

### Task 12: README

**Files:**
- Create: `README.md`

- [ ] **Step 1: Create `README.md`**

````markdown
# techsider.com.au

Marketing landing page for Techsider — enterprise AI services for Australian business.

## Stack

- [Astro 5](https://astro.build/) (static output, zero JS hydration)
- [Tailwind CSS v4](https://tailwindcss.com/) via `@tailwindcss/vite`
- Fonts: EB Garamond (serif headlines), Inter Variable (body) — both self-hosted via fontsource
- Hosted on GitHub Pages at https://techsider.com.au

## Development

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # outputs to dist/
npm run preview  # serves dist/ locally
```

## Deploy

Push to `main`. The workflow in `.github/workflows/deploy.yml` builds and publishes to GitHub Pages automatically.

The custom domain is configured via `public/CNAME`. After enabling GitHub Pages (Settings → Pages → Source: GitHub Actions), make sure DNS points the apex `techsider.com.au` record to GitHub Pages and "Enforce HTTPS" is on.

## Structure

```
src/
  layouts/BaseLayout.astro    # html/head/meta + Footer
  components/                 # Nav, Hero, Services, WhyUs, Approach, Contact, Footer
  pages/index.astro           # composes all sections
  styles/global.css           # tailwind import + @theme tokens + fonts
public/
  CNAME                       # techsider.com.au
  favicon.svg
  robots.txt
```

## Known follow-ups (post v1)

- Add `public/og.png` (1200×630) and the `<meta property="og:image">` tag in `BaseLayout.astro`.
- Replace placeholder LinkedIn/GitHub URLs in `Footer.astro` with the real accounts.
- Add `/insights` blog using Astro content collections when there's content to publish.
````

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: readme with dev/build/deploy and stack overview"
```

---

### Task 13: Final verification and Lighthouse

**Files:** None (verification only)

- [ ] **Step 1: Clean install and build from scratch**

Run:
```bash
rm -rf node_modules dist .astro
npm install
npm run build
```
Expected: Exit 0 on every command. `dist/` populated with `index.html`, `CNAME`, `favicon.svg`, `robots.txt`, `sitemap-index.xml`, `sitemap-0.xml`, and an `_astro/` directory containing the built CSS.

- [ ] **Step 2: Preview the built site locally**

Run: `npm run preview`
Open: `http://localhost:4321`
Expected: Identical to dev. All seven sections present in order: Nav, Hero, Services, WhyUs, Approach, Contact, Footer.

- [ ] **Step 3: Click-through smoke**

Verify every interaction by hand:

- Click `admin@techsider.com.au` in the nav → mail client opens with the address pre-filled.
- Click "Services" in the nav → smooth-scrolls to the Services section.
- Click "Approach" in the nav → smooth-scrolls to the Approach section.
- Click "Contact" in the nav → smooth-scrolls to the Contact section.
- Click "See our services ↓" in the hero → smooth-scrolls to Services.
- Click the email in the Contact section → mail client opens.
- LinkedIn and GitHub footer links open in new tabs (will go to placeholder URLs — that's expected; real ones are a post-launch task per the README).

- [ ] **Step 4: Mobile layout check**

Resize the browser to 375px width (DevTools device mode → iPhone SE).
Expected: No horizontal scrollbar. Nav collapses to logo + email pill only. Hero text reflows within the viewport. Services cards stack vertically. WhyUs pillars stack to one column. Approach steps stack to one column. Contact section centred and readable. Footer stacks vertically.

- [ ] **Step 5: Run Lighthouse on the local preview**

In Chrome DevTools → Lighthouse → Mobile → all categories → Analyze.
Expected:

| Category | Target |
|---|---|
| Performance | ≥95 |
| Accessibility | ≥95 |
| Best Practices | 100 |
| SEO | 100 |

If any category misses target, investigate before declaring done. Common fixes:
- A11y miss → check colour-contrast for `text-text-dim` against `bg`, add missing `aria-label`s, confirm `<html lang>` is set.
- SEO miss → confirm `<meta name="description">` is rendering (view-source), confirm `robots.txt` allows crawling.
- Performance miss → confirm no third-party requests; check that Tailwind purged unused styles (CSS file in `dist/_astro/` should be <20KB).

- [ ] **Step 6: Cross-browser smoke**

Open `http://localhost:4321` in Safari (desktop). Confirm:
- Serif headlines render in EB Garamond (not browser default serif).
- Sticky nav doesn't jitter on scroll.
- All colours match Chrome.

- [ ] **Step 7: No commit needed unless fixes were made**

If Steps 5–6 required any fixes, commit them with a clear message (e.g., `fix: bump text-dim contrast to meet WCAG AA`). Otherwise this task ships nothing new — its purpose is purely verification.

---

### Task 14: Push and enable Pages

**Files:** None (repo settings + DNS — outside the codebase)

This is a one-time setup task that must be done by a human with repo and DNS access. Steps are listed here for completeness so the engineer knows the full path to "live."

- [ ] **Step 1: Push to GitHub**

```bash
git push -u origin main
```

Expected: Push succeeds. In GitHub, the `Deploy to GitHub Pages` workflow runs and completes green. The `deploy` job's environment URL links to the deployed site.

- [ ] **Step 2: Enable GitHub Pages**

In the GitHub repo → Settings → Pages:
- **Source:** GitHub Actions
- **Custom domain:** `techsider.com.au` (GitHub reads this from `public/CNAME` automatically after first build)
- **Enforce HTTPS:** Check after the cert provisions (may take a few minutes after DNS propagates).

- [ ] **Step 3: Configure DNS at the domain registrar**

Add the following records for `techsider.com.au`:

| Type | Name | Value |
|---|---|---|
| ALIAS / ANAME | @ (apex) | `qiguangyang.github.io` |
| A | @ | `185.199.108.153` |
| A | @ | `185.199.109.153` |
| A | @ | `185.199.110.153` |
| A | @ | `185.199.111.153` |
| CNAME | www | `qiguangyang.github.io` |

(Either ALIAS/ANAME *or* the four A records — registrars that don't support ALIAS/ANAME use the four A records. GitHub's [official docs](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site) list the apex IPs.)

If the GitHub repo lives under a different account, replace `qiguangyang.github.io` with `<owner>.github.io`.

- [ ] **Step 4: Verify live**

After DNS propagates (5–30 minutes typically):

```bash
curl -I https://techsider.com.au
```

Expected: `HTTP/2 200`, valid TLS cert, `server: GitHub.com`.

Visit `https://techsider.com.au` in a fresh browser tab and confirm the page renders.

---

## Self-review checklist

Each spec section is covered by at least one task:

| Spec section | Task |
|---|---|
| Decisions (Astro, Tailwind, GH Pages, mailto CTA, Enterprise Trust) | All tasks |
| Page architecture (Nav → Hero → Services → WhyUs → Approach → Contact → Footer) | Tasks 4–9 + composition in 5–9 |
| Visual system (palette + fonts + spacing) | Task 2 (tokens), Tasks 4–9 (usage) |
| Component structure | Tasks 3–9 |
| Repo layout | All file-creation tasks |
| Deploy pipeline | Task 11 (workflow) + Task 14 (Pages enablement + DNS) |
| SEO / metadata (`<title>`, description, OG, Twitter, JSON-LD, sitemap, canonical) | Task 3 (BaseLayout) + Task 1 (`@astrojs/sitemap` integration) |
| Performance budget (≥95 Lighthouse, 0 KB JS, ≤200KB) | Task 13 (verification) |
| Content / copy (all section text exactly as specified) | Tasks 5–9 |
| Out of scope (no blog, no form, no analytics, etc.) | Not in any task — correctly excluded |
| Verification plan (10 checks) | Task 13 covers all 10 |

**Known deviation from spec:** `public/og.png` is intentionally not produced in v1. The `<meta property="og:image">` tag is omitted from `BaseLayout.astro` rather than pointing at a missing file. README's "Known follow-ups" lists this as a post-launch item.

**Placeholder scan:** No TBDs, no "fill in", no "see Task N — just look at it". All code blocks contain runnable code. All commands have expected output.

**Type / API consistency:** The `Footer.astro` stub in Task 3 is fully replaced by the real version in Task 9 — no orphan references. Every component is imported by name into `index.astro` in the task that introduces it (no forward references).
