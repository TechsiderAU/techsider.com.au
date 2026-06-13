# Techsider landing-page content overhaul — design

- **Date:** 2026-06-14
- **Status:** Approved design, pending spec review
- **Builds on:** `2026-05-12-techsider-landing-design.md` (the v1 landing page)
- **Scope model:** One master design, implemented in three independently-shippable phases (content-first).

## 1. Context & goal

Techsider is a **pre-first-client** Australian enterprise AI services consultancy (LLM Ops, RAG, agents). The site `techsider.com.au` is a static Astro 5 / Tailwind v4 page on GitHub Pages; its job is B2B lead generation. The v1 page is lean and well-written (Nav → Hero → Services → Why-us → Approach → Contact) but light on what converts enterprise buyers.

This overhaul pursues four goals at once: **build credibility, sharpen positioning, expand sections, and improve conversion.**

The defining constraint: there is **no existing proof** — no delivered case studies, no client logos, no testimonials, no quantified outcomes — and we will not fabricate or imply any. Credibility is therefore built on **demonstrated competence** (a technical blog + a working demo) and **specificity**, not pedigree.

## 2. Positioning & messaging spine

The foundation every section hangs off.

- **Core promise:** *Australian senior engineers who take LLM, RAG, and agent systems from prototype to audited production — vendor-neutral, sovereign by default, and you own the code.*
- **Headline angle:** production discipline + AU data sovereignty. This is genuinely **unowned whitespace** in the AU market — every rival (Mantel, Quantium, Hyperthink, the Big-4, the SMB boutiques) sells "innovation / pioneering / reinvention / workshops," while 2026 buyers are tired of pilots that never ship. Keep the existing hero headline ("Production AI systems, built for regulated industries"); lean harder on "built to pass production **and audit**."
- **Audience (and who it repels):** AU regulated-enterprise technical *and* risk buyers — CTOs, heads of data/AI, platform/ops, risk/compliance/procurement — across financial services, government, healthcare, resources/energy. A non-regulated, SMB, or non-AU visitor should feel "this isn't for me."
- **Voice:** engineer-to-engineer. Specific, mechanism-led, no hype. Quietly confident about being early.
- **The rule that governs every line of copy:** every claim is one of three things — a **mechanism we actually do**, a **named capability**, or an **honest framing of being early**. Never a fabricated or implied outcome, client, logo, or metric.
- **Site-wide "adjective → mechanism" rewrite:** "robust / enterprise-grade / best-in-class" → the concrete thing we do that earns the word.

## 3. Constraints

- Static output only (GitHub Pages); **no backend / no server-side code**.
- Astro 5 + Tailwind v4; stay on Astro 5 (per v1 spec — `@tailwindcss/vite` doesn't support Astro 6's rolldown-vite yet).
- No fabricated or implied social proof (also an ACCC misleading-conduct risk).
- Email-only contact (no form, no booking) — by user choice.
- Keep the codebase pattern: one `.astro` component per section, Tailwind `@theme` tokens in `global.css`, composed in `index.astro`. No unrelated refactors.

## 4. Phasing

| Phase | Deliverable | Why this order |
|-------|-------------|----------------|
| **P1** | Static content/positioning overhaul — reorder + rewrite + new content-only sections | Pure markup; ships fast; immediately more credible. Covers positioning + expansion + conversion. |
| **P2** | `/insights` blog (Astro content collections) + on-page surface + 3 flagship posts | The primary long-run credibility engine. Covers the core credibility goal. |
| **P3** | Canned interactive demo | The centerpiece proof artifact; the heaviest build. Gets its own focused implementation plan. |

Each phase is independently shippable and independently verifiable.

## 5. Phase 1 — page architecture & section content

All static Astro/markup; no new infrastructure. Target page top-to-bottom (🔜 = slot filled in a later phase):

