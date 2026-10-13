// The IndustryView each industry specimen renders, built from the fixtures the way a Phase C
// route builds it from content: the industry, its regulatory rows, the shared and industry
// anchors, every solution and trace, and the insight cards. tests/industry-template.test.mjs and
// tests/e2e/industry-template.spec.mjs import it too, so they check each page against the view it
// was rendered from.
import {
  anchorFixtures, fixtureSite, industryFixtures, insightFixtures, regulatoryFixtures, sharedAnchorsFixture, solutionFixtures,
  traceFixtures,
} from "../../fixtures/index.ts";
import { industryView } from "../../lib/views/industry.ts";
import type { IndustryView } from "../../lib/views/industry.ts";
import { insightCards } from "../../lib/views/insights.ts";

export function fixtureIndustryView(id: string): IndustryView {
  const data = industryFixtures[id];
  const regulatory = regulatoryFixtures[id];
  const anchors = anchorFixtures[id];
  if (!data || !regulatory || !anchors) throw new Error(`fixtureIndustryView: no industry, regulatory or anchors fixture "${id}"`);
  return industryView({
    id,
    data,
    rows: regulatory.rows,
    sharedAnchors: sharedAnchorsFixture,
    anchors,
    solutions: solutionFixtures,
    traces: traceFixtures,
    insights: insightCards(insightFixtures, fixtureSite),
    site: fixtureSite,
  });
}
