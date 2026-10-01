// The social cards (spec §6.3, §11.3; Phase E Task 3): one committed 1200×630 PNG per template
// kind under public/og/, each carrying the §6.3 lock-up, and every built page naming its kind's
// card in og:image and twitter:image. `npm run og` (scripts/generate_brand.py --og) draws the cards
// from socialImageSpec(). Each PNG records, in a "techsider-og" tEXt chunk, the SHA-256 of every
// input it was drawn from, and the staleness test recomputes them. It compares inputs, not PNG
// bytes: another sharp or libvips version may encode the same card differently.
// The build tests read dist/ and dist-preview/: run `npm run build && npm run build:preview` first.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { htmlFiles, readText, relPath, startTags } from "../scripts/ci/lib.mjs";
import { PAGES, SITE } from "../src/data/nav.ts";
import { HOME_PROMPT } from "../src/lib/fixed-copy.ts";
import { SLOGAN_HIGHLIGHT, SOCIAL_IMAGE, SOCIAL_KINDS, socialImage, socialImageSpec, socialKind } from "../src/lib/social-image.ts";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const OG_DIR = join(ROOT, "public/og");
const BUILDS = {
  dist: fileURLToPath(new URL("../dist/", import.meta.url)),
  "dist-preview": fileURLToPath(new URL("../dist-preview/", import.meta.url)),
};
const LOCKUP = `${SITE.slogan} ${SITE.proofLine}`;
/** Every input the generator hashes into a card: the spec, the generator itself and the two fonts it outlines. */
const INPUTS = [
  "spec",
  "scripts/generate_brand.py",
  "node_modules/@fontsource-variable/archivo/files/archivo-latin-wdth-normal.woff2",
  "node_modules/@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2",
];
const sha256 = (data) => createHash("sha256").update(data).digest("hex");

/** A PNG's width, height and tEXt entries (keyword → text), read chunk by chunk. */
function readPng(buf) {
  assert.equal(buf.toString("latin1", 0, 8), "\x89PNG\r\n\x1a\n", "not a PNG");
  const text = {};
  for (let at = 8; at < buf.length; ) {
    const length = buf.readUInt32BE(at);
    const type = buf.toString("latin1", at + 4, at + 8);
    if (type === "tEXt") {
      const data = buf.subarray(at + 8, at + 8 + length);
      const nul = data.indexOf(0);
      text[data.toString("latin1", 0, nul)] = data.toString("latin1", nul + 1);
    }
    if (type === "IEND") break;
    at += 12 + length;
  }
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20), text };
}

/** The path a built file serves: index.html is "/", x/index.html "/x/", 404.html "/404". */
function pathOf(rel) {
  if (rel === "index.html") return "/";
  if (rel.endsWith("/index.html")) return `/${rel.slice(0, -"index.html".length)}`;
  return `/${rel.replace(/\.html$/, "")}`;
}

/** The content of `<meta {attr}="{value}" content="…">`, decoded; undefined when the page has none. */
function metaContent(html, attr, value) {
  const matches = startTags(html).filter((tag) => tag.name === "meta" && tag.attrs[attr] === value);
  assert.equal(matches.length, 1, `exactly one ${value}, found ${matches.length}`);
  return matches[0].attrs.content;
}

test("socialKind(): Home has its own card, each section's hub and pages share theirs, and every other page the default", () => {
  const cases = {
    "/": "home",
    "/solutions/": "solution",
    "/solutions/document-registers/": "solution",
    "/industries/": "industry",
    "/industries/government/": "industry",
    "/services/": "service",
    "/services/evaluation-partner/": "service",
    "/insights/": "insight",
    "/insights/a-post/": "insight",
    "/about/": "default",
    "/contact/": "default",
    "/demos/ai-switch-on/": "default",
    "/resources/what-you-already-pay-for/": "default",
    "/404": "default",
    "/preview/home/": "default",
  };
  for (const [path, kind] of Object.entries(cases)) assert.equal(socialKind(path), kind, path);
});

test("socialImage(): the kind's PNG, its type and 1200×630 size, and alt text that keeps the slogan with its proof line", () => {
  assert.deepEqual(SOCIAL_IMAGE, { width: 1200, height: 630, type: "image/png" });
  assert.deepEqual(socialImage("/"), { path: "/og/home.png", type: "image/png", width: 1200, height: 630, alt: `Techsider: ${LOCKUP}` });
  assert.deepEqual(socialImage("/industries/government/"), {
    path: "/og/industry.png", type: "image/png", width: 1200, height: 630, alt: `Techsider industries: ${LOCKUP}`,
  });
  assert.equal(socialImage("/about/").alt, `Techsider: ${LOCKUP}`);
  for (const [path, name] of [["/solutions/", "solutions"], ["/services/", "services"], ["/insights/", "insights"]]) {
    assert.equal(socialImage(path).alt, `Techsider ${name}: ${LOCKUP}`, path);
  }
});

