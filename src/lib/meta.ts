// Page <title> and meta description rules (spec §11.3; go-global §3.4). Titles: a search title where
// one is set (SEARCH_TITLES), else `{fullName} | Techsider`, or `AI for {Short Name} | Techsider` on
// industry pages, unique, 60 characters or fewer, and naming no country: the headquarters shows in
// the footer and the structured data, and Google already reads the .com.au domain as Australian.
// Descriptions: unique and 150–160 characters, written in nav.ts beside the page's names.
// tests/meta.test.mjs holds every nav.ts page to these rules, and requires a description of every
// live page. Node-importable: nav.ts has no imports.
import { SITE, type PageEntry } from "../data/nav.ts";

/** Spec §11.3: a meta description is 150–160 characters. */
export const DESCRIPTION_LENGTH = { min: 150, max: 160 } as const;

/** Title Case for a short name in a <title>: "Financial services" → "Financial Services". */
function titleCase(name: string): string {
  return name.replace(/(^|\s)([a-z])/g, (_, gap: string, letter: string) => gap + letter.toUpperCase());
}

/**
 * Titles in the words people search with, for pages whose nav name alone ("Services", "About")
 * says nothing to a search result's reader. Each is unique and, with " | Techsider", 60 characters
 * or fewer (tests/meta.test.mjs). The About and Contact titles name Techsider themselves.
 */
const SEARCH_TITLES: Record<string, string> = {
  "/solutions/": "AI Solutions for Organisations | Techsider",
  "/solutions/document-registers/": "Intelligent Document Processing | Techsider",
  "/solutions/draft-for-approval/": "AI Workflow Automation | Techsider",
  "/solutions/knowledge-assistant/": "Internal AI Knowledge Assistant (RAG) | Techsider",
  "/solutions/ai-evaluation/": "Independent AI and LLM Evaluation | Techsider",
  "/solutions/ai-switch-on/": "Copilot & AI Implementation Consulting | Techsider",
  "/industries/": "AI Solutions by Industry | Techsider",
  "/industries/accounting/": "AI Automation for Accounting Firms | Techsider",
  "/industries/legal-and-professional/": "AI for Law Firms and Professional Services | Techsider",
  "/industries/government/": "AI Evaluation for Government Agencies | Techsider",
  "/industries/financial-services/": "AI Validation for Regulated Financial Firms | Techsider",
  "/industries/healthcare/": "AI Scribe Evaluation for Healthcare | Techsider",
  "/services/": "AI Consulting Services | Techsider",
  "/services/evaluation-partner/": "AI Evaluation Partner for Primes and Advisers | Techsider",
  "/resources/": "AI Resources, Demos and Tools | Techsider",
  "/insights/": "AI Guides and Field Notes | Techsider",
  "/demos/": "AI Automation Demos and Sample Report | Techsider",
  "/resources/what-you-already-pay-for/": "What AI Features Does Your Software Include? | Techsider",
  "/resources/evaluation-method/": "How to Evaluate an AI System: Our Method | Techsider",
  "/about/": "About Techsider | AI Automation Company, Sydney",
  "/contact/": "Contact Techsider | AI Automation Enquiries",
};

export function pageTitle(entry: PageEntry): string {
  if (SEARCH_TITLES[entry.path]) return SEARCH_TITLES[entry.path];
  if (entry.path === "/") return `AI Automation Solutions | ${SITE.name}`;
  if (entry.base === "/industries/") return `AI for ${titleCase(entry.shortName)} | ${SITE.name}`;
  return `${entry.fullName} | ${SITE.name}`;
}

/**
 * The page's meta description, for BaseLayout's required `description`. A page without one, or
 * with one outside 150–160 characters, fails the build: every route passes this, so no page falls
 * back to shared copy.
 */
export function pageDescription(entry: PageEntry): string {
  const { description, path } = entry;
  if (description === undefined) {
    throw new Error(`nav.ts: ${path} has no description. Every page needs a unique meta description of ${DESCRIPTION_LENGTH.min}–${DESCRIPTION_LENGTH.max} characters (spec §11.3).`);
  }
  if (description !== description.trim()) throw new Error(`nav.ts: ${path}'s description has leading or trailing space.`);
  const n = description.length;
  if (n < DESCRIPTION_LENGTH.min || n > DESCRIPTION_LENGTH.max) {
    throw new Error(`nav.ts: ${path}'s description is ${n} characters; spec §11.3 needs ${DESCRIPTION_LENGTH.min}–${DESCRIPTION_LENGTH.max}.`);
  }
  return description;
}
