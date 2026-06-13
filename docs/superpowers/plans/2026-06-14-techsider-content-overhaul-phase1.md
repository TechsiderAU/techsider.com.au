# Techsider Content Overhaul — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the static content/positioning overhaul of the Techsider landing page — sharper copy, three new content-only sections (Trust strip, Industries, FAQ), a risk-reversal Approach, a result-framed CTA, and a reordered page — with zero new infrastructure and no fabricated proof.

**Architecture:** Pure Astro 5 static components, one `.astro` file per section, composed in `src/pages/index.astro`. New sections follow the existing component pattern exactly (frontmatter data array → mapped markup, Tailwind v4 `@theme` tokens from `src/styles/global.css`). No backend, no client JS, no new dependencies.

**Tech Stack:** Astro 5, Tailwind CSS v4 (`@tailwindcss/vite`), self-hosted EB Garamond + Inter. Output is static HTML to `dist/`, deployed to GitHub Pages.

---

## Verification model (read first)

This project has **no unit-test framework** and should not gain one for static copy/markup (YAGNI). The verification loop for every task is:

1. **Build gate:** `npm run build` → must finish with no errors (it writes `dist/`). The build is a real type/template check — a bad import, undefined variable, or malformed `.astro` fails it.
2. **Visual check:** `npm run dev` → open `http://localhost:4321` and confirm the section renders, reads correctly, and is responsive. (If using the `browse` skill, screenshot desktop + mobile widths.)
3. **Commit.**

Per repo convention, **every commit message ends with**:
```
Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
```

**Branch:** all Phase 1 work lands on the existing `content-overhaul` branch (created during brainstorming; the design spec is already committed there).

**Design tokens available** (from `src/styles/global.css`): colors `bg`, `bg-elev`, `bg-deep`, `text`, `text-mute`, `text-dim`, `accent`, `accent-ink`, `border`, `border-soft`; fonts `font-serif`, `font-sans`. Use these — never raw hex (except the existing `to-[#0e1a31]` gradient stop in Contact).

**The copy rule (from spec §2):** every claim is a mechanism we do, a named capability, or honest framing of being early — never a fabricated/implied client, outcome, logo, or metric.

**Out of Phase 1 scope** (do not build here): the `/insights` blog (Phase 2), the canned demo (Phase 3), `og:image` already exists, LinkedIn/GitHub footer URLs (still placeholders — leave as-is, not in scope). The footer `/insights` link is **deferred to Phase 2** so Phase 1 ships no dead links.

---

## File structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/components/TrustStrip.astro` | **Create** | Slim vendor-neutral "we build on" band |
| `src/components/Industries.astro` | **Create** | Four regulated-sector cards (regulatory fluency) |
| `src/components/Faq.astro` | **Create** | Five objection-handling Q&As + FAQPage JSON-LD |
| `src/components/Services.astro` | Modify | Add a mechanism line to each of the 3 cards |
| `src/components/Approach.astro` | Modify | Reframe Discovery/Build/Operate as risk-reversal |
| `src/components/WhyUs.astro` | Modify | Sharpen 4 pillars + add a 5th (security) |
| `src/components/Hero.astro` | Modify | Result-framed CTA button label |
| `src/components/Nav.astro` | Modify | Add Industries link + result-framed CTA label |
| `src/components/Contact.astro` | Modify | Render CTA as a real button + email fallback line |
| `src/components/Footer.astro` | Modify | Add a repeat email CTA |
| `src/layouts/BaseLayout.astro` | Modify | Sharpen the meta/JSON-LD description |
| `src/pages/index.astro` | Modify | Import new components + apply the new section order |

---

## Task 1: Sharpen the site description (BaseLayout)

**Files:**
- Modify: `src/layouts/BaseLayout.astro:10-13`

- [ ] **Step 1: Update the default description**

In `src/layouts/BaseLayout.astro`, replace the destructured default description. Change:

```astro
  description = "Techsider builds production LLM platforms, retrieval systems, and AI agents for Australian businesses. Enterprise-grade, sovereign, vendor-neutral.",
```

to:

```astro
  description = "Techsider builds production LLM platforms, retrieval systems, and AI agents for Australia's regulated industries — vendor-neutral, sovereign by default, and you own the code.",
```

This description feeds the `<meta name="description">`, the OG/Twitter tags, and the `Organization` JSON-LD `description` in the same file, so one edit propagates everywhere.

- [ ] **Step 2: Build gate**

Run: `npm run build`
Expected: completes with no errors.

