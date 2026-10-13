// Preview-only fixtures: the rules are in src/fixtures/index.ts.
// "Rules that travel" anchors (go-global §5.2, §5.3), shaped like src/data/anchors/*.json:
// - sharedAnchorsFixture stands in for shared.json. fixture-x5 is data only (featured: false), so no
//   shared row may list it. fixture-x7 and fixture-x8 stand in for the EU AI Act and GDPR anchors:
//   their names cite those laws, so each needs a reviewBy even where its status alone wouldn't.
// - anchorFixture: the usual page, four shared chips and two featured sector anchors, plus one
//   S-level anchor that stays data only until a person reads its primary source.
// - gdprAnchorFixture: a Draft-for-Approval page, five shared chips (fixture-x8 last) and three
//   featured sector anchors, the most a page shows.
// - governmentAnchorFixture: four shared chips and two featured sector anchors.
// Between them the anchors use every kind and every status, but the gallery renders only two of these
// files: anchorFixture (fixture-industry) and governmentAnchorFixture (fixture-government). So it
// shows the in force, applies from and published labels. gdprAnchorFixture (fixture-industry-3: the
// five-chip shared row with fixture-x8, three sector chips and the not-in-force treaty) never renders,
// and fixture-sector-draft isn't featured. tests/anchors.test.mjs covers every chip label, draft and
// not in force included, and tests/industry-view.test.mjs builds fixture-industry-3's eight-chip view.
// src/fixtures/sets.ts maps each fixture industry to its file (anchorFixtures).
import type { AnchorData, AnchorFileData } from "../content/schemas.ts";

const asAt = new Date("2026-10-01");
const lastReviewed = new Date("2026-10-12");
const reviewBy = new Date("2027-01-12");
const source = (id: string) => `https://example.com/fixture/anchors/${id}`;

/** The fields every fixture anchor shares: the as-at and review dates, and an example.com source. */
const anchor = (a: Omit<AnchorData, "asAt" | "lastReviewed" | "source">): AnchorData => ({ ...a, source: source(a.id), asAt, lastReviewed });

const SHARED_ROW = ["fixture-x1", "fixture-x4", "fixture-x6", "fixture-x7"];
/** A sector anchor two industry files share: the same id may recur across files (go-global §5.3). */
const SECTOR_STANDARD = anchor({
  id: "fixture-sector-standard", name: "Fixture Sector Code of Ethics", issuer: "Fixture Ethics Board",
  kind: "professional-ethics", binding: "Fixture binding: binds fixture members of the fixture profession",
  status: "in-force",
  asks: "Fixture asks: members keep fixture client information confidential when they use AI.",
  evidence: "Fixture evidence: a fixture data-handling note for each fixture tool.",
  solutions: ["fixture-solution-5"], featured: true, checkLevel: "P",
});

export const sharedAnchorsFixture: AnchorFileData = {
  anchors: [
    anchor({
      id: "fixture-x1", name: "Fixture Standard One: AI management system", issuer: "Fixture Standards Body",
      kind: "international-standard", binding: "Fixture binding: voluntary; certifiable by a fixture certification body",
      status: "published", statusDate: new Date("2023-12-18"),
      asks: "Fixture asks: roles, risk assessment and controls across the fixture AI life cycle.",
      evidence: "Fixture evidence: a fixture risk register and test report a reviewer can map to it.",
      solutions: ["fixture-solution", "fixture-solution-4"], featured: true, checkLevel: "P",
    }),
    anchor({
      id: "fixture-x4", name: "Fixture Framework Four and its profile", issuer: "Fixture Institute",
      kind: "guidance", binding: "Fixture binding: a voluntary fixture framework",
      status: "published", statusDate: new Date("2023-01-26"), reviewBy,
      asks: "Fixture asks: govern, map, measure and manage fixture AI risk across the life cycle.",
      evidence: "Fixture evidence: a fixture test set, its thresholds and every failure it found.",
      solutions: ["fixture-solution-4"], featured: true, checkLevel: "P",
    }),
    anchor({
      id: "fixture-x5", name: "Fixture Profile Five", issuer: "Fixture Institute",
      kind: "guidance", binding: "Fixture binding: a voluntary fixture profile",
      status: "published", statusDate: new Date("2024-07-26"),
      asks: "Fixture asks: name the fixture risks of generated content and control each one.",
      evidence: "Fixture evidence: a fixture failure log that names each risk it tested.",
      solutions: ["fixture-solution-2"], featured: false, checkLevel: "P",
    }),
    anchor({
      id: "fixture-x6", name: "Fixture Principles Six", issuer: "Fixture Intergovernmental Body",
      kind: "supervisory-principles", binding: "Fixture binding: a fixture recommendation to member governments",
      status: "published", statusDate: new Date("2024-05-03"),
      asks: "Fixture asks: traceability and ongoing risk management for fixture AI systems.",
      evidence: "Fixture evidence: a fixture trace of each answer back to its source page.",
      solutions: ["fixture-solution", "fixture-solution-2"], featured: true, checkLevel: "P",
    }),
    anchor({
      id: "fixture-x7", name: "Fixture EU AI Act", issuer: "Fixture Union",
      kind: "law", binding: "Fixture binding: fixture law that reaches fixture AI output used in the fixture union",
      status: "applies-from", statusDate: new Date("2027-12-02"), reviewBy,
      asks: "Fixture asks: human oversight, logs and monitoring for fixture high-risk systems.",
      evidence: "Fixture evidence: a fixture oversight log and the fixture monitoring report.",
      solutions: ["fixture-solution-4", "fixture-solution-5"], featured: true, checkLevel: "P",
    }),
    anchor({
      id: "fixture-x8", name: "Fixture GDPR Art 22", issuer: "Fixture Union",
      kind: "law", binding: "Fixture binding: fixture law on decisions made solely by software",
      status: "in-force", reviewBy,
      asks: "Fixture asks: a person, not just fixture software, makes each significant decision.",
      evidence: "Fixture evidence: a fixture approval record naming the person who decided.",
      solutions: ["fixture-solution-3"], featured: true, checkLevel: "P*",
    }),
  ],
};