| # | Section | Phase | Content direction |
|---|---------|-------|-------------------|
| 1 | **Nav** | P1 | Keep sticky wordmark nav. CTA button label → **"Scope your AI build"** (opens `mailto:admin@techsider.com.au`). Section links added as their sections ship. |
| 2 | **Hero** | P1 | Keep headline + subhead. Swap the bare-email button for the **"Scope your AI build"** label; keep the soft "See our services ↓". |
| 3 | **Trust strip** *(new)* | P1 | Slim band: **"Vendor-neutral. We build on:"** + Anthropic · OpenAI · AWS Bedrock · Azure · self-hosted. Explicitly *not* partners/clients — the honest stand-in for a logo wall. |
| 4 | **Services** | P1 | Keep the 3 cards + technical precision. Add one **mechanism line** each: LLM Ops → "every release passes an offline eval suite + regression gate before promotion"; RAG → "grounded answers your compliance team can audit — every claim cited"; Agents → "eval-gated, human-in-the-loop, scoped to refuse rather than guess." |
| 5 | **Approach** *(moved up)* | P1 | Move to right after Services. Reframe Discovery→Build→Operate as **overt risk-reversal**: fixed price, fixed 2-week timebox, named deliverables (architecture + quote + artifacts), **"you own the source code,"** and "if discovery shows it won't work, we tell you — and you keep the artifacts." |
| 6 | **Why-us** | P1 | Keep the 4 pillars; sharpen each adjective→mechanism. Add a 5th **security/compliance posture** line stating *concrete true practices only* (AU hosting, data stays in your boundary, no training on client data, eval/tracing discipline) — **no certification claim**. |
| 7 | **Industries** *(new)* | P1 | 4 cards = regulatory fluency, not case studies. FS → APRA CPS 230/234; Gov → ISM/IRAP + data classification; Health → Privacy Act / My Health Record; Resources/energy → SOCI. Each names the regulatory pressure + the matching AI use-case. Framed as "sectors we focus on / the problem each shares." |
| 8 | **Demo** 🔜 | P3 | Slot reserved (after Industries, before Insights). |
| 9 | **Insights** 🔜 | P2 | Slot reserved (3 latest posts). |
| 10 | **FAQ** *(new)* | P1 | The 5 killer objections, answered honestly: data residency/sovereignty · vendor lock-in (you own the code, vendor-neutral) · "why trust a new firm" (paid discovery caps your risk + senior-only + see the proof) · security & eval discipline · typical engagement cost & length. |
| 11 | **Final CTA** | P1 | Keep "Have a problem worth solving?" + the 2-business-day reply promise; render as a **real button** with the same label as the hero. |
| 12 | **Footer** | P1 | Add `/insights` link + one repeat email CTA. **No ABN/entity details** (none to show yet). |

**Net Phase-1 shipping order** (until P2/P3 fill their slots): Hero → Trust strip → Services → Approach → Why-us → Industries → FAQ → Final CTA → Footer.

## 6. Phase 2 — the `/insights` blog

The primary credibility engine, built on **Astro content collections** (native, zero-runtime, static-safe).

**Architecture (builds at deploy time):**
- **Content collection** in `src/content.config.ts` (Astro 5 Content Layer + `glob()` loader) over `src/content/insights/*.md`. Frontmatter schema, type-checked at build: `title`, `description`, `publishDate`, `updatedDate?`, `pillar` (enum of the 6 pillars), `sectors?` (subset of the 4), `draft`. Reading time derived from word count at build — **no new dependency**.
- **Pages:** `/insights` index (newest-first, pillar tags for scanning) and `/insights/[...slug]` post pages. Post layout is typography-first — EB Garamond headings / Inter body (already self-hosted), Astro's built-in **Shiki** for code blocks, a clean prose measure. Each post ends with one understated CTA (demo → paid-discovery email).
- **On-page surface:** new `Insights.astro` component on the landing page showing the **3 most recent posts** (title · date · reading time · pillar), inserted at slot #9, linking to `/insights`.

**6 content pillars (sector-specific clusters, not one generic voice):**
1. Production LLMOps & reliability — evals, tracing, gates, cost/latency
2. RAG & retrieval engineering — chunking, hybrid retrieval, citations
3. Agentic systems — agent-vs-workflow, tool design, guardrails
4. AU data sovereignty, security & compliance — CPS 230/234, IRAP, Privacy Act, SOCI
5. Vendor-neutral platform engineering — Anthropic/OpenAI/Bedrock/Azure/self-hosted trade-offs
6. *(optional)* How we deliver — the discovery / fixed-scope / own-the-code methodology