test("socialImageSpec(): every card carries the §6.3 lock-up from SITE, sections their bracket tag, and Home its hero's prompt line", () => {
  const spec = socialImageSpec();
  assert.equal(spec.slogan, SITE.slogan);
  assert.equal(spec.proofLine, SITE.proofLine, "spec §6.3: the slogan never appears without the proof line");
  assert.match(spec.slogan, new RegExp(`\\b${spec.highlight}\\b`), "the highlight is a whole word of the slogan");
  assert.equal(spec.highlight, SLOGAN_HIGHLIGHT);
  assert.deepEqual([spec.width, spec.height], [SOCIAL_IMAGE.width, SOCIAL_IMAGE.height]);
  assert.equal(spec.host, "techsider.com.au");
  assert.deepEqual(spec.cards.map((c) => c.kind), [...SOCIAL_KINDS]);
  assert.deepEqual(Object.fromEntries(spec.cards.map((c) => [c.kind, c.tag])), {
    home: null, solution: "solutions", industry: "industries", service: "services", insight: "insights", default: null,
  });
  assert.deepEqual(Object.fromEntries(spec.cards.map((c) => [c.kind, c.prompt])), {
    home: { command: HOME_PROMPT.command, args: HOME_PROMPT.args }, solution: null, industry: null, service: null, insight: null, default: null,
  });
});

test("dist: the homepage leads with automation while social cards retain the brand slogan", () => {
  const html=readText(join(BUILDS.dist,"index.html"));
  assert.match(html, /<h1[^>]*>AI automation\. Built for your business\.<\/h1>/);
  assert.equal(SLOGAN_HIGHLIGHT,"ships");
});

test("public/og/ holds one 1200×630 PNG per kind and nothing else, each under LinkedIn's 5 MB limit", () => {
  // Dotfiles aside: macOS Finder leaves a .DS_Store (git-ignored) in any folder it opens.
  const files = readdirSync(OG_DIR).filter((name) => !name.startsWith("."));
  assert.deepEqual(files.sort(), SOCIAL_KINDS.map((k) => `${k}.png`).sort());
  for (const kind of SOCIAL_KINDS) {
    const buf = readFileSync(join(OG_DIR, `${kind}.png`));
    const png = readPng(buf);
    assert.deepEqual([png.width, png.height], [1200, 630], `public/og/${kind}.png`);
    assert.ok(buf.length < 5 * 1024 * 1024, `public/og/${kind}.png is ${buf.length} bytes`);
  }
});

test("no card is stale: each records the hash of every input it was drawn from, and each still matches (else run npm run og)", () => {
  const now = { spec: sha256(JSON.stringify(socialImageSpec())) };
  for (const input of INPUTS.slice(1)) now[input] = sha256(readFileSync(join(ROOT, input)));
  for (const kind of SOCIAL_KINDS) {
    const { text } = readPng(readFileSync(join(OG_DIR, `${kind}.png`)));
    const raw = text["techsider-og"];
    assert.ok(raw, `public/og/${kind}.png has no techsider-og record: draw the cards with npm run og, never by hand`);
    const record = JSON.parse(raw);
    assert.equal(record.kind, kind, `public/og/${kind}.png was drawn as the ${record.kind} card`);
    assert.deepEqual(Object.keys(record.inputs).sort(), [...INPUTS].sort(), `public/og/${kind}.png: the generator's inputs changed; update INPUTS`);
    for (const input of INPUTS) {
      assert.equal(record.inputs[input], now[input], `public/og/${kind}.png is stale: ${input} changed since it was drawn. Run npm run og and commit public/og/.`);
    }
  }
});

for (const [attr, tag] of [["property", "og:image"], ["property", "og:image:type"], ["property", "og:image:width"], ["property", "og:image:height"], ["property", "og:image:alt"], ["name", "twitter:card"], ["name", "twitter:image"], ["name", "twitter:image:alt"]]) {
  test(`required social tag ${tag} rejects a second conflicting value, regardless of attribute order`, () => {
    const first = `<meta ${attr}="${tag}" content="expected">`;
    assert.equal(metaContent(first, attr, tag), "expected");
    assert.throws(() => metaContent(`${first}<meta ${attr}="${tag}" content="conflicting">`, attr, tag), /exactly one/, tag);
    assert.throws(() => metaContent(`${first}<meta content="conflicting" ${attr}="${tag}">`, attr, tag), /exactly one/, tag);
  });
}

