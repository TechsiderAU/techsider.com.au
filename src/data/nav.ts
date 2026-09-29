// Single source of page identity (spec §7.2). Plain TypeScript with no imports,
// so node tests and CI scripts can import it directly.
// Paths are declared, not derived: slugs are permanent (GitHub Pages can't 301),
// so tests/nav-data.test.mjs fails if a path stops matching its short name.

export type Status = "live" | "planned";

/**
 * The section a page belongs to (spec §7.2), for breadcrumbs, BreadcrumbList and CI check 1.
 * Hubs carry their own group. It is declared, not read off the nav: Demos sits in the Resources
 * panel and Legal and Contact in the About panel, but each heads its own section, and pages
 * outside the nav (demo pages, legal children, Sent, 404) still need one.
 */
export type Group = "home" | "solutions" | "industries" | "services" | "resources" | "demos" | "about" | "legal" | "contact" | "system";

export interface PageEntry {
  shortName: string;
  fullName: string;
  /** Directory the slug is appended to, e.g. "/solutions/". */
  base: string;
  path: string;
  group: Group;
  status: Status;
  oneLiner?: string;
  /**
   * The page's meta description (spec §11.3): unique across the site, 150–160 characters. A route
   * passes it to BaseLayout through pageDescription() (src/lib/meta.ts), which fails the build when
   * it is missing, and tests/meta.test.mjs requires one of every live page. Write it when the page
   * goes live.
   */
  description?: string;
}

export interface Anchor {
  label: string;
  href: string;
}

export interface NavGroup {
  id: "solutions" | "industries" | "services" | "resources" | "about";
  label: string;
  hub: PageEntry;
  /** Plain text: SiteHeader adds the "→" aria-hidden, so screen readers don't read "right arrow". */
  allLabel: string;
  layout: "rows" | "columns";
  items: PageEntry[];
  anchors: Anchor[];
}

export interface VisibleGroup {
  id: NavGroup["id"];
  label: string;
  hubHref: string | null;
  allLabel: string;
  layout: NavGroup["layout"];
  items: PageEntry[];
  anchors: Anchor[];
}

export interface Link {
  label: string;
  href: string;
}

export interface FooterColumn {
  title: string;
  links: Link[];
}

export interface Cta {
  label: string;
  href: string;
  fallbackHref: string;
}

export const SITE = {
  name: "Techsider",
  /** Legal entity for the footer ©. Owner to confirm the registered entity (spec §12 item 5). */
  legalName: "Techsider",
  email: "admin@techsider.com.au",
  slogan: "AI that ships.",
  proofLine: "Measured before it ships.",
};

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/[\s-]+/g, "-");
}

function page(group: Group, shortName: string, base: string, path: string, status: Status, fullName?: string, oneLiner?: string): PageEntry {
  const entry: PageEntry = { shortName, fullName: fullName ?? shortName, base, path, group, status };
  if (oneLiner) entry.oneLiner = oneLiner;
  return entry;
}

/** Sets a page's meta description (PageEntry.description), which pageDescription() checks. */
function describe(entry: PageEntry, description: string): PageEntry {
  entry.description = description;
  return entry;
}

const HOME = describe(page("home", "Home", "/", "/", "live", "Techsider"),
  "AI that ships. Measured before it ships. We design, build and run AI solutions for Australian organisations, from 40-person practices to federal agencies.");
// Always built: GitHub Pages serves dist/404.html for any path it has no file for.
const NOT_FOUND = describe(page("system", "Not found", "/", "/404", "live"),
  "No page lives at this address. It may be mistyped or out of date. Follow a link below to a section of the Techsider site, or report the broken link by email.");

const SOLUTIONS_HUB = describe(page("solutions", "Solutions", "/", "/solutions/", "live"),
  "Five AI solutions for Australian organisations: document registers, cited assistants, draft-for-approval automation, independent evaluation and AI switch-on.");
const SOLUTIONS = [
  describe(page("solutions", "Document Registers", "/solutions/", "/solutions/document-registers/", "live", "Document Registers & Evidence Packs",
    "PDFs your team reads by hand, turned into a register you can check."),
    "Turn the documents your team reads by hand into a register you can check, with every field linked to its page and an error rate measured on your own answer key."),
  describe(page("solutions", "Knowledge Assistant", "/solutions/", "/solutions/knowledge-assistant/", "live", "Cited Knowledge Assistant",
    "Answers from your own manuals, with the page it used."),
    "An assistant that answers staff questions from your own manuals and policies, shows the page it used, and says so when the answer isn't in your documents."),
  describe(page("solutions", "Draft-for-Approval", "/solutions/", "/solutions/draft-for-approval/", "live", "Draft-for-Approval Automation",
    "One back-office job, drafted for a person to approve."),
    "Automate one back-office job across your systems. It sorts, summarises, drafts and routes; a person approves anything sent, changed or decided. Tested first."),
  describe(page("solutions", "AI Evaluation", "/solutions/", "/solutions/ai-evaluation/", "live", "Independent AI Evaluation",
    "Independent tests of AI you bought or had built elsewhere."),
    "Independent tests of AI you bought or had built elsewhere, on your own questions in your own environment, with every failure listed and a kit you can re-run."),
  describe(page("solutions", "AI Switch-On", "/solutions/", "/solutions/ai-switch-on/", "live", "AI Switch-On & Safe Use",
    "Value from the AI already inside software you pay for."),
    "Get value from the AI already inside the software you pay for: set it up with ground rules, train staff, and measure the hours saved at day 30, in your units."),
];

