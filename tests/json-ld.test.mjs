// JSON-LD serialisation (spec §11.3): every <script type="application/ld+json"> body goes
// through src/lib/json-ld.ts, which escapes "<" so no string in the data can close the script
// element early or open an HTML comment inside it.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { jsonLd } from "../src/lib/json-ld.ts";

const SRC = fileURLToPath(new URL("../src/", import.meta.url));

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
  // Breadcrumb and FaqList (the B1 components), the legacy Home FAQ, BaseLayout's Organization and PostLayout's BlogPosting.
  assert.deepEqual(scripts.map(([rel]) => rel).sort(), [
    "components/Faq.astro",
    "components/ui/Breadcrumb.astro",
    "components/ui/FaqList.astro",
    "layouts/BaseLayout.astro",
    "layouts/PostLayout.astro",
  ]);
  for (const [rel, tag] of scripts) assert.match(tag, /\sset:html=\{jsonLd\([^)]*\)\}/, `${rel}: ${tag}`);
});
