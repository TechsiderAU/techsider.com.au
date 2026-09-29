// The Home page view (spec §8.1). A pure view builder (Phase B2 scope ruling 3): it never
// imports astro:content, so node tests run it on the fixtures, and the Phase C route
// (src/pages/index.astro) passes it the typed page data, its collection entries and the build
// time. Every href comes from the SiteContext: a page that isn't shown gives null, and the
// template renders it as plain text or leaves the link out.
import type { z } from "astro/zod";
import type { TraceData, makeIndustrySchema, makeSolutionSchema } from "../../content/schemas.ts";
import type { HomeData, PositioningData, ServicesData } from "../../content/page-schemas.ts";
import { CTAS, SITE } from "../../data/nav.ts";
import { DELIVERY_LETTER, HOME_CLOSING, HOME_PROMPT } from "../fixed-copy.ts";
import type { Link, SiteContext } from "../site.ts";
import { latestInsights, type InsightCardView } from "./insights.ts";

type SolutionData = z.infer<ReturnType<typeof makeSolutionSchema>>;
type IndustryData = z.infer<ReturnType<typeof makeIndustrySchema>>;

export interface HomeView {
  hero: {
    prompt: typeof HOME_PROMPT;
    /** SITE.slogan, "AI that ships.": display caps come from CSS, so the H1's text stays sentence case. */
    slogan: string;
    highlight: "ships";
    /** SITE.proofLine: the slogan never appears without it (spec §6.3). */
    proofLine: string;
    subPromise: string;
    /** Talk to us → the contact page, or mailto while it isn't shown; See a demo → the Demos hub, or the #demo band. */
    ctas: { primary: Link; secondary: Link };
    trace: TraceData;
  };
  /** All 9 industries, in spec §5 order. */
  industrySwitcher: { label: string; href: string | null }[];
  /** All 5 solutions, ①–⑤ in spec §4.1 order. */
  solutions: { number: string; shortName: string; oneLiner: string; forLine: string; href: string | null }[];
  demo: { allHref: string | null };
  routes: ServicesData["routes"] & { evaluationPartnerHref: string | null };
  pillars: PositioningData["pillars"];
  /** Always (a), (b), (c) in that order, whatever order the data lists them in. */
  whereItRuns: { choices: { letter: "a" | "b" | "c"; title: string; body: string }[]; onshoreNote: string[] };
  industries: { shortName: string; hook: string; href: string | null }[];
  /** "cards" while the newest post is at most 45 days old at `now` (the newest 3); otherwise "link" and no cards. */
  insights: { mode: "cards" | "link"; cards: InsightCardView[]; allHref: string | null };
  faq: { q: string; a: string }[];
  closing: { command: "talk_to_us"; args: "--about=<industry>"; label: "Talk to us"; href: string };
}

function dataFor<T>(records: Record<string, T>, id: string, kind: string): T {
  const data = records[id];
  if (data === undefined) throw new Error(`homeView: no ${kind} data for "${id}"`);
  return data;
}

/**
 * Builds the Home view. `now` is the build time: the latest-insights rule (spec §8.1 block 9) is
 * decided when the page is built, which is why deploy.yml rebuilds weekly. Throws when the hero
 * trace, or the data of a solution or industry the site lists, is missing.
 */
export function homeView(input: {
  positioning: PositioningData;
  services: ServicesData;
  home: HomeData;
  solutions: Record<string, SolutionData>;
  industries: Record<string, IndustryData>;
  traces: Record<string, TraceData>;
  insights: InsightCardView[];
  now: Date;
  site: SiteContext;
}): HomeView {
  const { positioning, services, home, solutions, industries, traces, insights, now, site } = input;
  const trace = traces[home.heroTrace];
  if (trace === undefined) throw new Error(`homeView: no trace "${home.heroTrace}" for the hero (homeData.heroTrace)`);
  const cards = latestInsights(insights, now);

  return {
    hero: {
      prompt: HOME_PROMPT,
      slogan: SITE.slogan,
      highlight: "ships",
      proofLine: SITE.proofLine,
      subPromise: positioning.subPromise,
      ctas: {
        primary: { label: CTAS.talk.label, href: site.contact() },
        secondary: { label: CTAS.demo.label, href: site.page("demos").href ?? "#demo" },
      },
      trace,
    },
    industrySwitcher: site.industries.map((i) => ({ label: i.shortName, href: i.href })),
    solutions: site.solutions.map((s) => ({
      number: s.number,
      shortName: s.shortName,
      oneLiner: s.oneLiner,
      forLine: dataFor(solutions, s.id, "solution").forLine,
      href: s.href,
    })),
    demo: { allHref: site.page("demos").href },
    routes: { ...services.routes, evaluationPartnerHref: site.page("evaluationPartner").href },
    pillars: positioning.pillars,
    whereItRuns: {
      choices: services.deliveryChoices
        .map((c) => ({ letter: DELIVERY_LETTER[c.id], title: c.title, body: c.body }))
        .sort((a, b) => a.letter.localeCompare(b.letter)),
      onshoreNote: services.onshoreNote,
    },
    industries: site.industries.map((i) => ({
      shortName: i.shortName,
      hook: dataFor(industries, i.id, "industry").constraintHook,
      href: i.href,
    })),
    insights: { mode: cards.length > 0 ? "cards" : "link", cards, allHref: site.page("insights").href },
    faq: home.faq,
    closing: { command: HOME_CLOSING.command, args: HOME_CLOSING.args, label: "Talk to us", href: site.contact() },
  };
}