const INDUSTRIES_HUB = page("industries", "Industries", "/", "/industries/", "planned");
const INDUSTRIES = [
  describe(page("industries", "Government", "/industries/", "/industries/government/", "live", "Government & public sector"),
    "Independent evaluation of AI in government: measured tests on your own questions, with findings mapped to the DTA AI policy, NSW AIAF or Queensland's FAIRA."),
  describe(page("industries", "Financial services", "/industries/", "/industries/financial-services/", "live"),
    "Independent validation of vendor AI for APRA-regulated entities and ASIC licensees: your own test set, re-run when the model may change, every failure listed."),
  describe(page("industries", "Accounting", "/industries/", "/industries/accounting/", "live"),
    "A register of every client trust deed, each field linked to its page and checked against deeds your seniors already know, for Australian accounting practices."),
  page("industries", "Education", "/industries/", "/industries/education/", "planned"),
  page("industries", "Manufacturing", "/industries/", "/industries/manufacturing/", "planned"),
  page("industries", "Real estate", "/industries/", "/industries/real-estate/", "planned", "Real estate & property"),
  page("industries", "Healthcare", "/industries/", "/industries/healthcare/", "planned", "Healthcare & life sciences"),
  page("industries", "Resources & energy", "/industries/", "/industries/resources-and-energy/", "planned", "Resources, energy & utilities"),
  page("industries", "Legal & professional", "/industries/", "/industries/legal-and-professional/", "planned", "Legal & professional services"),
];

const SERVICES_HUB = describe(page("services", "Services", "/", "/services/", "live", "Services",
  "From first use case to a system your team runs."),
  "Prove it on your own files, build one package, then run it with the exit built in. Our services, where each buyer starts, where it runs, and our independence.");
const EVALUATION_PARTNER = describe(page("services", "Evaluation Partner", "/services/", "/services/evaluation-partner/", "live", "Evaluation Partner",
  "An independent evaluation workstream under your existing prime or adviser."),
  "Independent AI evaluation under your contract, for primes, internal-audit co-source firms, law firms and SIs, with findings rated to your client's risk matrix.");

const RESOURCES_HUB = page("resources", "Resources", "/", "/resources/", "planned");
const INSIGHTS = describe(page("resources", "Insights", "/", "/insights/", "live", "Insights", "Field notes on shipping AI in regulated work."),
  "Field notes on shipping AI in regulated Australian work: retrieval that cites its sources, evaluation before launch, and choosing where models are hosted.");
const DEMOS = page("demos", "Demos", "/", "/demos/", "planned", "Demos", "Canned replays of each solution. No live model.");
const SAFE_USE_KITS = page("resources", "Safe-Use Kits", "/resources/", "/resources/safe-use-kits/", "planned", "Safe-Use Kits",
  "Free starter kits for accounting, legal and property teams.");
const PAY_FOR = page("resources", "What you already pay for", "/resources/", "/resources/what-you-already-pay-for/", "planned", "What you already pay for",
  "Check which AI features your software already includes.");
const EVAL_METHOD = page("resources", "Evaluation method", "/resources/", "/resources/evaluation-method/", "planned", "Evaluation method",
  "How we test AI, published so you can re-run it.");
const RESOURCES_ITEMS = [INSIGHTS, DEMOS, SAFE_USE_KITS, PAY_FOR, EVAL_METHOD];

const ABOUT = page("about", "About", "/", "/about/", "planned");
const TRUST = page("about", "Trust", "/", "/trust/", "planned");
const LEGAL = page("legal", "Legal", "/", "/legal/", "planned");
const CONTACT = page("contact", "Contact", "/", "/contact/", "planned");

const PRIVACY = page("legal", "Privacy", "/legal/", "/legal/privacy/", "planned", "Privacy policy");
const WEBSITE_TERMS = page("legal", "Website terms", "/legal/", "/legal/website-terms/", "planned");
const CONTACT_SENT = page("contact", "Sent", "/contact/", "/contact/sent/", "planned", "Message sent");
const DEMO_PAGES = SOLUTIONS.map((s) => page("demos", s.shortName, "/demos/", `/demos/${slugify(s.shortName)}/`, "planned", `${s.fullName} demo`));

