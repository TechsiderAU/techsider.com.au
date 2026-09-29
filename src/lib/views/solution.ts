// The solution page's view model (spec §8.3), built from one solution's content, the shared
// services copy and a SiteContext. Every link comes from the site context, so a page that isn't
// shown yet gives a null href (rendered as text) and the contact links fall back to email.
// Pure TypeScript: no astro:content, so Node tests import it directly.
import type { z } from "astro/zod";
import type { makeSolutionSchema } from "../../content/schemas.ts";
import { DELIVERY_LETTER } from "../fixed-copy.ts";
import { crumbs, industryLink, refId, solutionLink } from "../site.ts";
import type { Link, SiteContext } from "../site.ts";
import { packageViews } from "./offer.ts";
import type { ListedPackageView, PackageView, SharedOfferCopy } from "./offer.ts";

type SolutionData = z.infer<ReturnType<typeof makeSolutionSchema>>;

export interface SolutionView {
  id: string;
  number: string;
  shortName: string;
  fullName: string;
  oneLiner: string;
  /** crumbs(site, ["solutions", { label: shortName, path }]) */
  breadcrumb: Link[];
  /** `Talk to us about ${shortName}` → site.contact({ interest: id }); "Try the demo" → site.demo(id), or no secondary. */
  ctas: { primary: Link; secondary: Link | null };
  job: string;
  artefact: string;
  needProfiles: { title: string; body: string }[];
  /** "Where it's used" (spec §7.4): industry short name → industry page. */
  byIndustry: { label: string; href: string | null }[];
  packagesHeading: "Packages" | "Engagements";
  generic: PackageView;
  launch: PackageView[];
  onRequest: ListedPackageView[];
  standardInclusions: string[];
  program: { title: string; summary: string; duration: string; bullets: string[] } | null;
  /** methodHref: site.page("evaluationMethod").href */
  howWeTest: { summary: string; bullets: string[]; methodHref: string | null };
  whereItRuns: { choices: { id: string; letter: "a" | "b" | "c"; title: string; body: string }[]; note: string; onshoreNote: string[] };
  /** shared.independence when the solution publishes the §4.4 policy (④), else null. */
  independence: string[] | null;
  platformFirst: string | null;
  dontDo: string[];
  faq: { q: string; a: string }[];
  closing: { command: "talk_to_us"; args: string; label: string; href: string };
}

/** The template's section ids. A package id that matches one would give the page two elements with that id. */
const SECTION_IDS = ["job", "who", "packages", "program", "testing", "where-it-runs", "independence", "limits", "faq", "contact"];

export function solutionView(input: { id: string; data: SolutionData; shared: SharedOfferCopy; site: SiteContext }): SolutionView {
  const { id, data, shared, site } = input;
  const link = solutionLink(site, id);
  const { generic, launch, onRequest } = packageViews(id, data, site);
  for (const p of [generic, ...launch]) {
    if (SECTION_IDS.includes(p.id)) throw new Error(`solution "${id}": package id "${p.id}" is also a section id on the page`);
  }

  const choices = [...new Set(data.whereItRuns.choices)]
    .sort((a, b) => DELIVERY_LETTER[a].localeCompare(DELIVERY_LETTER[b]))
    .map((choice) => {
      const copy = shared.deliveryChoices.find((c) => c.id === choice);
      if (!copy) throw new Error(`solution "${id}": no delivery-choice copy for "${choice}"`);
      return { id: choice, letter: DELIVERY_LETTER[choice], title: copy.title, body: copy.body };
    });

  const talk = { label: `Talk to us about ${link.shortName}`, href: site.contact({ interest: id }) };
  const demo = site.demo(id);

  return {
    id,
    number: link.number,
    shortName: link.shortName,
    fullName: link.fullName,
    oneLiner: link.oneLiner,
    breadcrumb: crumbs(site, ["solutions", { label: link.shortName, path: link.path }]),
    ctas: { primary: talk, secondary: demo ? { label: "Try the demo", href: demo } : null },
    job: data.job,
    artefact: data.artefact,
    needProfiles: data.needProfiles.map(({ title, body }) => ({ title, body })),
    byIndustry: data.byIndustry.map((ref) => {
      const industry = industryLink(site, refId(ref));
      return { label: industry.shortName, href: industry.href };
    }),
    packagesHeading: data.packagesHeading,
    generic,
    launch,
    onRequest,
    standardInclusions: [...shared.standardInclusions],
    program: data.program
      ? { title: data.program.title, summary: data.program.summary, duration: data.program.duration, bullets: [...data.program.bullets] }
      : null,
    howWeTest: { summary: data.howWeTest.summary, bullets: [...data.howWeTest.bullets], methodHref: site.page("evaluationMethod").href },
    whereItRuns: { choices, note: data.whereItRuns.note, onshoreNote: [...shared.onshoreNote] },
    independence: data.independencePolicy ? [...shared.independence] : null,
    platformFirst: data.platformFirst ?? null,
    dontDo: [...data.dontDo],
    faq: data.faq.map(({ q, a }) => ({ q, a })),
    closing: { command: "talk_to_us", args: `--about=${id}`, label: talk.label, href: talk.href },
  };
}
