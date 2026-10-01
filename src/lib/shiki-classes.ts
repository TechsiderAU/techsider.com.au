// Syntax highlighting with classes, not inline styles (Phase B2 carry-over WB-8). Astro's Shiki
// writes a style attribute on every code block (the theme's surface and colour, and overflow-x) and
// on every token (its colour). An inline style beats Prose's rules, so the page showed github-dark's
// surface and colour pairs that spec §6.1 doesn't list (its comment colour is about 3:1), and a
// Content-Security-Policy would need 'unsafe-inline' for styles.
// astro.config.mjs sets Shiki's css-variables theme, whose colours are all var(--astro-code-<name>),
// and adds this transformer. Once every other hook has run, it turns each token's colour into the
// class "tok-<name>" (the default foreground needs none), its font style into tok-italic, tok-bold
// or tok-underline, and drops every other inline style, the <pre>'s included. The <pre> keeps Shiki's
// tabindex="0", so a code block that scrolls sideways can be scrolled from the keyboard. Prose.astro
// colours the classes with spec §6.1 tokens.
// Anything else in a style attribute throws: a changed theme fails the build instead of shipping a
// colour Prose doesn't style. Plain TypeScript with a type-only import, so astro.config.mjs and node
// tests import it directly.
import type { ShikiTransformer } from "shiki";

/** Shiki's css-variables colours, as Astro prefixes them. */
const TOKEN_COLOUR = /^var\(--astro-code-(?:token-)?([a-z-]+)\)$/;
const FONT_STYLE: Record<string, string> = {
  "font-style:italic": "tok-italic",
  "font-weight:bold": "tok-bold",
  "text-decoration:underline": "tok-underline",
};
/** Declarations Shiki or Astro add for layout, which Prose's own rules replace. */
const LAYOUT = new Set(["overflow-x", "white-space", "word-wrap", "user-select"]);

interface HastNode {
  type: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
}

/** The classes one style attribute becomes: "color:var(--astro-code-token-keyword)" → ["tok-keyword"]. */
export function tokenClasses(style: string): string[] {
  const classes: string[] = [];
  for (const declaration of style.split(";")) {
    const [rawName, ...rest] = declaration.split(":");
    const name = rawName.trim().toLowerCase();
    const value = rest.join(":").trim();
    if (name === "") continue;
    if (name === "color" || name === "background-color") {
      const colour = TOKEN_COLOUR.exec(value);
      if (colour === null) throw new Error(`shikiClasses: "${declaration.trim()}" is not a css-variables colour; astro.config.mjs must use Shiki's "css-variables" theme`);
      if (name === "color" && colour[1] !== "foreground") classes.push(`tok-${colour[1]}`);
      continue;
    }
    const font = FONT_STYLE[`${name}:${value.toLowerCase()}`];
    if (font) classes.push(font);
    else if (!LAYOUT.has(name)) throw new Error(`shikiClasses: unexpected style "${declaration.trim()}" on a code token`);
  }
  return classes;
}

function classList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  return typeof value === "string" ? value.split(/\s+/).filter(Boolean) : [];
}

function restyle(node: HastNode): void {
  if (node.type === "element" && node.properties) {
    const style = node.properties.style;
    if (typeof style === "string") {
      const added = tokenClasses(style);
      delete node.properties.style;
      if (added.length > 0) node.properties.class = [...classList(node.properties.class), ...added].join(" ");
    }
  }
  for (const child of node.children ?? []) restyle(child);
}

/** The Shiki transformer astro.config.mjs passes as markdown.shikiConfig.transformers. */
export function shikiClasses(): ShikiTransformer {
  return {
    name: "techsider:shiki-classes",
    root(root) {
      restyle(root as unknown as HastNode);
    },
  };
}
