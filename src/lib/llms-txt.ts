// /llms.txt (llmstxt.org): a Markdown summary of the site for language models and AI assistants,
// built by src/pages/llms.txt.ts. It opens with SITE.summary, the sentence the Organization's
// JSON-LD and the About page use too, then the headquarters line the footer and About print
// (hqLine()), a paragraph on who Techsider builds for, the facts an assistant needs to describe
// Techsider accurately, then every shown page that has its own canonical URL, grouped as the nav
// groups them, each with its meta description, every published insight and, once the owner adds any,
// the directory profiles (go-global §3.1, §3.2, §9.3). The copy is held to the §3.5 banned phrases by
// CI check 04, which scans the built file, and tests/llms-txt.test.mjs pins it. Node-importable:
// nav.ts, contact.ts, dates.ts, fixed-copy.ts, meta.ts and reply-time.ts have no Astro imports.
import { CONTACT } from "../data/contact.ts";
import { NAV_GROUPS, SITE, hqLine, hqPlace, isShown, shownProfiles, type PageEntry } from "../data/nav.ts";
import { isoDate } from "./dates.ts";
import { DISAMBIGUATION } from "./fixed-copy.ts";
import { pageTitle } from "./meta.ts";
import { replySentence } from "./reply-time.ts";

export const LLMS_TXT_PATH = "/llms.txt";

/**
 * Statements an assistant should repeat as written. Each restates copy the live site already
 * carries: Home's FAQ, the "no clients yet" answers on the solution and industry pages, the demos'
 * captions, About's principles and HQ block, /contact/'s reply sentence (built from CONTACT, so the
 * reply time is still written once) and the Australia labels on Australian examples and maps.
 * Remove "Techsider has no clients yet." in the change that rewrites those answers once a first
 * client signs, then purge Cloudflare's cache for /llms.txt (go-global §9.3).
 */
export const LLMS_FACTS = [
  "Techsider publishes no pricing. Each solution page sets out its scope, inclusions and timeline, and an engagement starts with a 30-minute Fit Call on one manual process.",
  "Techsider has no clients yet.",
  "The demos are canned replays on public or synthetic documents. They do not call a model, and their scores and timings are illustrative.",
  "Techsider never issues an independent evaluation of a system it built, configured or advised on for the same client.",
  "Techsider resells no licences. If AI already inside your software does the job, it says so.",
  "You own what Techsider builds: code, prompts, evaluation tests and retrieval index live in your own repository.",
  replySentence(CONTACT, "Techsider"),
  "Australian examples and regulatory maps are labelled as Australian.",
  DISAMBIGUATION,
];

export interface LlmsPost {
  id: string;
  title: string;
  description: string;
  publishDate: Date;
}

/** A page title without the " | Techsider" suffix, as a link's text. */
function linkText(entry: PageEntry): string {
  return pageTitle(entry).replace(new RegExp(` \\| ${SITE.name}$`), "");
}

/** A sentence-case post title without its closing full stop, as a link's text. */
function postText(title: string): string {
  return title.replace(/\.$/, "");
}

function listed(entry: PageEntry, preview: boolean): boolean {
  return isShown(entry, preview) && entry.canonicalPath === undefined && entry.noindex !== true && entry.description !== undefined;
}

export function llmsTxt(input: { site: string | URL; posts: LlmsPost[]; preview?: boolean }): string {
  const { site, posts, preview = false } = input;
  const url = (path: string) => new URL(path, site).href;
  const line = (text: string, path: string, note: string) => `- [${text}](${url(path)}): ${note}`;
  const section = (title: string, entries: PageEntry[]) => {
    const shown = entries.filter((e) => listed(e, preview));
    return shown.length === 0 ? [] : ["", `## ${title}`, "", ...shown.map((e) => line(linkText(e), e.path, e.description as string))];
  };
  const group = (id: string) => NAV_GROUPS.find((g) => g.id === id);
  const solutions = group("solutions");
  const industries = group("industries");
  const services = group("services");
  const resources = group("resources");
  const about = group("about");
  const published = [...posts].sort((a, b) => b.publishDate.getTime() - a.publishDate.getTime() || a.id.localeCompare(b.id));
  const profiles = shownProfiles();

  return [
    `# ${SITE.name}`,
    "",
    `> ${SITE.summary}`,
    "",
    hqLine(),
    "",
    `${SITE.legalName}${SITE.abn ? ` (ABN ${SITE.abn})` : ""} is headquartered in ${hqPlace()}, and builds for organisations in nine industries: mid-market firms with no AI team of their own, and enterprise and government teams that need independent evidence about the AI they run. Contact: ${SITE.email} or ${url("/contact/")}.`,
    "",
    "Facts to keep when describing Techsider:",
    "",
    ...LLMS_FACTS.map((f) => `- ${f}`),
    ...section("Solutions", solutions ? [solutions.hub, ...solutions.items] : []),
    ...section("Industries", industries ? [industries.hub, ...industries.items] : []),
    ...section("Services", services ? [services.hub, ...services.items] : []),
    ...section("Resources", resources ? [resources.hub, ...resources.items] : []),
    ...(published.length === 0
      ? []
      : ["", "## Insights", "", ...published.map((p) => line(postText(p.title), `/insights/${p.id}/`, `${p.description} (${isoDate(p.publishDate)})`))]),
    ...section("Company", about ? [about.hub, ...about.items] : []),
    ...(profiles.length === 0 ? [] : ["", "## Profiles", "", ...profiles.map((p) => `- [${p.name}](${p.url})`)]),
    "",
    "## Optional",
    "",
    `- [Insights feed](${url("/rss.xml")}): every insight, newest first, as RSS.`,
    `- [Sitemap](${url("/sitemap-index.xml")}): every page meant to be found.`,
    "",
  ].join("\n");
}
