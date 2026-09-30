// The social cards (spec §6.3, §11.3): one 1200×630 PNG per template kind, each carrying the §6.3
// lock-up, [techsider] with "AI that ships." and "Measured before it ships." directly beneath, so
// the slogan never travels without its proof line. A page's card follows its path: socialKind().
// - `npm run og` (scripts/generate_brand.py --og) draws every card from socialImageSpec(), with the
//   text outlined to glyph paths, rasterizes it with sharp and commits it as public/og/<kind>.png.
//   Each PNG records the SHA-256 of every input it was drawn from (this spec, the generator and the
//   fonts) in a tEXt chunk, and tests/social-images.test.mjs fails when any has changed since.
// - BaseLayout renders SocialImageMeta, which names the page's card in og:image and twitter:image.
// Node-importable: nav.ts and fixed-copy.ts have no imports.
import { SITE } from "../data/nav.ts";
import { HOME_PROMPT } from "./fixed-copy.ts";

/** The template kinds that get their own card (Phase E Task 3). Every other page shares "default". */
export const SOCIAL_KINDS = ["home", "solution", "industry", "service", "insight", "default"] as const;
export type SocialKind = (typeof SOCIAL_KINDS)[number];

/** 1200×630: Facebook asks for at least 1200×630, LinkedIn for at least 1200×627, and both for 1.91:1 (research §3.1). */
export const SOCIAL_IMAGE = { width: 1200, height: 630, type: "image/png" } as const;

/** The slogan's one highlighted word, as the Home hero sets it (spec §3.3, §8.1). */
export const SLOGAN_HIGHLIGHT = "ships";

/** The host line at the foot of every card. */
export const SOCIAL_HOST = "techsider.com.au";

interface Section {
  kind: Exclude<SocialKind, "home" | "default">;
  /** Every page under this path, its hub included, takes the section's card. */
  prefix: string;
  /** The bracket tag above the slogan (spec §6.3's bracket device), and the alt text's section name. */
  tag: string;
}

const SECTIONS: readonly Section[] = [
  { kind: "solution", prefix: "/solutions/", tag: "solutions" },
  { kind: "industry", prefix: "/industries/", tag: "industries" },
  { kind: "service", prefix: "/services/", tag: "services" },
  { kind: "insight", prefix: "/insights/", tag: "insights" },
];

/** The card a page shares: Home's, its section's (hub and children alike), or the default. */
export function socialKind(pathname: string): SocialKind {
  if (pathname === "/") return "home";
  return SECTIONS.find((s) => pathname.startsWith(s.prefix))?.kind ?? "default";
}

export interface SocialImage {
  /** Root-relative: SocialImageMeta resolves it against the site URL. */
  path: string;
  type: typeof SOCIAL_IMAGE.type;
  width: number;
  height: number;
  /** og:image:alt and twitter:image:alt: the card's words, the slogan with its proof line. */
  alt: string;
}

export function socialImage(pathname: string): SocialImage {
  const kind = socialKind(pathname);
  const section = SECTIONS.find((s) => s.kind === kind);
  const who = section ? `${SITE.name} ${section.tag}` : SITE.name;
  return {
    path: `/og/${kind}.png`,
    type: SOCIAL_IMAGE.type,
    width: SOCIAL_IMAGE.width,
    height: SOCIAL_IMAGE.height,
    alt: `${who}: ${SITE.slogan} ${SITE.proofLine}`,
  };
}

export interface SocialCard {
  kind: SocialKind;
  /** The bracket tag above the slogan, or null. */
  tag: string | null;
  /** The Home hero's prompt line above the slogan (spec §8.1), on the Home card only. */
  prompt: { command: string; args: string } | null;
}

export interface SocialImageSpec {
  width: number;
  height: number;
  host: string;
  slogan: string;
  highlight: string;
  proofLine: string;
  cards: SocialCard[];
}

/**
 * Everything the generator draws, as plain JSON: scripts/generate_brand.py --og reads it through
 * node, and the staleness test hashes JSON.stringify() of it, byte for byte as the generator did.
 */
export function socialImageSpec(): SocialImageSpec {
  return {
    width: SOCIAL_IMAGE.width,
    height: SOCIAL_IMAGE.height,
    host: SOCIAL_HOST,
    slogan: SITE.slogan,
    highlight: SLOGAN_HIGHLIGHT,
    proofLine: SITE.proofLine,
    cards: SOCIAL_KINDS.map((kind) => ({
      kind,
      tag: SECTIONS.find((s) => s.kind === kind)?.tag ?? null,
      prompt: kind === "home" ? { command: HOME_PROMPT.command, args: HOME_PROMPT.args } : null,
    })),
  };
}