- [ ] **Step 3: Commit**

```bash
git add src/layouts/BaseLayout.astro
git commit -m "copy: sharpen site meta description to the production/sovereignty angle"
```

---

## Task 2: Create the Trust strip component

A slim, **text-only** band (no logo images — honest, no trademark assets, no implied partnership). Goes directly under the hero in Task 11.

**Files:**
- Create: `src/components/TrustStrip.astro`

- [ ] **Step 1: Create the file**

Create `src/components/TrustStrip.astro` with exactly:

```astro
---
const platforms = ["Anthropic", "OpenAI", "AWS Bedrock", "Azure", "Self-hosted"];
---
<section class="px-6 py-7 border-b border-border bg-bg-deep/40">
  <div class="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8">
    <p class="text-[11px] uppercase tracking-[0.18em] text-text-dim font-medium shrink-0">
      Vendor-neutral. We build on:
    </p>
    <ul class="flex flex-wrap items-center gap-x-6 gap-y-2">
      {platforms.map((p) => (
        <li class="text-sm text-text-mute font-medium">{p}</li>
      ))}
    </ul>
  </div>
</section>
```

- [ ] **Step 2: Build gate**

Run: `npm run build`
Expected: completes with no errors (the component is unused for now — that's fine, it's wired in Task 11).

- [ ] **Step 3: Commit**

```bash
git add src/components/TrustStrip.astro
git commit -m "feat: add vendor-neutral trust strip component"
```

---

## Task 3: Create the Industries component

Four cards turning the four target sectors into **regulatory fluency**, not case studies. Section `id="industries"` (linked from the nav in Task 10).

**Files:**
- Create: `src/components/Industries.astro`

- [ ] **Step 1: Create the file**

Create `src/components/Industries.astro` with exactly:

```astro
---
const sectors = [
  {
    name: "Financial services",
    body: "APRA CPS 230 and CPS 234. Operational-risk controls, incident-notification timeframes, and grounded answers your risk and compliance teams can audit.",
  },
  {
    name: "Government & public sector",
    body: "ISM- and IRAP-aligned deployments with data-classification handling — AI for agencies that can't send data offshore.",
  },
  {
    name: "Healthcare & life sciences",
    body: "Privacy Act and My Health Record obligations. Citable retrieval over clinical and policy documents, with a refusal path instead of a guess.",
  },
  {
    name: "Resources, energy & utilities",
    body: "SOCI critical-infrastructure obligations. Operational AI over the document-heavy, safety-critical workflows these sectors run on.",
  },
];
---
<section id="industries" class="px-6 py-24 md:py-32 border-b border-border">
  <div class="max-w-6xl mx-auto">
    <p class="text-xs uppercase tracking-[0.2em] text-accent font-medium mb-4">Who we work with</p>
    <h2 class="font-serif font-normal text-3xl md:text-4xl leading-[1.15] text-text max-w-[24ch] mb-4">
      Built for Australia's regulated sectors.
    </h2>
    <p class="text-text-mute text-base leading-relaxed max-w-[54ch] mb-12">
      We speak the compliance language of the industries we serve — not just the model APIs.
    </p>
    <div class="grid gap-6 md:grid-cols-2">
      {sectors.map((s) => (
        <article class="bg-bg-elev border border-border rounded-xl p-6 md:p-7">
          <h3 class="text-text font-semibold text-base mb-2">{s.name}</h3>
          <p class="text-text-dim text-sm leading-relaxed">{s.body}</p>
        </article>
      ))}
    </div>
  </div>
</section>
```

- [ ] **Step 2: Build gate**

