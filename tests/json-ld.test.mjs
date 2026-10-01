// Structured data (spec §11.3).
// - Serialisation: every <script type="application/ld+json"> body goes through jsonLd() in
//   src/lib/json-ld.ts, which escapes "<" so no string in the data can close the script element
//   early or open an HTML comment inside it.
// - The builders: the Organization (minimal off Home; in full on Home, with legalName only once it
//   differs from the name, and knowsAbout naming no agents, spec §3.4), the WebSite, a Service and
//   each page's @graph.
// - Every built page, in both builds: its JSON-LD parses; it holds one Organization (a nested one
//   counts), with the site's @id; every @id it points to is a node on the same page; every typed
//   object carries the properties its type requires, and no property its type doesn't allow; and
//   nothing carries an offer, a price, a person or a headcount.
//   In production: the full Organization and the WebSite on Home alone, and a Service on each
//   solution page, on /services/ (one per service it lists) and on the Evaluation Partner page,
//   each in the visible words of its page's <main>, and on no other page.
// Run `npm run build && npm run build:preview` first.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { htmlFiles, pageUrl, readText, visibleText } from "../scripts/ci/lib.mjs";
import { PAGES, SITE } from "../src/data/nav.ts";
import { SERVICES } from "../src/data/services.ts";
import { KNOWS_ABOUT, jsonLd, organization, organizationId, pageGraph, service, website } from "../src/lib/json-ld.ts";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const SRC = join(ROOT, "src");
const ORIGIN = "https://techsider.com.au";
const ORG_ID = `${ORIGIN}/#organization`;
const AUSTRALIA = { "@type": "Country", name: "Australia" };

test("jsonLd escapes every '<', so data can't end the script or open a comment, and still round-trips", () => {
  const data = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    name: "</script><!--",
    mainEntity: [{ "@type": "Question", name: "a < b? </SCRIPT >", acceptedAnswer: { "@type": "Answer", text: "<!-- x --> & y" } }],
  };
  const out = jsonLd(data);
  assert.doesNotMatch(out, /</);
  assert.doesNotMatch(out, /<\/script|<!--/i);
  assert.ok(out.includes("\\u003c/script>\\u003c!--"), out);
  assert.deepEqual(JSON.parse(out), data);
  assert.equal(jsonLd({ a: "plain" }), JSON.stringify({ a: "plain" }), "data without '<' serialises unchanged");
});

function astroFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return astroFiles(p);
    return name.endsWith(".astro") ? [p] : [];
  });
}

test("every ld+json script in src/ is serialised by jsonLd()", () => {
  const scripts = [];
  for (const file of astroFiles(SRC)) {
    const rel = relative(SRC, file).split(sep).join("/");
    for (const m of readFileSync(file, "utf8").matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>/g)) scripts.push([rel, m[0]]);
  }
  // Breadcrumb and FaqList (the B1 components; the Home page's FAQPage comes from FaqList since the
  // legacy Home's FAQ section went in Phase D) and BaseLayout's @graph, which carries every other
  // node: the Organization, the WebSite, a route's Service and a post's BlogPosting.
  assert.deepEqual(scripts.map(([rel]) => rel).sort(), [
    "components/ui/Breadcrumb.astro",
    "components/ui/FaqList.astro",
    "layouts/BaseLayout.astro",
  ]);
  for (const [rel, tag] of scripts) assert.match(tag, /\sset:html=\{jsonLd\([^)]*\)\}/, `${rel}: ${tag}`);
});

test("organization(): minimal off Home; in full on Home, with the logo, the slogan and proof line, Australia, and knowsAbout naming no agents (spec §3.4)", () => {
  assert.deepEqual(organization(ORIGIN, false), { "@type": "Organization", "@id": ORG_ID, name: "Techsider", url: `${ORIGIN}/` });
  assert.deepEqual(organization(ORIGIN, true), {
    "@type": "Organization",
    "@id": ORG_ID,
    name: "Techsider",
    url: `${ORIGIN}/`,
    legalName: "Techsider Pty Ltd",
    email: SITE.email,
    logo: `${ORIGIN}/icon-512.png`,
    slogan: "AI that ships. Measured before it ships.",
    areaServed: AUSTRALIA,
    knowsAbout: KNOWS_ABOUT,
  });
  assert.equal(organizationId(`${ORIGIN}/insights/a-post/`), ORG_ID, "every page names the one @id");
  assert.ok(KNOWS_ABOUT.length > 0, "knowsAbout is empty");
  for (const topic of KNOWS_ABOUT) assert.doesNotMatch(topic, /\bagent/i, `knowsAbout names agents: "${topic}"`);
});