export const anchorFixture: AnchorFileData = {
  shared: SHARED_ROW,
  anchors: [
    SECTOR_STANDARD,
    anchor({
      id: "fixture-sector-principles", name: "Fixture Supervisory Principles", issuer: "Fixture Supervisors Committee",
      kind: "supervisory-principles", binding: "Fixture binding: fixture principles that supervisors expect firms to follow",
      status: "published", statusDate: new Date("2025-12-10"),
      asks: "Fixture asks: firms manage the risk of each fixture third-party service they rely on.",
      evidence: "Fixture evidence: a fixture vendor evaluation report with its test set.",
      solutions: ["fixture-solution-4"], featured: true, checkLevel: "P*",
    }),
    anchor({
      id: "fixture-sector-draft", name: "Fixture Draft Guidance", issuer: "Fixture Sector Agency",
      kind: "guidance", binding: "Fixture binding: a fixture draft, open for comment",
      status: "draft", reviewBy,
      asks: "Fixture asks: validate fixture AI tools before staff rely on them.",
      evidence: "Fixture evidence: a fixture acceptance test and its results.",
      solutions: ["fixture-solution-4"], featured: false, checkLevel: "S",
    }),
  ],
};

export const gdprAnchorFixture: AnchorFileData = {
  shared: [...SHARED_ROW, "fixture-x8"],
  anchors: [
    anchor({
      id: "fixture-sector-annex", name: "Fixture EU AI Act Annex point 5(b)", issuer: "Fixture Union",
      kind: "law", binding: "Fixture binding: fixture law for one fixture high-risk use",
      status: "applies-from", statusDate: new Date("2027-12-02"), reviewBy,
      asks: "Fixture asks: a fixture impact assessment before a fixture high-risk system is used.",
      evidence: "Fixture evidence: the fixture test results an impact assessment can cite.",
      solutions: ["fixture-solution-4"], featured: true, checkLevel: "P",
    }),
    SECTOR_STANDARD,
    anchor({
      id: "fixture-sector-treaty", name: "Fixture Convention on AI", issuer: "Fixture Council",
      kind: "treaty", binding: "Fixture binding: a fixture treaty, binding on fixture states once in force",
      status: "not-in-force", reviewBy: new Date("2027-04-12"),
      asks: "Fixture asks: fixture public bodies assess and manage the risks of their AI systems.",
      evidence: "Fixture evidence: a fixture risk register for each fixture system in scope.",
      solutions: ["fixture-solution-4"], featured: true, checkLevel: "P*",
    }),
  ],
};

export const governmentAnchorFixture: AnchorFileData = {
  shared: SHARED_ROW,
  anchors: [
    anchor({
      id: "fixture-gov-recommendation", name: "Fixture Recommendation on AI Ethics", issuer: "Fixture International Organisation",
      kind: "guidance", binding: "Fixture binding: a fixture recommendation to member states",
      status: "published", statusDate: new Date("2021-11-23"),
      asks: "Fixture asks: fixture agencies assess the impact of AI before they use it.",
      evidence: "Fixture evidence: a fixture evaluation report on the agency's own questions.",
      solutions: ["fixture-solution-4", "fixture-solution-2"], featured: true, checkLevel: "P",
    }),
    anchor({
      id: "fixture-gov-impact", name: "Fixture EU AI Act Article 27", issuer: "Fixture Union",
      kind: "law", binding: "Fixture binding: fixture law for fixture public bodies using high-risk AI",
      status: "applies-from", statusDate: new Date("2027-12-02"), reviewBy,
      asks: "Fixture asks: a fixture rights impact assessment before a public body uses the system.",
      evidence: "Fixture evidence: the fixture test results the assessment can cite.",
      solutions: ["fixture-solution-4"], featured: true, checkLevel: "P",
    }),
  ],
};
