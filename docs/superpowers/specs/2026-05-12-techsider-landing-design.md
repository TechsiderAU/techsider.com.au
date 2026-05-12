# Techsider Landing Page — Design Spec

**Date:** 2026-05-12
**Status:** Approved (pending user review of this spec)
**Repo:** `techsider.com.au`

## Context

Techsider is an Australian enterprise AI services company providing **LLM Ops, RAG systems, and AI agents** to businesses and firms in Australia. The company currently has no web presence. This repo is the host of the company's marketing landing page, served from GitHub Pages at the custom domain `techsider.com.au`.

The page's job is **lead generation**: a qualified visitor (a technical leader at an Australian business evaluating AI service providers) should leave the page with a clear understanding of what Techsider does, why to choose it, and an email address to start a conversation.

V1 scope is deliberately a **single long-scroll landing page** with an email-only CTA. The architecture leaves room to add a `/insights` blog and per-service pages in v2 without rework.

## Decisions

| Decision | Value |
|---|---|
| Scope (v1) | Single long-form landing page |
| Primary CTA | `mailto:admin@techsider.com.au` |
| Visual direction | **Enterprise Trust** — dark navy palette, serif headlines, conservative B2B tone (Palantir / McKinsey / Anthropic-enterprise tier) |
| Framework | Astro (latest, v5+) |
| Styling | Tailwind CSS (via `@astrojs/tailwind`) with custom theme tokens |
| Hosting | GitHub Pages, custom domain `techsider.com.au` |
| Build/deploy | GitHub Actions using `withastro/action@v3` |
| JS budget | Zero JS by default (Astro static output) |

## Page architecture

Single page (`src/pages/index.astro`) composed of section components, in order:

1. **Nav** — sticky top bar: `TECHSIDER` logo, links to in-page anchors (Services, Approach, Contact), email CTA button on the right.
2. **Hero** — eyebrow ("Enterprise AI for Australian business"), serif H1 with italic accent on emphasis word, sub-headline, primary email CTA + ghost "See services ↓" anchor.
3. **Services** — three cards: `01 / LLM OPS`, `02 / RAG`, `03 / AGENTS`. Each card has a numbered label, a short title, and a 2–3 sentence description of what Techsider actually delivers in that practice.
4. **Why Techsider** — four short pillars in a 2×2 grid: Australian operations, Production discipline, Vendor-neutral, Senior engineers only.
5. **Approach** — three-step engagement model (i. Discovery → ii. Build → iii. Operate) with one short paragraph each. Serif italic step numerals.
6. **Contact** — centred section: serif headline ("Have a problem *worth solving*?"), short paragraph promising a 2-business-day reply, prominent `admin@techsider.com.au` as the email link.
7. **Footer** — copyright line + "Built with ❤️ in Sydney, Australia." + LinkedIn/GitHub links.

Content for each section is inlined in its component for v1 (no content collection or CMS). Switching to a content collection is a v2 task that becomes worthwhile only when blog/case-study content is added.

## Visual system

**Palette** (encoded as Tailwind theme tokens in `tailwind.config.mjs`):

| Token | Value | Use |
|---|---|---|
| `bg` | `#0b1424` | Page background |
| `bg-elev` | `#101c34` | Service cards, elevated surfaces |
| `bg-deep` | `#07101e` | Footer |
| `text` | `#f4f6fa` | Headlines, primary text |
| `text-mute` | `#a7b1c4` | Body copy |
| `text-dim` | `#8893a8` | Captions, footer text |
| `accent` | `#6da9ff` | Links, CTAs, italic emphasis in serif headlines |
| `accent-ink` | `#0b1424` | Text on accent-coloured buttons |
| `border` | `#1f2a40` | Default section/card borders |
| `border-soft` | `#2a3650` | Ghost buttons, secondary borders |

**Typography:**
- **Headlines:** EB Garamond (Google Fonts, self-hosted via `@fontsource/eb-garamond`). Used at H1, H2 with italic for the emphasised word.
- **Body / UI:** Inter (`@fontsource-variable/inter`). 400/500/600 weights.
- All fonts self-hosted — no calls to `fonts.googleapis.com` at runtime.
- `font-display: swap` everywhere.