export const NAV_GROUPS: NavGroup[] = [
  { id: "solutions", label: "Solutions", hub: SOLUTIONS_HUB, allLabel: "All solutions", layout: "rows", items: SOLUTIONS, anchors: [] },
  { id: "industries", label: "Industries", hub: INDUSTRIES_HUB, allLabel: "All industries", layout: "columns", items: INDUSTRIES, anchors: [] },
  {
    id: "services", label: "Services", hub: SERVICES_HUB, allLabel: "How we work", layout: "rows", items: [EVALUATION_PARTNER],
    anchors: [
      { label: "Prove", href: "/services/#prove" },
      { label: "Build", href: "/services/#build" },
      { label: "Run", href: "/services/#run" },
    ],
  },
  { id: "resources", label: "Resources", hub: RESOURCES_HUB, allLabel: "All resources", layout: "rows", items: RESOURCES_ITEMS, anchors: [] },
  { id: "about", label: "About", hub: ABOUT, allLabel: "About Techsider", layout: "rows", items: [TRUST, LEGAL, CONTACT], anchors: [] },
];

export const PAGES: PageEntry[] = [
  HOME, NOT_FOUND,
  SOLUTIONS_HUB, ...SOLUTIONS,
  INDUSTRIES_HUB, ...INDUSTRIES,
  SERVICES_HUB, EVALUATION_PARTNER,
  RESOURCES_HUB, INSIGHTS, DEMOS, SAFE_USE_KITS, PAY_FOR, EVAL_METHOD, ...DEMO_PAGES,
  ABOUT, TRUST, LEGAL, PRIVACY, WEBSITE_TERMS, CONTACT, CONTACT_SENT,
];

export const EXEMPT_PATHS = ["/", "/404"];

export const CTAS: Record<"talk" | "demo", Cta> = {
  talk: { label: "Talk to us", href: "/contact/", fallbackHref: `mailto:${SITE.email}` },
  demo: { label: "See a demo", href: "/demos/", fallbackHref: "/#demo" },
};

/** TECHSIDER_NAV_PREVIEW=1 at build time renders planned pages too (tests only). */
export function isPreview(): boolean {
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env;
  return env?.TECHSIDER_NAV_PREVIEW === "1";
}

export function isShown(p: PageEntry, preview: boolean): boolean {
  return preview || p.status === "live";
}

export function visibleGroups(preview: boolean): VisibleGroup[] {
  return NAV_GROUPS.map((g) => {
    const hubShown = isShown(g.hub, preview);
    return {
      id: g.id,
      label: g.label,
      hubHref: hubShown ? g.hub.path : null,
      allLabel: g.allLabel,
      layout: g.layout,
      items: g.items.filter((i) => isShown(i, preview)),
      anchors: hubShown ? g.anchors : [],
    };
  }).filter((g) => g.hubHref !== null || g.items.length > 0);
}

export function noJsLinks(preview: boolean): Link[] {
  return visibleGroups(preview).flatMap((g) =>
    g.hubHref ? [{ label: g.label, href: g.hubHref }] : g.items.map((i) => ({ label: i.shortName, href: i.path })),
  );
}

export function footerLabel(industry: PageEntry): string {
  return `AI for ${industry.shortName.toLowerCase()}`;
}

function linksFor(entries: PageEntry[], preview: boolean, label: (e: PageEntry) => string = (e) => e.shortName): Link[] {
  return entries.filter((e) => isShown(e, preview)).map((e) => ({ label: label(e), href: e.path }));
}

export function footerColumns(preview: boolean): FooterColumn[] {
  const columns: FooterColumn[] = [
    { title: "Solutions", links: linksFor(SOLUTIONS, preview) },
    { title: "Industries", links: linksFor(INDUSTRIES, preview, footerLabel) },
    { title: "Services", links: linksFor([SERVICES_HUB, EVALUATION_PARTNER], preview) },
    { title: "Resources", links: linksFor(RESOURCES_ITEMS, preview) },
    { title: "Company", links: linksFor([ABOUT, TRUST, LEGAL, CONTACT], preview) },
  ];
  return columns.filter((c) => c.links.length > 0);
}

export function legalLinks(preview: boolean): Link[] {
  return linksFor([PRIVACY, WEBSITE_TERMS], preview);
}

export function resolveCta(cta: Cta, preview: boolean): Link {
  const target = PAGES.find((p) => p.path === cta.href);
  return { label: cta.label, href: target && isShown(target, preview) ? cta.href : cta.fallbackHref };
}