test("an unsupported social-card glyph names the character and font instead of a bare KeyError", () => {
  const result = spawnSync("python3", ["-c", `
# Compile the real generator function using only stdlib, so CI needs no glyph dependencies.
# The unsupported character exits before outlining; the fake supplies only font tables/naming.
import ast
from pathlib import Path
module = ast.parse(Path("scripts/generate_brand.py").read_text())
function = next(node for node in module.body if isinstance(node, ast.FunctionDef) and node.name == "text_run")
class Names:
    def getDebugName(self, index): return "Fixture Archivo"
class Font(dict):
    def getBestCmap(self): return {}
namespace = {"TTFont": Font}
exec(compile(ast.Module(body=[function], type_ignores=[]), "scripts/generate_brand.py", "exec"), namespace)
namespace["text_run"](Font(head=type("Head", (), {"unitsPerEm": 1000})(), name=Names()), "🧪", 24, 0, 30)
`], { cwd: ROOT, encoding: "utf8" });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /missing glyph.*🧪.*U\+1F9EA.*Archivo/i);
  assert.doesNotMatch(result.stderr, /KeyError/);
});

test("the retired cloud-wordmark card, public/og.png, is gone (spec §6.3)", () => {
  assert.equal(existsSync(join(ROOT, "public/og.png")), false);
});

for (const [build, dir] of Object.entries(BUILDS)) {
  test(`${build}: every page names its kind's card in og:image and twitter:image, with its type, size and alt, and ships the card`, () => {
    const files = htmlFiles(dir);
    assert.ok(files.length > 0, `${build} is empty: run the build first`);
    for (const file of files) {
      const rel = relPath(dir, file);
      const html = readText(file);
      const image = socialImage(pathOf(rel));
      const url = `https://techsider.com.au${image.path}`;
      const at = `${build}/${rel}`;
      assert.equal(metaContent(html, "property", "og:image"), url, `${at}: og:image`);
      assert.equal(metaContent(html, "property", "og:image:type"), "image/png", `${at}: og:image:type`);
      assert.equal(metaContent(html, "property", "og:image:width"), "1200", `${at}: og:image:width`);
      assert.equal(metaContent(html, "property", "og:image:height"), "630", `${at}: og:image:height`);
      assert.equal(metaContent(html, "property", "og:image:alt"), image.alt, `${at}: og:image:alt`);
      assert.equal(metaContent(html, "name", "twitter:card"), "summary_large_image", `${at}: twitter:card`);
      assert.equal(metaContent(html, "name", "twitter:image"), url, `${at}: twitter:image`);
      assert.equal(metaContent(html, "name", "twitter:image:alt"), image.alt, `${at}: twitter:image:alt`);
    }
    for (const kind of SOCIAL_KINDS) assert.ok(existsSync(join(dir, "og", `${kind}.png`)), `${build}/og/${kind}.png is missing`);
    assert.equal(existsSync(join(dir, "og.png")), false, `${build} still ships the retired og.png`);
  });
}

test("production: Home, every solution, industry and services page, the insights and the other pages each share their kind's card", () => {
  const cardOf = new Map(htmlFiles(BUILDS.dist).map((file) => {
    const url = metaContent(readText(file), "property", "og:image") ?? "";
    return [pathOf(relPath(BUILDS.dist, file)), url.match(/\/og\/([a-z]+)\.png$/)?.[1]];
  }));
  const expect = (path, kind) => assert.equal(cardOf.get(path), kind, `dist: ${path} shares the ${cardOf.get(path)} card`);
  expect("/", "home");
  const byGroup = { solutions: "solution", industries: "industry", services: "service" };
  for (const p of PAGES.filter((x) => x.status === "live" && byGroup[x.group])) expect(p.path, byGroup[p.group]);
  const insights = [...cardOf.keys()].filter((path) => path.startsWith("/insights/"));
  assert.ok(insights.length > 1, "dist has no insight post");
  for (const path of insights) expect(path, "insight");
  for (const path of ["/about/", "/contact/", "/404"]) expect(path, "default");
  assert.deepEqual([...new Set(cardOf.values())].sort(), [...SOCIAL_KINDS].sort(), "a card no production page shares, or a page with none");
});