Run: `npm run build`
Expected: completes with no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/Industries.astro
git commit -m "feat: add Industries section (four regulated AU sectors)"
```

---

## Task 4: Create the FAQ component (with FAQPage JSON-LD)

Five killer objections answered honestly. Includes `FAQPage` structured data for AI-assistant/SEO discoverability (a stated goal). Section `id="faq"`.

**Files:**
- Create: `src/components/Faq.astro`

- [ ] **Step 1: Create the file**

Create `src/components/Faq.astro` with exactly:

```astro
---
const faqs = [
  {
    q: "Where does our data go?",
    a: "Into your own environment. We deploy inside your sovereign boundary — AU-hosted or self-hosted — and we don't train models on your data.",
  },
  {
    q: "Are we locked in — to you, or to a model vendor?",
    a: "Neither. You own the source code and can run it without us, and we're vendor-neutral across Anthropic, OpenAI, AWS Bedrock, Azure, and self-hosted models.",
  },
  {
    q: "You're a new firm — why should we trust you?",
    a: "Start with the paid two-week discovery: a fixed-price, low-commitment way to judge our work before any build. Every engineer is senior, and you keep everything we produce.",
  },
  {
    q: "How do you keep an AI system reliable?",
    a: "Offline eval suites, request tracing, and regression gates before every promotion to production — the same discipline whether it's a retrieval pipeline or an agent.",
  },
  {
    q: "How long does it take, and what does it cost?",
    a: "Engagements open with a fixed-price two-week discovery that produces an architecture and a quote. Builds are fixed-scope from there, so you know the cost before we start.",
  },
];

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};
---
<section id="faq" class="px-6 py-24 md:py-32 border-b border-border">
  <div class="max-w-3xl mx-auto">
    <p class="text-xs uppercase tracking-[0.2em] text-accent font-medium mb-4">Questions</p>
    <h2 class="font-serif font-normal text-3xl md:text-4xl leading-[1.15] text-text mb-12">
      The things enterprise buyers ask first.
    </h2>
    <dl class="border-t border-border">
      {faqs.map((f) => (
        <div class="py-6 border-b border-border">
          <dt class="text-text font-semibold text-base mb-2">{f.q}</dt>
          <dd class="text-text-dim text-sm leading-relaxed">{f.a}</dd>
        </div>
      ))}
    </dl>
  </div>
  <script type="application/ld+json" set:html={JSON.stringify(faqJsonLd)} />
</section>
```

- [ ] **Step 2: Build gate**

Run: `npm run build`
Expected: completes with no errors. (Optional: confirm `dist/index.html` will contain the FAQ JSON-LD after Task 11 wires it in.)

- [ ] **Step 3: Commit**

```bash
git add src/components/Faq.astro
git commit -m "feat: add FAQ section with FAQPage structured data"
```

---

## Task 5: Add mechanism lines to Services

Keep the three cards and their technical precision; append one **mechanism** line each (the concrete thing we do — no invented metrics).

**Files:**
- Modify: `src/components/Services.astro`

- [ ] **Step 1: Add a `mechanism` field to each service**

In the frontmatter array, add a `mechanism` property to each object so it reads:

```astro
const services = [
  {
    num: "01",
    tag: "LLM OPS",
    title: "Production LLM platforms",
    body: "Evaluation harnesses, prompt versioning, observability, cost controls, model gateways. Whatever takes your AI from prototype to operations.",
    mechanism: "Every release passes an offline eval suite and a regression gate before it reaches production.",
  },
  {
    num: "02",
    tag: "RAG",
    title: "Retrieval systems",
    body: "Document ingestion, embedding pipelines, hybrid retrieval, grounded answers with citations. Built for your data, your privacy boundary.",
    mechanism: "Grounded answers your compliance team can audit — every claim traceable to a cited source.",
  },
  {
    num: "03",
    tag: "AGENTS",
    title: "Agentic workflows",
    body: "Tool-using agents for internal operations, customer service, and analyst-grade research. Designed with eval gates and human-in-the-loop.",
    mechanism: "Eval-gated and human-in-the-loop, scoped to refuse rather than guess.",
  },
];
```

- [ ] **Step 2: Render the mechanism line in each card**

In the `{services.map(...)}` block, immediately after the existing body `<p>`, add the mechanism line so the `<article>` reads:

```astro
        <article class="bg-bg-elev border border-border rounded-xl p-6 md:p-7">
          <p class="text-[11px] tracking-[0.18em] text-accent font-semibold mb-4">
            {s.num} / {s.tag}
          </p>
          <h3 class="text-text font-semibold text-base mb-2">{s.title}</h3>
          <p class="text-text-dim text-sm leading-relaxed">{s.body}</p>
          <p class="mt-4 pt-4 border-t border-border text-[13px] text-text-mute leading-relaxed">
            <span class="text-accent" aria-hidden="true">▸ </span>{s.mechanism}
          </p>
        </article>
```

- [ ] **Step 3: Build gate**

Run: `npm run build`
Expected: completes with no errors.

- [ ] **Step 4: Visual check**

Run: `npm run dev`, open `http://localhost:4321`, scroll to Services. Each card shows the mechanism line below a divider. Confirm it reads well on mobile width.

- [ ] **Step 5: Commit**

```bash
git add src/components/Services.astro
git commit -m "copy: add a concrete mechanism line to each service card"
```

---

## Task 6: Reframe Approach as risk-reversal

