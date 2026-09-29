// The IndustryView each industry specimen renders, built from the fixtures the way a Phase C
// route builds it from content: the industry, its regulatory rows, every solution and trace, and
// the insight cards. tests/industry-template.test.mjs and tests/e2e/industry-template.spec.mjs
// import it too, so they check each page against the view it was rendered from.
import {
  fixtureSite, industryFixtures, insightFixtures, regulatoryFixtures, solutionFixtures, traceFixtures,
} from "../../fixtures/index.ts";
import { industryView } from "../../lib/views/industry.ts";
import type { IndustryView } from "../../lib/views/industry.ts";
import { insightCards } from "../../lib/views/insights.ts";

export function fixtureIndustryView(id: string): IndustryView {
  const data = industryFixtures[id];
  const regulatory = regulatoryFixtures[id];
  if (!data || !regulatory) throw new Error(`fixtureIndustryView: no industry or regulatory fixture "${id}"`);
  return industryView({
    id,
    data,
    rows: regulatory.rows,
    solutions: solutionFixtures,
    traces: traceFixtures,
    insights: insightCards(insightFixtures, fixtureSite),
    site: fixtureSite,
  });
}