**3 flagship posts live at launch** (the "minimum credible proof set" — evergreen, forwardable-to-a-CTO):
- *"Evals before vibes: the gates we run on every LLM release"* (LLMOps → the positioning)
- *"Shipping a RAG system that survives an APRA audit: tracing, citations, and abstention"* (RAG + sovereignty → cross-links to the demo)
- *"Self-hosted vs Bedrock vs Azure OpenAI for sovereign workloads in Australia: a decision matrix"* (vendor-neutral + sovereignty)

**Content sourcing:** Claude drafts all three end-to-end from the production-discipline methodology the site describes; the user reviews and corrects every technical claim before publish and owns the final stances. No methodology is fabricated.

**Discoverability:** JSON-LD `Article` / `Organization`, per-post OG images, an `@astrojs/rss` feed, an unambiguous firm description, sitemap extended to posts. (~Half of enterprise buyers start vendor research in ChatGPT/Gemini.)

**New dependencies:** `@astrojs/rss` only. Markdown for v1; MDX (`@astrojs/mdx`) deferred until a post needs interactive components.

**Cadence (operational, not a build task):** 1–2 substantial posts/month, pillar-and-cluster internal linking, visible post dates. Never let it go stale — an abandoned blog on a new domain undercuts the production-discipline brand.

## 7. Phase 3 — the canned interactive demo (centerpiece)

A real interactive **client-side** component (no backend, no framework) — *not* a video or screenshot tour. For a regulated-sector CTO, watching the reliability work get done is the proof that replaces case studies.

**Architecture:**
- `Demo.astro` section + a deferred client script + a **scripted-transcript data module** (canned turns: question, retrieved chunks, answer tokens, citation→source mappings, trace steps, eval numbers). Same "deferred client script" pattern as the existing `HeroScene`. Vanilla TS, **no new heavy deps**.
- State machine: `idle → asking → retrieving → answering → done`, with play/replay controls.
- **Lazy-loaded via IntersectionObserver** — never costs hero LCP.

**Scenario** — one tight flow, 5–7 steps, ~30-word captions, opens with a one-line framing modal. Launch scenario: a compliance analyst asks *"What are our APRA CPS 230 incident-notification timeframes?"* (confirmable; a health/gov scenario is a later addition). Visible flow, in order:
1. **Retrieve** over a sample corpus — shows retrieved chunks *with similarity scores and `k`*.
2. **Stream** a token-by-token grounded answer.
3. **Inline `[1][2]` citation chips** on every factual sentence → clicking opens a right-hand source panel and **highlights the exact cited sentence** (doc title · section · page).
4. Collapsible **Trace / Evals tab** (LangSmith-style): steps (`retrieve k=4 → rerank → generate`), per-step latency badges, evals line (*Groundedness: pass — every claim cited · Faithfulness 0.xx · retrieval recall*).
5. One **honest abstention** beat — a follow-up answered *"Not stated in the provided documents — escalating to a human"* — to show grounding/refusal.
6. Reset.

**Corpus = real public AU documents** (launch: an APRA prudential standard; clearly labeled as public reference data). The canned answer's claims must genuinely match the cited source text, so a buyer who clicks through sees the citation actually supports the sentence. Proves sector fluency and real document handling without fabricating client work.

**Honesty framing (non-negotiable, persistent, not fine print):** an always-visible badge — **"Recorded illustrative demo — runs entirely in your browser, no live model or backend."** — plus one reframing line: *"This replays a representative RAG interaction on public sample data; your engagement runs on your own corpus and infrastructure."* The word **"live" is never used.** This converts the canned nature *into* the data-sovereignty proof point and neutralizes FTC/ACCC AI-washing exposure.

**Graceful degradation & a11y:** no-JS fallback renders the final answer + citations as plain HTML (proof survives); `prefers-reduced-motion` skips typing and shows the end state; controls keyboard-operable; streamed text in an ARIA live region; citation→source moves focus.

## 8. Cross-cutting concerns (all phases)