Reword the three steps to foreground fixed price/timebox, named deliverables, code ownership, and the "if it won't work we tell you" guarantee. Add a one-line intro.

**Files:**
- Modify: `src/components/Approach.astro`

- [ ] **Step 1: Replace the steps array**

Replace the `steps` array in the frontmatter with:

```astro
const steps = [
  {
    num: "i.",
    title: "Discovery",
    body: "A fixed-price, two-week discovery. We scope the problem, your data, and the success criteria — and you leave with an architecture, a quote, and working artifacts. If it won't work, we tell you, and you keep what we've built.",
  },
  {
    num: "ii.",
    title: "Build",
    body: "Fixed scope, fixed price. We instrument the system for evaluation as we build it — and the source code is yours to run, with or without us.",
  },
  {
    num: "iii.",
    title: "Operate",
    body: "Optional ongoing operations: model upgrades, eval-drift monitoring, and incident response — only if you want us past handover.",
  },
];
```

- [ ] **Step 2: Tighten the heading spacing and add an intro line**

Change the `<h2>` bottom margin from `mb-12` to `mb-4`, and insert an intro paragraph directly after it. The heading + intro block should read:

```astro
    <h2 class="font-serif font-normal text-3xl md:text-4xl leading-[1.15] text-text max-w-[28ch] mb-4">
      From conversation to operations in three steps.
    </h2>
    <p class="text-text-mute text-base leading-relaxed max-w-[54ch] mb-12">
      A low-risk on-ramp: you commit to two weeks, not a transformation programme.
    </p>
```

- [ ] **Step 3: Build gate**

Run: `npm run build`
Expected: completes with no errors.

- [ ] **Step 4: Visual check**

`npm run dev` → scroll to "How we work". Confirm the intro line renders under the heading and the three steps read as a risk-reversed offer.

- [ ] **Step 5: Commit**

```bash
git add src/components/Approach.astro
git commit -m "copy: reframe Approach as an explicit risk-reversal offer"
```

---

## Task 7: Sharpen Why-us and add a security pillar

Sharpen the four pillars from adjectives to mechanisms, and add a fifth pillar on security posture — **concrete true practices only, no certification claim**.

**Files:**
- Modify: `src/components/WhyUs.astro`

- [ ] **Step 1: Replace the pillars array**

Replace the `pillars` array in the frontmatter with:

```astro
const pillars = [
  {
    title: "Australian operations",
    body: "An AU-based team on AU business hours. Your data stays inside your sovereign boundary — we don't move it offshore.",
  },
  {
    title: "Production discipline",
    body: "Evals, tracing, and promotion gates from day one. We measure a system before we ship it — and again after.",
  },
  {
    title: "Vendor-neutral",
    body: "Anthropic, OpenAI, AWS Bedrock, Azure, or self-hosted — chosen on merit for your workload, never to fill a partner quota.",
  },
  {
    title: "Senior engineers only",
    body: "No bench, no offshore handoff. The people who scope your build are the people who build it.",
  },
  {
    title: "Secure by default",
    body: "Your data stays in your environment and we don't train on it. Every system ships with the access controls and audit trails your risk team expects.",
  },
];
```

No markup change is needed — the existing `{pillars.map(...)}` grid (`md:grid-cols-2`) handles five items (the fifth sits alone on the last row, which is fine).

- [ ] **Step 2: Build gate**

Run: `npm run build`
Expected: completes with no errors.

- [ ] **Step 3: Visual check**

`npm run dev` → scroll to "Why us". Confirm five pillars render in the two-column grid and the security pillar reads as concrete practice (no cert claim).

- [ ] **Step 4: Commit**

```bash
git add src/components/WhyUs.astro
git commit -m "copy: sharpen Why-us pillars and add a security-posture pillar"
```

---

## Task 8: Result-framed CTAs (Hero + Nav)

Swap the bare-email CTA labels for the result-framed **"Scope your AI build"** (still opening `mailto:`), and add the Industries link to the nav.

**Files:**
- Modify: `src/components/Hero.astro:18-22`
- Modify: `src/components/Nav.astro:8-15`

- [ ] **Step 1: Update the Hero CTA label**

In `src/components/Hero.astro`, inside the primary CTA `<a>`, replace the visible label. Change:

```astro
        admin@techsider.com.au
        <span aria-hidden="true">→</span>
```

to:

```astro
        Scope your AI build
        <span aria-hidden="true">→</span>
```

(Leave the `href="mailto:admin@techsider.com.au"` and all classes unchanged.)

