// Preview-only fixture: the rules are in src/fixtures/index.ts.
// The gallery's SiteContext. Solutions and industries are the fixture sets' ids, with visibly
// fictional names; every href points at a gallery page, so a specimen's links stay inside the
// gallery. Page labels and one-liners come from nav.ts, unchanged: they name the site's own
// sections, not a fictional organisation. Two links are deliberately not shown, so the gallery
// exercises the plain-text fallback: the fixture-industry-9 industry and the privacy page.
import {
  CIRCLED, contactQuery, siteContext,
  type IndustryLink, type PageKey, type PageLink, type SiteContext, type SolutionLink,
} from "../lib/site.ts";

const GALLERY = "/preview/templates";
const ORDINAL = ["One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];

const SOLUTION_ONE_LINERS = [
  "Fixture one-liner: fixture documents turned into a register a person can check.",
  "Fixture one-liner: answers from the fixture manuals, with the page each one used.",
  "Fixture one-liner: one fixture back-office job, drafted for a person to approve.",
  "Fixture one-liner: tests of a fixture AI system bought or built elsewhere.",
  "Fixture one-liner: value from the AI already inside fixture software.",
];
const SOLUTION_PAGE: Record<string, string> = {
  "fixture-solution-4": `${GALLERY}/solution-evaluation/`,
  "fixture-solution-5": `${GALLERY}/solution-switch-on/`,
};
const solutions: SolutionLink[] = SOLUTION_ONE_LINERS.map((oneLiner, i) => {
  const id = i === 0 ? "fixture-solution" : `fixture-solution-${i + 1}`;
  const shortName = `Fixture Solution ${ORDINAL[i]}`;
  const path = SOLUTION_PAGE[id] ?? `${GALLERY}/solution/`;
  return { id, number: CIRCLED[i], shortName, fullName: `${shortName} Fixture Suite`, oneLiner, path, href: path };
});

const industries: IndustryLink[] = ORDINAL.map((ordinal, i) => {
  const government = i === 1;
  const id = i === 0 ? "fixture-industry" : government ? "fixture-government" : `fixture-industry-${i + 1}`;
  const shortName = government ? "Fixture Government" : `Fixture Industry ${ordinal}`;
  const path = government ? `${GALLERY}/industry-government/` : `${GALLERY}/industry/`;
  return {
    id, shortName, fullName: `${shortName} Fixture Sector`, footerLabel: `AI for ${shortName.toLowerCase()}`,
    path, href: id === "fixture-industry-9" ? null : path,
  };
});

// Each page key → the template page that renders it. Insights is the live index, built in both builds.
const PAGE_PATH: Record<PageKey, string> = {
  home: `${GALLERY}/home/`,
  solutions: `${GALLERY}/solutions-hub/`,
  industries: `${GALLERY}/industries-hub/`,
  services: `${GALLERY}/services/`,
  evaluationPartner: `${GALLERY}/evaluation-partner/`,
  resources: `${GALLERY}/resources-hub/`,
  insights: "/insights/",
  demos: `${GALLERY}/demos-hub/`,
  safeUseKits: `${GALLERY}/safe-use-kits/`,
  payFor: `${GALLERY}/pay-for/`,
  evaluationMethod: `${GALLERY}/evaluation-method/`,
  about: `${GALLERY}/about/`,
  trust: `${GALLERY}/trust/`,
  legal: `${GALLERY}/legal-hub/`,
  privacy: `${GALLERY}/legal-document/`,
  websiteTerms: `${GALLERY}/legal-document/`,
  contact: `${GALLERY}/contact/`,
  sent: `${GALLERY}/sent/`,
};
const NOT_SHOWN: PageKey[] = ["privacy"];
const nav = siteContext(true);

function page(key: PageKey): PageLink {
  if (!Object.hasOwn(PAGE_PATH, key)) throw new Error(`Unknown page key "${key}"`);
  const path = PAGE_PATH[key];
  const { label, oneLiner } = nav.page(key);
  return { key, label, ...(oneLiner ? { oneLiner } : {}), path, href: NOT_SHOWN.includes(key) ? null : path };
}

export const fixtureSite: SiteContext = {
  solutions,
  industries,
  resources: nav.resources.map((r) => page(r.key)),
  page,
  demo(solutionId) {
    if (!solutions.some((s) => s.id === solutionId)) throw new Error(`demo(): unknown solution "${solutionId}"`);
    return solutionId === "fixture-solution-4" ? `${GALLERY}/demo-report/` : `${GALLERY}/demo/`;
  },
  contact(query) {
    return `${PAGE_PATH.contact}${contactQuery({ solutions, industries }, query)}`;
  },
  email: "fixture@example.com",
};