test("legalName: carries the owner-supplied company name; the ABN remains held open by a ⚑ (spec §12 item 5)", () => {
  assert.equal(SITE.legalName, "Techsider Pty Ltd");
  assert.equal(organization(ORIGIN, true).legalName, SITE.legalName);
  const saved = SITE.legalName;
  try {
    SITE.legalName = SITE.name;
    assert.equal("legalName" in organization(ORIGIN, true), false, "legalName repeats the brand name");
    assert.equal("legalName" in organization(ORIGIN, false), false, "the minimal node grew a legalName");
  } finally {
    SITE.legalName = saved;
  }
  const nav = readFileSync(join(SRC, "data/nav.ts"), "utf8");
  assert.ok(
    nav.includes("  // ⚑ owner: confirm the ABN for Techsider Pty Ltd (spec §12 item 5)"),
    "nav.ts has no ABN verification marker",
  );
});

test("service() and pageGraph(): a Service in its page's words, provided by the Organization in Australia; Home's graph holds the full Organization and the WebSite, any other page's the minimal one, then its own nodes", () => {
  const listed = service(ORIGIN, { path: "/services/", key: "fit-call", name: "Fit Call", description: "A call." });
  assert.deepEqual(listed, {
    "@type": "Service",
    "@id": `${ORIGIN}/services/#fit-call`,
    name: "Fit Call",
    description: "A call.",
    url: `${ORIGIN}/services/`,
    provider: { "@id": ORG_ID },
    areaServed: AUSTRALIA,
  });
  assert.deepEqual(website(ORIGIN), {
    "@type": "WebSite",
    "@id": `${ORIGIN}/#website`,
    name: "Techsider",
    url: `${ORIGIN}/`,
    inLanguage: "en-AU",
    publisher: { "@id": ORG_ID },
  });
  const context = "https://schema.org";
  assert.deepEqual(pageGraph(ORIGIN, "/"), { "@context": context, "@graph": [organization(ORIGIN, true), website(ORIGIN)] });
  assert.deepEqual(pageGraph(ORIGIN, "/services/", [listed]), { "@context": context, "@graph": [organization(ORIGIN, false), listed] });
  assert.deepEqual(pageGraph(ORIGIN, "/404/"), { "@context": context, "@graph": [organization(ORIGIN, false)] });
});

const cache = new Map();
/** Every page of a build ("dist" or "dist-preview"): its URL, its HTML and its ld+json script bodies. */
function built(dir) {
  if (!cache.has(dir)) {
    const root = join(ROOT, dir);
    assert.ok(existsSync(root), `${dir}/ is missing: run \`npm run build && npm run build:preview\` first`);
    cache.set(dir, htmlFiles(root).map((file) => {
      const html = readText(file);
      const scripts = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => m[1]);
      return { url: pageUrl(root, file), html, scripts };
    }));
  }
  return cache.get(dir);
}
/** A page's nodes: each document's @graph members, or the document itself. */
const nodesOf = (scripts) => scripts.map((s) => JSON.parse(s)).flatMap((doc) => doc["@graph"] ?? [doc]);
/** Every object inside a value, the value itself included, depth-first. */
const objectsIn = (v) => (Array.isArray(v) ? v.flatMap(objectsIn) : v && typeof v === "object" ? [v, ...Object.values(v).flatMap(objectsIn)] : []);

/** Project-enforced shape for the types this site emits. These rows are our assertions, not a
 * complete statement of any vendor's structured-data requirements. New types need rows in both
 * REQUIRED (filled properties) and ALLOWED (permitted keys). */