**Spacing:** Tailwind defaults, with sections using `py-24 md:py-32` for generous enterprise feel.

**Motion:** None in v1. (Skip the scroll fade-in idea — keeps JS budget at zero and avoids polish bikeshedding before content is right.)

## Component structure

```
src/
├── layouts/
│   └── BaseLayout.astro      # <html>, <head> (meta/OG/fonts/sitemap), slot, <Footer />
├── components/
│   ├── Nav.astro
│   ├── Hero.astro
│   ├── Services.astro
│   ├── WhyUs.astro
│   ├── Approach.astro
│   ├── Contact.astro
│   └── Footer.astro
├── styles/
│   └── global.css            # @tailwind base/components/utilities + @font-face if needed
└── pages/
    └── index.astro           # imports BaseLayout, composes sections
```

Components take no props in v1. Content is inlined per component for simplicity.

## Repo layout

```
techsider.com.au/
├── .github/workflows/deploy.yml
├── .gitignore                  # already contains: .superpowers/
├── public/
│   ├── CNAME                   # single line: techsider.com.au
│   ├── favicon.svg
│   ├── og.png                  # 1200×630 social share image
│   └── robots.txt
├── src/
│   ├── components/             (see above)
│   ├── layouts/BaseLayout.astro
│   ├── pages/index.astro
│   └── styles/global.css
├── astro.config.mjs            # site: 'https://techsider.com.au', integrations: tailwind + sitemap
├── tailwind.config.mjs         # custom theme: palette tokens, fontFamily.serif=EB Garamond, sans=Inter
├── package.json
├── tsconfig.json               # extends astro/tsconfigs/strict
└── README.md                   # dev / build / deploy commands
```

## Deploy pipeline

`.github/workflows/deploy.yml` — single workflow, triggered on push to `main`:

1. Checkout
2. Install Node 20 + dependencies (`npm ci`)
3. Build (`npm run build`) using `withastro/action@v3`
4. Upload `dist/` as Pages artifact
5. Deploy to GitHub Pages

In GitHub repo settings → Pages, set **Source = GitHub Actions**. The CNAME file in `public/` is copied to `dist/CNAME` during build, which GitHub Pages reads to configure the custom domain.

**DNS configuration** (user-side, outside this repo):

- Apex `techsider.com.au` → `ALIAS`/`ANAME` to `qiguangyang.github.io` (or whichever GitHub account owns the repo)
- Optional `www.techsider.com.au` → `CNAME` to `qiguangyang.github.io`
- Enable "Enforce HTTPS" in GitHub Pages settings after DNS propagates.

## SEO / metadata

In `BaseLayout.astro`'s `<head>`:

- `<title>` — "Techsider — Enterprise AI for Australian business"
- `<meta name="description">` — 155-char summary of services + AU focus
- Open Graph tags (`og:title`, `og:description`, `og:image=/og.png`, `og:url`, `og:type=website`)
- Twitter card (`summary_large_image`)
- JSON-LD `Organization` schema with name, URL, areaServed=AU, services list
- `<link rel="canonical">` to `https://techsider.com.au`
- `robots.txt` in `public/` (allow all)
- `sitemap.xml` generated automatically via `@astrojs/sitemap`

## Performance budget

| Metric | Target |
|---|---|
| Lighthouse Performance (mobile) | ≥95 |
| Lighthouse Accessibility | ≥95 |
| Lighthouse Best Practices | =100 |
| Lighthouse SEO | =100 |
| Total page weight | ≤200KB (including fonts) |
| JavaScript shipped | 0 KB (zero hydration in v1) |

Astro's default static output and Tailwind's purging make these targets achievable without special effort, *provided* we don't add unnecessary integrations.

## Content / copy

All section copy below is the v1 starting point. Each piece is short by design — enterprise B2B buyers scan, they don't read.

**Nav links:** Services · Approach · Contact

