// Single source of page identity (spec §7.2). Plain TypeScript with no imports,
// so node tests and CI scripts can import it directly.
// Paths are declared, not derived: slugs are permanent (GitHub Pages can't 301),
// so tests/nav-data.test.mjs fails if a path stops matching its short name.

export type Status = "live" | "planned";

export interface PageEntry {
  shortName: string;
  fullName: string;
  /** Directory the slug is appended to, e.g. "/solutions/". */
  base: string;
  path: string;
  status: Status;
  oneLiner?: string;
}

export interface Anchor {
  label: string;
  href: string;
}

export interface NavGroup {
  id: "solutions" | "industries" | "services" | "resources" | "about";
  label: string;
  hub: PageEntry;
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

function page(shortName: string, base: string, path: string, status: Status, fullName?: string, oneLiner?: string): PageEntry {
  const entry: PageEntry = { shortName, fullName: fullName ?? shortName, base, path, status };
  if (oneLiner) entry.oneLiner = oneLiner;
  return entry;
}

const HOME = page("Home", "/", "/", "live", "Techsider");
const NOT_FOUND = page("Not found", "/", "/404", "planned");

const SOLUTIONS_HUB = page("Solutions", "/", "/solutions/", "planned");
const SOLUTIONS = [
  page("Document Registers", "/solutions/", "/solutions/document-registers/", "planned", "Document Registers & Evidence Packs",
    "PDFs your team reads by hand, turned into a register you can check."),
  page("Knowledge Assistant", "/solutions/", "/solutions/knowledge-assistant/", "planned", "Cited Knowledge Assistant",
    "Answers from your own manuals, with the page it used."),
  page("Draft-for-Approval", "/solutions/", "/solutions/draft-for-approval/", "planned", "Draft-for-Approval Automation",
    "One back-office job, drafted for a person to approve."),
  page("AI Evaluation", "/solutions/", "/solutions/ai-evaluation/", "planned", "Independent AI Evaluation",
    "Independent tests of AI you bought or had built elsewhere."),
  page("AI Switch-On", "/solutions/", "/solutions/ai-switch-on/", "planned", "AI Switch-On & Safe Use",
    "Value from the AI already inside software you pay for."),
];

const INDUSTRIES_HUB = page("Industries", "/", "/industries/", "planned");
const INDUSTRIES = [
  page("Government", "/industries/", "/industries/government/", "planned", "Government & public sector"),
  page("Financial services", "/industries/", "/industries/financial-services/", "planned"),
  page("Accounting", "/industries/", "/industries/accounting/", "planned"),
  page("Education", "/industries/", "/industries/education/", "planned"),
  page("Manufacturing", "/industries/", "/industries/manufacturing/", "planned"),
  page("Real estate", "/industries/", "/industries/real-estate/", "planned", "Real estate & property"),
  page("Healthcare", "/industries/", "/industries/healthcare/", "planned", "Healthcare & life sciences"),
  page("Resources & energy", "/industries/", "/industries/resources-and-energy/", "planned", "Resources, energy & utilities"),
  page("Legal & professional", "/industries/", "/industries/legal-and-professional/", "planned", "Legal & professional services"),
];

const SERVICES_HUB = page("Services", "/", "/services/", "planned", "Services",
  "From first use case to a system your team runs.");
const EVALUATION_PARTNER = page("Evaluation Partner", "/services/", "/services/evaluation-partner/", "planned", "Evaluation Partner",
  "An independent evaluation workstream under your existing prime or adviser.");

const RESOURCES_HUB = page("Resources", "/", "/resources/", "planned");
const INSIGHTS = page("Insights", "/", "/insights/", "live", "Insights", "Field notes on shipping AI in regulated work.");
const DEMOS = page("Demos", "/", "/demos/", "planned", "Demos", "Canned replays of each solution. No live model.");
const SAFE_USE_KITS = page("Safe-Use Kits", "/resources/", "/resources/safe-use-kits/", "planned", "Safe-Use Kits",
  "Free starter kits for accounting, legal and property teams.");
const PAY_FOR = page("What you already pay for", "/resources/", "/resources/what-you-already-pay-for/", "planned", "What you already pay for",
  "Check which AI features your software already includes.");
const EVAL_METHOD = page("Evaluation method", "/resources/", "/resources/evaluation-method/", "planned", "Evaluation method",
  "How we test AI, published so you can re-run it.");
const RESOURCES_ITEMS = [INSIGHTS, DEMOS, SAFE_USE_KITS, PAY_FOR, EVAL_METHOD];

const ABOUT = page("About", "/", "/about/", "planned");
const TRUST = page("Trust", "/", "/trust/", "planned");
const LEGAL = page("Legal", "/", "/legal/", "planned");
const CONTACT = page("Contact", "/", "/contact/", "planned");

const PRIVACY = page("Privacy", "/legal/", "/legal/privacy/", "planned", "Privacy policy");
const WEBSITE_TERMS = page("Website terms", "/legal/", "/legal/website-terms/", "planned");
const CONTACT_SENT = page("Sent", "/contact/", "/contact/sent/", "planned", "Message sent");
const DEMO_PAGES = SOLUTIONS.map((s) => page(s.shortName, "/demos/", `/demos/${slugify(s.shortName)}/`, "planned", `${s.fullName} demo`));

export const NAV_GROUPS: NavGroup[] = [
  { id: "solutions", label: "Solutions", hub: SOLUTIONS_HUB, allLabel: "All solutions →", layout: "rows", items: SOLUTIONS, anchors: [] },
  { id: "industries", label: "Industries", hub: INDUSTRIES_HUB, allLabel: "All industries →", layout: "columns", items: INDUSTRIES, anchors: [] },
  {
    id: "services", label: "Services", hub: SERVICES_HUB, allLabel: "How we work →", layout: "rows", items: [EVALUATION_PARTNER],
    anchors: [
      { label: "Prove", href: "/services/#prove" },
      { label: "Build", href: "/services/#build" },
      { label: "Run", href: "/services/#run" },
    ],
  },
  { id: "resources", label: "Resources", hub: RESOURCES_HUB, allLabel: "All resources →", layout: "rows", items: RESOURCES_ITEMS, anchors: [] },
  { id: "about", label: "About", hub: ABOUT, allLabel: "About Techsider →", layout: "rows", items: [TRUST, LEGAL, CONTACT], anchors: [] },
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
