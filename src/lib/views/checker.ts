// The "What you already pay for" checker's view (spec §8.7; the ⑤ demo, §8.8). A pure view builder:
// the route parses src/data/platform-ai.json with platformAiFile and passes it here with the build's
// SiteContext, and node tests run it on the real file. It groups the entries by vendor and then by
// product, in the file's order, for PlatformChecker (one checkbox per vendor, whose results list every
// product and feature under it) and for PlatformFacts (the no-JS table, one per vendor).
// The vendor is what a visitor ticks because it is what they know they pay. A product name in the file
// is the research's name for a feature family, not something bought on its own: a vendor's included
// chat and its add-on can sit under near-identical names, so a checkbox per product name would show a
// visitor part of what their plan includes, or an add-on where the plan includes the feature.
// A processing location is platform-ai.json's attributed statement of what the vendor publishes
// ("Microsoft says …"), and the page never rewrites or summarises it: one that starts with
// "Not published" shows as exactly that, and any other shows verbatim, so the page never states a
// location a vendor didn't publish (Phase D Review Focus 4).
import type { PlatformAiEntry, PlatformAiFile } from "../../content/schemas.ts";
import { slugify } from "../../data/nav.ts";
import type { SiteContext } from "../site.ts";

// Task 1's types, re-exported so a page that renders the checker imports everything from here.
export type { PlatformAiEntry, PlatformAiFile };
/** The platform-ai categories that have a Safe-Use Kit (spec §8.7); "general" has none. */
export type KitCategory = "accounting" | "legal" | "property";

/** What a processing location starts with when the vendor pages checked don't say where its AI runs for Australian customers (platform-ai.md). */
export const NOT_PUBLISHED = "Not published";
/** Each kit's title, as src/content/kits/<category>.yaml has it, in the order /resources/safe-use-kits/ lists them. */
export const KIT_TITLES: Record<KitCategory, string> = {
  accounting: "Accounting Safe-Use Kit",
  legal: "Legal Safe-Use Kit",
  property: "Property Safe-Use Kit",
};
const KIT_CATEGORIES = Object.keys(KIT_TITLES) as KitCategory[];

export interface DateLabel {
  /** "2026-09-29", for <time datetime>. */
  iso: string;
  /** "29 September 2026". */
  text: string;
}

export interface Processing {
  status: "not-published" | "stated";
  /** "Not published", or platform-ai.json's statement, verbatim. */
  text: string;
}

export interface CheckerFeature {
  text: string;
  included: PlatformAiEntry["included"];
  /** "Included" or "Add-on": the tag the results show. */
  inclusion: string;
  plans: string[];
  /** The vendor page that lists the feature and its plans; `host` is its link text. */
  source: { href: string; host: string };
  checked: DateLabel;
}

/** One product name under a vendor: a heading inside the vendor's results, never a checkbox of its own. */
export interface CheckerProduct {
  /** The product as platform-ai.json names it (the current names, after platform-ai.md's renames). */
  name: string;
  features: CheckerFeature[];
  /** Its entries' processing locations, each distinct one once, in order. */
  processing: Processing[];
}

/** One no-JS table row: a DataTable row, keyed by PlatformFacts' columns. */
export type FactRow = {
  product: string;
  feature: string;
  inclusion: string;
  plans: string;
  processed: string;
  source: { text: string; href: string };
  checked: string;
};

/** One vendor: one checkbox, one results group and one no-JS table. */
export interface VendorGroup {
  /** The checkbox value and the results' data-vendor: slugify(vendor), unique. */
  id: string;
  vendor: string;
  /** The kit categories of its entries, in first-seen order; empty for a general vendor. */
  categories: KitCategory[];
  /** Its product names in first-seen order, each with its features and processing locations. */
  products: CheckerProduct[];
  rows: FactRow[];
}

export interface BuildLink {
  number: string;
  name: string;
  oneLiner: string;
  /** null while the solution page isn't shown: the checker prints the name as text. */
  href: string | null;
}

export interface KitLink {
  category: KitCategory;
  title: string;
  /** Its entry on the Safe-Use Kits page: /resources/safe-use-kits/#kit-<category>. */
  href: string;
}

export interface CheckerView {
  /** The file's as-at date: "Vendor facts as at {text}". */
  asAt: DateLabel;
  vendors: VendorGroup[];
  /** ①, ② and ③: what's left for a build once the platform's own AI is in use. */
  builds: BuildLink[];
  /** One per kit category a vendor has, while /resources/safe-use-kits/ is shown; else none. */
  kits: KitLink[];
}

// Content dates are UTC midnights ("2026-09-29"), so they print in UTC: "29 September 2026".
function dateLabel(d: Date): DateLabel {
  return {
    iso: d.toISOString().slice(0, 10),
    text: d.toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }),
  };
}

/** "Not published" for a location that starts with it; otherwise platform-ai.json's statement, word for word. */
export function processing(location: string): Processing {
  return location.startsWith(NOT_PUBLISHED)
    ? { status: "not-published", text: NOT_PUBLISHED }
    : { status: "stated", text: location };
}

const isKitCategory = (c: PlatformAiEntry["category"]): c is KitCategory => c !== "general";

export function checkerView(file: PlatformAiFile, site: SiteContext): CheckerView {
  const vendors: VendorGroup[] = [];
  for (const e of file.entries) {
    let group = vendors.find((g) => g.vendor === e.vendor);
    if (group === undefined) {
      const id = slugify(e.vendor);
      const twin = vendors.find((g) => g.id === id);
      if (twin !== undefined) {
        throw new Error(`platform-ai.json: the vendors "${twin.vendor}" and "${e.vendor}" share the id "${id}"; name each vendor once`);
      }
      group = { id, vendor: e.vendor, categories: [], products: [], rows: [] };
      vendors.push(group);
    }
    let product = group.products.find((p) => p.name === e.product);
    if (product === undefined) {
      product = { name: e.product, features: [], processing: [] };
      group.products.push(product);
    }
    if (isKitCategory(e.category) && !group.categories.includes(e.category)) group.categories.push(e.category);
    const where = processing(e.processingLocation);
    if (!product.processing.some((p) => p.text === where.text)) product.processing.push(where);
    const url = new URL(e.source);
    const host = url.hostname.replace(/^www\./, "");
    const inclusion = e.included === "included" ? "Included" : "Add-on";
    const checked = dateLabel(e.asAt);
    product.features.push({ text: e.feature, included: e.included, inclusion, plans: e.plans, source: { href: e.source, host }, checked });
    group.rows.push({
      product: e.product,
      feature: e.feature,
      inclusion,
      plans: e.plans.join(", "),
      processed: e.processingLocation,
      source: { text: host, href: e.source },
      checked: checked.text,
    });
  }

  const kitsPage = site.page("safeUseKits").href;
  const served = KIT_CATEGORIES.filter((c) => vendors.some((g) => g.categories.includes(c)));
  return {
    asAt: dateLabel(file.asAt),
    vendors,
    builds: site.solutions.slice(0, 3).map((s) => ({ number: s.number, name: s.shortName, oneLiner: s.oneLiner, href: s.href })),
    kits: kitsPage === null ? [] : served.map((category) => ({ category, title: KIT_TITLES[category], href: `${kitsPage}#kit-${category}` })),
  };
}