**Hero:**
- Eyebrow: "Enterprise AI for Australian business"
- H1: "Production AI systems, built for *regulated industries*."
- Sub: "We design and operate LLM platforms, retrieval systems, and AI agents that meet enterprise security, sovereignty, and reliability standards — from proof of concept to production."
- Primary CTA: `admin@techsider.com.au` (mailto)
- Secondary: "See our services ↓" (anchor to #services)

**Services:**
- Section H2: "Three practices, one engineering team."
- **01 / LLM Ops — Production LLM platforms.** Evaluation harnesses, prompt versioning, observability, cost controls, model gateways. Whatever takes your AI from prototype to operations.
- **02 / RAG — Retrieval systems.** Document ingestion, embedding pipelines, hybrid retrieval, grounded answers with citations. Built for your data, your privacy boundary.
- **03 / Agents — Agentic workflows.** Tool-using agents for internal operations, customer service, and analyst-grade research. Designed with eval gates and human-in-the-loop.

**Why Techsider:**
- Section H2: "An engineering-led practice, *local to your timezone*."
- Australian operations — AU-based team. AU business hours. Data stays in your sovereign boundary.
- Production discipline — We measure before we ship. Evals, tracing, and gates from day one.
- Vendor-neutral — Anthropic, OpenAI, AWS Bedrock, Azure, self-hosted. We pick what fits.
- Senior engineers only — No bench staffing. The people who scope are the people who build.

**Approach:**
- Section H2: "From conversation to operations in three steps."
- i. Discovery — Two-week paid discovery. We scope the problem, your data, and the success criteria. You get an architecture and a quote.
- ii. Build — Fixed-scope engagements. Source code is yours. We instrument it for evaluation as we build it.
- iii. Operate — Optional ongoing operations: model upgrades, eval drift monitoring, incident response.

**Contact:**
- H2: "Have a problem *worth solving*?"
- Body: "Email us with a sentence on what you're trying to build. We reply within two business days."
- Link: `admin@techsider.com.au`

**Footer:**
- "© 2026 Techsider · Built with ❤️ in Sydney, Australia."
- LinkedIn · GitHub (placeholder URLs — user supplies actual ones before launch)

## Out of scope (deferred to v2+)

- Blog / `/insights` section (would use Astro content collections + MDX)
- Per-service detail pages
- Case studies / testimonials (need real ones first)
- Contact form with backend (would require GH Pages → external form service like Formspree, or migrating off Pages)
- Booking calendar embed (Cal.com / Calendly)
- Analytics (Plausible/Fathom — deferred until traffic warrants it)
- Dark/light mode toggle (site is dark-only by design)
- i18n / multi-language

## Verification plan

Run end-to-end before declaring v1 done:

| Check | How | Pass criteria |
|---|---|---|
| Local dev runs | `npm run dev` → http://localhost:4321 | Page renders, all sections visible, fonts load |
| Production build clean | `npm run build` | Exit 0, `dist/` populated, no warnings |
| Local preview matches dev | `npm run preview` | Visually identical to dev |
| Email CTA works | Click `admin@techsider.com.au` | Mail client opens with the address pre-filled |
| Anchor scrolls work | Click "See services ↓" and nav anchors | Smooth scroll lands on correct sections |
| Mobile layout | Resize browser to 375px width | All sections readable, no horizontal scroll |
| Lighthouse score | Run Lighthouse on built preview | Performance ≥95, A11y ≥95, BP =100, SEO =100 |
| Cross-browser | Open in Chrome + Safari (desktop + mobile) | No visual regressions, fonts render |
| Deploy succeeds | Push to `main` | Action completes green, Pages updates |
| Custom domain | `curl -I https://techsider.com.au` after DNS | Returns `HTTP/2 200`, valid TLS |

## References

- Astro on GitHub Pages: https://docs.astro.build/en/guides/deploy/github/
- `withastro/action`: https://github.com/withastro/action
- `@astrojs/tailwind`: https://docs.astro.build/en/guides/integrations-guide/tailwind/
- `@astrojs/sitemap`: https://docs.astro.build/en/guides/integrations-guide/sitemap/