- [ ] **Step 2: Update the Nav — add Industries link and relabel the CTA**

In `src/components/Nav.astro`, replace the inner links container (the `<div class="flex items-center gap-8">…</div>`) with:

```astro
    <div class="flex items-center gap-6 sm:gap-8">
      <a href="#services" class="hidden sm:inline text-xs uppercase tracking-[0.08em] text-text-mute hover:text-text transition-colors">Services</a>
      <a href="#industries" class="hidden sm:inline text-xs uppercase tracking-[0.08em] text-text-mute hover:text-text transition-colors">Industries</a>
      <a href="#approach" class="hidden sm:inline text-xs uppercase tracking-[0.08em] text-text-mute hover:text-text transition-colors">Approach</a>
      <a href="#contact" class="hidden sm:inline text-xs uppercase tracking-[0.08em] text-text-mute hover:text-text transition-colors">Contact</a>
      <a href="mailto:admin@techsider.com.au" class="text-xs font-semibold bg-accent text-accent-ink px-3 py-1.5 rounded hover:opacity-90 transition-opacity">
        Scope your AI build
      </a>
    </div>
```

- [ ] **Step 3: Build gate**

Run: `npm run build`
Expected: completes with no errors.

- [ ] **Step 4: Visual check**

`npm run dev` → confirm the hero button reads "Scope your AI build →", the nav shows the Industries link, and the nav CTA reads "Scope your AI build". (The `#industries` anchor resolves once Task 11 adds the Industries section.)

- [ ] **Step 5: Commit**

```bash
git add src/components/Hero.astro src/components/Nav.astro
git commit -m "copy: result-framed CTA label in hero and nav; add Industries nav link"
```

---

## Task 9: Final CTA as a real button (Contact) + Footer CTA

Render the closing CTA as a proper button (not a bare text link) with an email fallback line, and add a repeat email CTA to the footer.

**Files:**
- Modify: `src/components/Contact.astro`
- Modify: `src/components/Footer.astro`

- [ ] **Step 1: Replace the Contact CTA**

In `src/components/Contact.astro`, replace the single CTA `<a>` (the bare `admin@techsider.com.au` text link) with a button + fallback line:

```astro
    <a href="mailto:admin@techsider.com.au"
       class="inline-flex items-center gap-2 bg-accent text-accent-ink px-6 py-3 rounded text-sm font-semibold tracking-wide hover:opacity-90 transition-opacity">
      Scope your AI build
      <span aria-hidden="true">→</span>
    </a>
    <p class="mt-5 text-xs text-text-dim">
      or email <a href="mailto:admin@techsider.com.au" class="text-text-mute hover:text-text underline underline-offset-2">admin@techsider.com.au</a>
    </p>
```

Also tighten the copy just above it — change `Email us with a sentence` to `Email us a sentence` in the existing paragraph (minor polish). Leave the heading and section classes unchanged.

- [ ] **Step 2: Replace the Footer body**

Replace the contents of `src/components/Footer.astro` with:

```astro
---
const year = new Date().getFullYear();
---
<footer class="bg-bg-deep border-t border-border">
  <div class="max-w-6xl mx-auto px-6 py-10 flex flex-col gap-6">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <p class="text-sm text-text-mute">
        Production AI for Australia's regulated industries.
        <a href="mailto:admin@techsider.com.au" class="text-accent hover:opacity-90 transition-opacity whitespace-nowrap">Scope your AI build →</a>
      </p>
      <div class="flex gap-5 text-xs text-text-dim">
        <a href="https://www.linkedin.com/" target="_blank" rel="noopener" class="hover:text-text transition-colors">LinkedIn</a>
        <a href="https://github.com/" target="_blank" rel="noopener" class="hover:text-text transition-colors">GitHub</a>
      </div>
    </div>
    <p class="text-xs text-text-dim border-t border-border pt-6">© {year} Techsider · Built with ❤️ in Sydney, Australia.</p>
  </div>
</footer>
```

(The LinkedIn/GitHub placeholder URLs are intentionally left as-is — replacing them is a separate follow-up, not Phase 1. No `/insights` link yet — that arrives in Phase 2 to avoid a dead link.)

- [ ] **Step 3: Build gate**

Run: `npm run build`
Expected: completes with no errors.

- [ ] **Step 4: Visual check**

`npm run dev` → confirm the Contact section ends with a filled button plus an "or email …" line, and the footer shows the repeat CTA.

- [ ] **Step 5: Commit**