const REQUIRED = {
  Organization: ["@id", "name", "url"],
  WebSite: ["@id", "name", "url"],
  Service: ["@id", "name", "description", "url", "provider"],
  BlogPosting: ["@id", "headline", "datePublished", "author", "publisher", "mainEntityOfPage"],
  BreadcrumbList: ["itemListElement"],
  ListItem: ["position", "name", "item"],
  FAQPage: ["mainEntity"],
  Question: ["name", "acceptedAnswer"],
  Answer: ["text"],
  Country: ["name"],
};
/**
 * Every property each type may carry: what src/lib/json-ld.ts, Breadcrumb and FaqList emit (with
 * the Organization's legalName, once the owner sets it), so a misspelt or unplanned key fails. A
 * standalone BreadcrumbList or FAQPage carries its own @context; a graph node doesn't. A type
 * without a row fails an independent table assertion, even if REQUIRED already has its row.
 */
const ALLOWED = {
  Organization: ["@type", "@id", "name", "url", "legalName", "email", "logo", "slogan", "areaServed", "knowsAbout"],
  WebSite: ["@type", "@id", "name", "url", "inLanguage", "publisher"],
  Service: ["@type", "@id", "name", "description", "url", "provider", "areaServed"],
  BlogPosting: ["@type", "@id", "headline", "description", "datePublished", "dateModified", "inLanguage", "url", "mainEntityOfPage", "author", "publisher"],
  BreadcrumbList: ["@context", "@type", "itemListElement"],
  ListItem: ["@type", "position", "name", "item"],
  FAQPage: ["@context", "@type", "mainEntity"],
  Question: ["@type", "name", "acceptedAnswer"],
  Answer: ["@type", "text"],
  Country: ["@type", "name"],
};
const filled = (v) => v !== undefined && v !== null && v !== "" && !(Array.isArray(v) && v.length === 0);
/** Assert both tables separately before reading either row. */
function checkTypeProperties(obj, url) {
  const type = obj["@type"];
  assert.ok(type in REQUIRED, `${url}: a ${type} has no row in REQUIRED`);
  assert.ok(type in ALLOWED, `${url}: a ${type} has no row in ALLOWED`);
  for (const key of REQUIRED[type]) assert.ok(filled(obj[key]), `${url}: a ${type} without ${key}`);
  for (const key of Object.keys(obj)) assert.ok(ALLOWED[type].includes(key), `${url}: a ${type} carries "${key}", which ALLOWED doesn't list for it`);
}

test("a type added only to REQUIRED gets an actionable missing-ALLOWED-row diagnostic", () => {
  REQUIRED.RequiredOnly = ["name"];
  try {
    assert.throws(() => checkTypeProperties({ "@type": "RequiredOnly", name: "fixture" }, "/fixture/"), /RequiredOnly has no row in ALLOWED/);
  } finally {
    delete REQUIRED.RequiredOnly;
  }
});

/** Offers and prices (D4, check 11), people (spec §11.3) and a headcount (D14): no node carries one. */
const FORBIDDEN_KEYS = ["offers", "price", "priceRange", "priceSpecification", "hasOfferCatalog", "founder", "founders", "employee", "employees", "member", "members", "numberOfEmployees"];
const FORBIDDEN_TYPES = ["Person", "Offer", "AggregateOffer", "OfferCatalog", "PriceSpecification"];