- **Performance as a credibility feature:** budget the 3D `HeroScene` (lazy WebGL init, reduced-motion fallback, defer below LCP), lazy-load the demo, verify **sub-2s mobile + passing Core Web Vitals** as an acceptance criterion.
- **AI-discoverability & SEO:** site-wide JSON-LD `Organization` + per-post `Article`, unambiguous firm description, OG images (the `og:image` meta tag is still a v1 to-do), RSS, sitemap.
- **Accessibility:** semantic landmarks, keyboard operability, ARIA for the demo, reduced-motion, contrast.
- **Verification per phase:** `astro check` + clean build, Lighthouse/CWV, manual QA of the demo (all states + no-JS fallback), link check, and a no-fabrication content review against §2's rule.

## 9. Decisions locked

| Decision | Choice |
|----------|--------|
| Scope/sequencing | Phased, content-first (P1 → P2 → P3) |
| Sector positioning | Broad — all four AU sectors, named explicitly |
| Demo form | Canned client-side widget (no live model, no backend) |
| Credibility levers | Demonstrated expertise (blog) + capability demo; **not** founder-fronted |
| Security posture | Concrete true practices only; no certification claim |
| Footer entity | No ABN/entity details yet |
| Blog content | Claude drafts; user verifies & owns technical claims before publish |
| Contact | Email-only with a result-framed button + 2-business-day promise |

## 10. Out of scope (explicitly NOT doing)

- Client-logo wall, testimonials, case studies, "N+ projects" or any quantified outcome — none exist; fabricating/implying is an ACCC risk.
- Named-founder / team-bio section (user declined founder-fronting; the anonymous "senior engineers only" claim stays in Why-us).
- Stock "team in a glass office" photography.
- Certification claims (SOC 2 / ISO 27001) — none held.
- Contact form or booking/calendar integration.
- A truly *live* AI demo (would require a serverless endpoint off GitHub Pages).
- Astro 6 upgrade; any unrelated refactor.

## 11. Risks & mitigations

- **Fabricated/implied proof is catastrophic** → enforced by §2's rule + a content-review pass; ACCC exposure noted.
- **Demo AI-washing risk** → persistent "recorded/illustrative" label; never say "live."
- **Broad positioning dilutes content power** → deep *sector-specific* blog clusters + the Industries section recover specificity without abandoning breadth.
- **Empty/stale blog damages the brand** → launch with 3 flagship posts, never "coming soon"; sustainable cadence.
- **3D hero as a perf liability** → performance budget + CWV acceptance criterion.
- **Unrealistic timeline** → thought-leadership inbound compounds over 6–18 months; this is a foundation, not a launch-week lead spike.

## 12. Open items for implementation

- Confirm/select the exact public APRA document(s) for the demo corpus, and the precise grounded answer text + citations (must match the source).
- User verification of the three flagship posts' technical claims before publish.
- Confirm the demo launch scenario (APRA CPS 230) vs. an alternative sector.

## 13. Success criteria

- Page reads as a credible, specific, senior AU regulated-AI firm with **zero fabricated proof**.
- A technical buyer can self-educate (Insights) and self-evaluate (Demo) without contacting anyone.
- All four goals visibly addressed: trust (blog + demo + specificity), positioning (production discipline + sovereignty, four named sectors), expansion (Trust strip, Industries, Demo, Insights, FAQ), conversion (result-framed CTA, risk-reversal Approach, objection-handling FAQ).
- Sub-2s mobile load, passing Core Web Vitals, no-JS demo fallback, clean `astro check` + build.

## 14. References

Grounded in a research pass (2026-06-14): the AU AI-consultancy competitive scan (Mantel/Eliiza, Quantium, Hyperthink, Max Kelsen, Servian, Daisee, Deloitte, Accenture, NCS/Arq, SMB boutiques), B2B landing-page anatomy (Tribe AI, Instapage, sitesgo, Liberman), credibility-without-proof literature (the "Credibility Ladder," risk-reversal, specificity-as-trust, enterprise vendor due-diligence), and demo/RAG-UI + technical-blog best practice (Navattic, LangSmith, RAG-citation guidance, developer-marketing, Anthropic/thoughtbot/Fowler).