```bash
git add src/components/Contact.astro src/components/Footer.astro
git commit -m "feat: real button for the final CTA and a footer CTA"
```

---

## Task 10: Reorder the page and wire in the new sections

Apply the Phase-1 section order and import the three new components.

**Files:**
- Modify: `src/pages/index.astro`

- [ ] **Step 1: Replace index.astro**

Replace the entire contents of `src/pages/index.astro` with:

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
  <Faq />
  <Contact />
</BaseLayout>
```

This applies the spec order: Hero → Trust strip → Services → Approach → Why-us → Industries → FAQ → Contact. (The Demo and Insights slots — between Industries and FAQ — arrive in Phases 3 and 2.)

- [ ] **Step 2: Build gate**

Run: `npm run build`
Expected: completes with no errors.

- [ ] **Step 3: Full visual check**

`npm run dev` → walk the whole page top to bottom at desktop and mobile widths. Confirm: order matches above; nav anchors (`#services`, `#industries`, `#approach`, `#contact`) all scroll to the right section; no dead links; the hero 3D scene still loads.

- [ ] **Step 4: Commit**

```bash
git add src/pages/index.astro
git commit -m "feat: apply Phase 1 page order and wire in Trust strip, Industries, FAQ"
```

---

## Task 11: Acceptance pass (verification only — no new code)

Confirm Phase 1 meets the spec's acceptance criteria before handing off.

- [ ] **Step 1: Clean production build**

Run: `npm run build`
Expected: no errors or warnings about missing imports/undefined vars.

- [ ] **Step 2: Preview the built output**

Run: `npm run preview` and open the served URL. Verify the production build (not just dev) renders all sections correctly.

- [ ] **Step 3: Performance sanity (credibility-as-performance, spec §8)**

In the browser (or via the `web-perf` skill / Lighthouse), check the landing page: LCP under ~2s on a mobile profile, no layout shift from the hero, and that the page is usable with `prefers-reduced-motion` (the existing HeroScene behaviour is unchanged in Phase 1 — just confirm no regression). Record any issue as a follow-up; do not fix outside Phase 1 scope unless it's a regression introduced here.

- [ ] **Step 4: Content review against the copy rule (spec §2)**

Re-read every new/changed line and confirm: no fabricated or implied clients, logos, outcomes, metrics, or certifications. Every claim is a mechanism, a named capability, or honest framing. The Trust strip says "we build on", never "partners". The security pillar/FAQ claim concrete practices, not certs.

- [ ] **Step 5: Confirm scope boundaries**

Confirm Phase 1 did **not** introduce: the blog, the demo, a contact form, a booking link, an ABN/entity block, a `/insights` link, or any new npm dependency. `git diff main...content-overhaul --stat` should touch only the files in the File Structure table (plus the spec/plan docs).

- [ ] **Step 6: Done**

No commit needed if Steps 1–5 pass clean. Phase 1 is ready for review/merge. Next: Phase 2 (`/insights` blog) gets its own plan.

---

## Self-review (plan author)

**Spec coverage (P1 rows of spec §5 + §9 decisions):**
- Nav result-framed CTA + Industries link → Task 8 ✓
- Hero result-framed CTA → Task 8 ✓
- Trust strip → Task 2 (created), Task 10 (wired) ✓
- Services mechanism lines → Task 5 ✓
- Approach risk-reversal + moved before Why-us → Task 6 (copy), Task 10 (order) ✓
- Why-us sharpen + 5th security line (concrete practices, no cert) → Task 7 ✓
- Industries (4 sectors, regulatory framing) → Task 3 (created), Task 10 (wired) ✓
- FAQ (5 objections) + discoverability → Task 4 ✓
- Final CTA real button → Task 9 ✓
- Footer repeat CTA, no ABN, `/insights` deferred → Task 9 + scope notes ✓
- Meta/JSON-LD sharpen (cross-cutting SEO) → Task 1 ✓
- Page reorder → Task 10 ✓
- Performance + no-fabrication acceptance → Task 11 ✓

**Placeholder scan:** No TBD/TODO; every code step shows full content. The only deferrals (blog, demo, `/insights` link, LinkedIn/GitHub URLs) are explicit scope boundaries, not gaps.

**Type/identifier consistency:** New components export no shared types. Component names match their imports in Task 10 (`TrustStrip`, `Industries`, `Faq`). Section ids (`#industries`, `#services`, `#approach`, `#contact`) used in Nav (Task 8) all resolve to real sections after Task 10. The `mechanism` field added in Task 5 is both defined and rendered in the same task.