for (const dir of ["dist", "dist-preview"]) {
  test(`${dir}: every page's JSON-LD parses, holds one Organization with the site's @id, resolves every @id it points to, and gives each type its required properties and no other than it allows`, () => {
    const pages = built(dir);
    assert.ok(pages.length > 0, `${dir}/ holds no page`);
    for (const { url, scripts } of pages) {
      const nodes = nodesOf(scripts);
      // Nested objects count, so an Organization inlined as an author or provider would show here.
      const orgs = objectsIn(nodes).filter((o) => o["@type"] === "Organization");
      assert.equal(orgs.length, 1, `${url}: ${orgs.length} Organization nodes`);
      assert.equal(orgs[0]["@id"], ORG_ID, `${url}: the Organization's @id`);
      const ids = new Set(nodes.map((n) => n["@id"]).filter(Boolean));
      assert.equal(ids.size, nodes.filter((n) => n["@id"]).length, `${url}: two nodes share an @id`);
      for (const obj of objectsIn(nodes)) {
        const keys = Object.keys(obj);
        if (keys.length === 1 && keys[0] === "@id") assert.ok(ids.has(obj["@id"]), `${url}: ${obj["@id"]} is no node on the page`);
        const type = obj["@type"];
        // An untyped object is an @id reference, and nothing else: a misspelt "@type" shows here.
        if (type === undefined) {
          assert.deepEqual(keys, ["@id"], `${url}: an untyped object that isn't an @id reference: ${JSON.stringify(obj)}`);
          continue;
        }
        checkTypeProperties(obj, url);
        if (type === "BreadcrumbList") {
          assert.deepEqual(obj.itemListElement.map((i) => i.position), obj.itemListElement.map((_, i) => i + 1), `${url}: breadcrumb positions`);
          for (const item of obj.itemListElement) assert.ok(item.item.startsWith(`${ORIGIN}/`), `${url}: breadcrumb item ${item.item}`);
        }
      }
    }
  });

  test(`${dir}: no JSON-LD node carries an offer, a price, a person or a headcount`, () => {
    for (const { url, scripts } of built(dir)) {
      for (const obj of objectsIn(nodesOf(scripts))) {
        for (const key of FORBIDDEN_KEYS) assert.equal(key in obj, false, `${url}: a node carries ${key}`);
        assert.equal(FORBIDDEN_TYPES.includes(obj["@type"]), false, `${url}: a ${obj["@type"]} node`);
      }
    }
  });
}

test("production: Home alone carries the full Organization and the WebSite; the WebSite names Home's canonical URL, and the logo is a built file", () => {
  const pages = built("dist");
  const home = pages.find((p) => p.url === "/");
  assert.ok(home, "dist/ has no Home");
  const nodes = nodesOf(home.scripts);
  assert.deepEqual(nodes.find((n) => n["@type"] === "Organization"), organization(ORIGIN, true));
  assert.deepEqual(nodes.filter((n) => n["@type"] === "WebSite"), [website(ORIGIN)]);
  assert.equal(home.html.match(/<link rel="canonical" href="([^"]+)"/)?.[1], website(ORIGIN).url, "the WebSite's url isn't Home's canonical URL");
  const logo = new URL(String(organization(ORIGIN, true).logo));
  assert.ok(existsSync(join(ROOT, "dist", logo.pathname)), `dist${logo.pathname} is missing`);
  for (const { url, scripts } of pages.filter((p) => p.url !== "/")) {
    const others = nodesOf(scripts);
    assert.deepEqual(others.find((n) => n["@type"] === "Organization"), organization(ORIGIN, false), `${url}: the Organization isn't the minimal node`);
    assert.equal(others.filter((n) => n["@type"] === "WebSite").length, 0, `${url}: a WebSite off Home`);
  }
});

test("production: a Service on each solution page, one per listed service on /services/ and one on the Evaluation Partner page, each in its page's visible words, and on no other page", () => {
  const solutions = PAGES.filter((p) => p.base === "/solutions/");
  assert.equal(solutions.length, 5);
  const partner = PAGES.find((p) => p.path === "/services/evaluation-partner/");
  const expected = new Map([
    ...solutions.map((p) => [p.path, [service(ORIGIN, { path: p.path, key: "service", name: p.fullName, description: String(p.oneLiner) })]]),
    ["/services/", SERVICES.services.map((s) => service(ORIGIN, { path: "/services/", key: s.id, name: s.name, description: s.what }))],
    [partner.path, [service(ORIGIN, { path: partner.path, key: "service", name: partner.fullName, description: SERVICES.evaluationPartner.promise })]],
  ]);
  const pages = built("dist");
  for (const path of expected.keys()) assert.ok(pages.some((p) => p.url === path), `dist/ has no ${path}`);
  for (const { url, html, scripts } of pages) {
    const services = nodesOf(scripts).filter((n) => n["@type"] === "Service");
    assert.deepEqual(services, expected.get(url) ?? [], url);
    // Google's policies: mark up only what a reader can see on the page. The words come from <main>:
    // the <title> repeats a solution's or the Evaluation Partner's name, and would pass on its own.
    const words = visibleText(html.slice(html.indexOf("<main"), html.indexOf("</main>")));
    for (const s of services) {
      assert.ok(words.includes(s.name), `${url}: "${s.name}" isn't on the page`);
      assert.ok(words.includes(s.description), `${url}: "${s.description}" isn't on the page`);
    }
  }
});
