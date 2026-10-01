// The Home template (spec §8.1) as the preview build renders it from every fixture set:
// /preview/templates/home/ (built at FIXTURE_NOW: the latest insights show as cards) and
// /preview/templates/home-stale-insights/ (FIXTURE_STALE_NOW: only the "All insights" link).
// Run `npm run build:preview` first. The builder is covered by tests/views-home.test.mjs.
import { AUTOMATION } from "../src/lib/marketing.ts";
import { test } from "node:test";
import assert from "node:assert/strict";
import { readPreviewDist, visibleText } from "./helpers.mjs";
import { elements, elementsWith, idsIn, startTags } from "../scripts/ci/lib.mjs";
import { HOME_ANCHORS } from "../scripts/ci/checks/03-anchors.mjs";
import { homeView } from "../src/lib/views/home.ts";
import { insightCards } from "../src/lib/views/insights.ts";
import { HOME_TRUST_QUESTION } from "../src/lib/fixed-copy.ts";
import {
  FIXTURE_NOW, FIXTURE_STALE_NOW, fixtureSite, homeFixture, industryFixtures, insightFixtures, positioningFixture,
  servicesFixture, solutionFixtures, traceFixtures,
} from "../src/fixtures/index.ts";

const HOME = "preview/templates/home/index.html";
const STALE = "preview/templates/home-stale-insights/index.html";
const viewAt = (now) => homeView({
  positioning: positioningFixture, services: servicesFixture, home: homeFixture, solutions: solutionFixtures,
  industries: industryFixtures, traces: traceFixtures, insights: insightCards(insightFixtures, fixtureSite), now, site: fixtureSite,
});
const view = viewAt(FIXTURE_NOW);
const mainOf = html => elements(html,t=>t.name === "main")[0].inner;
const text = html => visibleText(html).trim();
const tagged = (html,name) => elements(html,t=>t.name === name);
function one(html,attr,value){ const found=elementsWith(html,attr,value); assert.equal(found.length,1,attr); return found[0]; }
for(const file of [HOME,STALE]){
  test(`${file}: concise business homepage preserves anchors, semantics and gated links`,()=>{
    const html=readPreviewDist(file), main=mainOf(html);
    assert.equal(tagged(main,"h1").length,1);
    assert.equal(text(tagged(main,"h1")[0].inner),AUTOMATION.title);
    const ids=idsIn(main);
    for(const id of HOME_ANCHORS) assert.ok(ids.has(id),id);
    const all=startTags(html).map(t=>t.attrs.id).filter(Boolean);
    assert.equal(new Set(all).size,all.length,"unique ids");
    const levels=startTags(main).filter(t=>/^h[1-6]$/.test(t.name)).map(t=>+t.name[1]);
    levels.forEach((level,i)=>{if(i) assert.ok(level<=levels[i-1]+1);});
    for(const tag of startTags(html)) for(const id of (tag.attrs["aria-labelledby"]??"").split(/\s+/).filter(Boolean)) assert.ok(idsIn(html).has(id),id);
    const cards=elementsWith(one(main,"id","industries").inner,"data-link-card");
    assert.equal(cards.length,9);
    cards.forEach((card,i)=>assert.deepEqual(tagged(card.inner,"a").map(a=>a.attrs.href),view.industries[i].href?[view.industries[i].href]:[]));
    const services=one(main,"id","services");
    assert.equal(elementsWith(services.inner,"data-capability").length,3);
    for(const solution of view.solutions) if(solution.href) assert.ok(tagged(services.inner,"a").some(a=>a.attrs.href===solution.href));
    assert.equal(one(one(main,"id","demo").inner,"data-all-demos").attrs.href,view.demo.allHref);
    assert.equal(elementsWith(main,"data-demo-placeholder").length,0);
    assert.equal(elementsWith(main,"data-hero-trace").length,0);
    assert.equal(elementsWith(main,"data-business-artwork").length,5);
    const hero=one(main,"data-page-hero");
    assert.deepEqual(tagged(hero.inner,"a").map(a=>[text(a.inner),a.attrs.href]),[["Talk about your workflow",view.hero.ctas.primary.href],["Explore solutions","#services"]]);
  });
}

test("home: #insights shows 3 cards and the All insights link while the newest post is recent", () => {
  const section = one(mainOf(readPreviewDist(HOME)), "id", "insights");
  const block = one(section.inner, "data-latest-insights");
  assert.equal(block.attrs["data-latest-insights"], "cards");
  const cards = elementsWith(block.inner, "data-insight-card");
  assert.deepEqual(cards.map((c) => tagged(c.inner, "a").find((a) => a.attrs.href.startsWith("/insights/")).attrs.href), view.insights.cards.map((c) => c.href));
  assert.equal(cards.length, 3);
  const all = one(block.inner, "data-all-insights");
  assert.deepEqual([all.attrs.href, text(all.inner)], ["/insights/", "All insights →"]);
});

test("home-stale-insights: #insights keeps its anchor and shows only the All insights link", () => {
  assert.equal(viewAt(FIXTURE_STALE_NOW).insights.mode, "link");
  const section = one(mainOf(readPreviewDist(STALE)), "id", "insights");
  const block = one(section.inner, "data-latest-insights");
  assert.equal(block.attrs["data-latest-insights"], "link");
  assert.equal(elementsWith(block.inner, "data-insight-card").length, 0);
  assert.deepEqual(tagged(block.inner, "a").map((a) => [a.attrs.href, text(a.inner)]), [["/insights/", "All insights →"]]);
});

test("home: the FAQ asks the trust question and carries one FAQPage; the closing prompt talks to us", () => {
  const html = readPreviewDist(HOME);
  const faq = one(mainOf(html), "id", "faq");
  const questions = elements(faq.inner, (t) => t.name === "summary").map((s) => text(s.inner).replace(/\s*\+\s*−$/, ""));
  assert.deepEqual(questions, homeFixture.faq.map((f) => f.q));
  assert.ok(questions.includes(HOME_TRUST_QUESTION));
  const ld = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
  assert.equal(ld.filter((d) => d["@type"] === "FAQPage").length, 1, "one FAQPage");
  const contact = one(mainOf(html), "id", "contact");
  const prompt = one(contact.inner, "data-prompt-block");
  assert.ok(text(prompt.inner).includes("What could your team stop doing manually?"));
  assert.deepEqual(tagged(prompt.inner, "a").map((a) => [text(a.inner), a.attrs.href]), [["Let's talk", "/preview/templates/contact/"]]);
});
