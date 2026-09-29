// The lime highlight block marks one whole word of a headline (spec §6.4 signatures). PageHero
// calls splitHighlight() to wrap that word in <span class="hl">. A highlight that is not a single
// whole word of the title throws, so a typo fails the build instead of shipping an unmarked H1.
// Plain TypeScript with no imports, so node tests can import it directly.

export interface HighlightParts {
  before: string;
  word: string;
  after: string;
}

// One word: letters and digits, with inner apostrophes or hyphens ("don't", "on-call").
const ONE_WORD = /^[\p{L}\p{N}](?:[\p{L}\p{N}'’-]*[\p{L}\p{N}])?$/u;
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Splits `title` around the first case-insensitive, whole-word match of `highlight`. The word
 * keeps the title's own casing ("SHIPS" in "AI THAT SHIPS." for highlight "ships").
 * Throws when `highlight` is not one word, or is not a whole word of `title`.
 */
export function splitHighlight(title: string, highlight: string): HighlightParts {
  if (!ONE_WORD.test(highlight)) {
    throw new Error(`PageHero: highlight "${highlight}" must be a single word`);
  }
  const match = new RegExp(`(?<![\\p{L}\\p{N}])${escapeRe(highlight)}(?![\\p{L}\\p{N}])`, "iu").exec(title);
  if (!match) {
    throw new Error(`PageHero: highlight "${highlight}" is not a whole word of the title "${title}"`);
  }
  return {
    before: title.slice(0, match.index),
    word: match[0],
    after: title.slice(match.index + match[0].length),
  };
}
