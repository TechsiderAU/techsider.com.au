// The careers page (careers spec §3, §4, §10): its copy in src/data/careers.ts, the careersData
// schema that validates it, and careersView, which numbers the roles, derives each anchor and
// per-role email subject, and fills the applicant notice from the site's own records; then the
// built page, its place in the menu, footer, /llms.txt and sitemap, and its gallery specimen. Every
// visible string is pinned here exactly as spec §4 gives it, so a copy edit shows up as a diff.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { careersData } from "../src/content/page-schemas.ts";
import { CAREERS } from "../src/data/careers.ts";
import { CONTACT } from "../src/data/contact.ts";
import { fixtureSite } from "../src/fixtures/index.ts";
import { SITE, slugify } from "../src/data/nav.ts";
import { siteContext } from "../src/lib/site.ts";
import { careersView } from "../src/lib/views/careers.ts";
import { visibleText } from "./helpers.mjs";
import { decodeEntities, elements, hrefsIn, result } from "../scripts/ci/lib.mjs";
import { scan } from "../scripts/ci/checks/04-banned-phrases.mjs";
import { OFFER_FILES, OFFER_RULES } from "../scripts/ci/checks/11-pricing.mjs";

const ROOT = fileURLToPath(new URL("../", import.meta.url));

const PAID = "A paid role, with terms agreed individually. The partner track is open to you.";

/** Spec §4.3 and §4.4: the four roles, in order, with every string as approved. */
const ROLES = [
  {
    id: "forward-deployed-engineer",
    title: "Forward Deployed Engineer",
    label: "Partner track",
    tagline: "Understand the problem. Own the result.",
    description:
      "Work inside a client's team to find the problem worth fixing, then build the AI system that fixes it: retrieval, agents, integrations and the interface. You test it against thresholds agreed up front, hand it over cleanly and stay accountable once it's live. You join on the partner track.",
    tags: ["Discovery", "LLM and agent engineering", "Retrieval", "Evaluation", "Client leadership"],
    responsibilities: [
      "Run discovery on site or remotely: map the workflow, the documents and the decisions, and agree what success means before anything is built.",
      "Build the system end to end where the client chose to run it: retrieval, agents, integrations and the interface.",
      "Write the acceptance tests with the client's experts, test against thresholds agreed up front, and report every failure.",
      "Hand over cleanly: code, prompts, tests and runbook in the client's repository, and their staff trained to run it.",
      "Turn what each engagement teaches into reusable patterns and offers.",
      "As a partner: win and lead engagements, shape what Techsider offers, and help choose who joins next.",
    ],
    bring: [
      "You've built and shipped software that people rely on, and you've put LLM, retrieval or agent systems in front of real users.",
      "Strong engineering in Python or TypeScript, and hands-on experience with at least one major cloud platform.",
      "You can sit with a client's experts and executives, find what matters to them and explain trade-offs plainly.",
      "You test before you claim: evaluation sets, thresholds and honest reporting of what doesn't work.",
      "You use AI coding tools such as Claude Code, Codex or Cursor, with judgement about what to check.",
      "You want to build a firm, not just hold a job: you'd rather own the outcome and the client relationship.",
    ],
    terms:
      "Partner track from the start. Partners are rewarded differently from the other roles: we explain how before any interview, and agree it individually, in writing. Access to a client's systems is agreed in that client's contract, including where you work from.",
  },
  {
    id: "marketing-strategist-ai",
    title: "Marketing Strategist (AI)",
    tagline: "Find the buyer. Earn the belief.",
    description:
      "Make Techsider easy to find, understand and believe for the people who buy AI work, without any claim the firm can't back. You own positioning and the insights programme, grow visibility in search engines and AI assistants, and track what turns into real conversations. You use AI tools to draft, and a person checks every claim before it's published.",
    tags: ["Positioning", "Content strategy", "AI search visibility", "Campaigns", "Analytics"],
    responsibilities: [
      "Own positioning and messaging for each buyer and industry: the problem, the evidence Techsider can show, and the next step.",
      "Run the insights programme: plan, brief, edit and publish articles, guides and demos that show how the work is done.",
      "Grow visibility in search engines and AI assistants, and measure where Techsider is found and cited.",
      "Plan campaigns and events for priority sectors and regions, and pass each qualified conversation to the engineer who'll lead the work.",
      "Use AI tools to draft content, with a person checking accuracy, voice and the site's claim rules before anything is published.",
      "Track what produces enquiries and Fit Calls, and stop what doesn't.",
    ],
    bring: [
      "Experience marketing technical or professional services to business buyers.",
      "Writing that is clear, specific and checkable, and the discipline to cut a claim you can't support.",
      "Hands-on search and content experience, including how AI assistants find and cite sources.",
      "Comfort with analytics: you set up the measure before the campaign, and report what it shows.",
      "Enough technical curiosity to understand retrieval, agents and evaluation, and to explain them to buyers.",
    ],
    terms: PAID,
  },
  {
    id: "client-service-officer",
    title: "Client Service Officer",
    tagline: "Answer fast. Close the loop.",
    description:
      "Be the first person an enquirer reaches. You answer and route every enquiry now, and as client systems go live you handle support requests, onboarding and follow-up, so every question reaches the right person and is closed. You keep help content current, so common questions are answered the first time.",
    tags: ["Client communication", "Triage", "Support tooling", "Knowledge base", "Follow-through"],
    responsibilities: [
      "Answer enquiries from the website and email, book Fit Calls and follow up.",
      "As client systems go live, log, triage and escalate support requests within the response times each contract sets.",
      "Watch how those systems serve their users, such as escalations, refusals and complaints, and raise patterns with the engineer responsible.",
      "Keep help content, FAQs and runbook notes current, so common questions are answered the first time.",
      "Help onboard client staff: schedule training, share guides and check in after launch.",
      "Route privacy, security and data requests to the right person the same day.",
    ],
    bring: [
      "Experience in client service or support, ideally for software or professional services.",
      "Clear, warm written English, because most of the work happens in writing.",
      "A habit of closing loops: you track every request until it's resolved.",
      "Comfort with support and ticketing tools, and curiosity about how AI systems behave.",
      "Judgement about when to escalate, and discretion with confidential information.",
    ],
    terms: PAID,
  },
  {
    id: "ai-governance-and-risk-specialist",
    title: "AI Governance & Risk Specialist",
    tagline: "Know the rules. Keep the work inside them.",
    description:
      "Keep what Techsider builds, and what it says, within the rules of every place it's used. You map each engagement to the laws and standards it may touch, prepare the evidence clients' risk teams draw on for their impact assessments, and keep the site's regulatory references current. You flag what a client's own lawyers need to confirm.",
    tags: ["Privacy", "AI governance", "Risk assessment", "Regulatory research", "Plain-English writing"],
    responsibilities: [
      "Map each engagement to the rules it may touch where it's used, and flag what the client's own lawyers need to confirm. These include privacy law such as the Australian Privacy Principles and the GDPR, sector rules, and AI-specific law such as the EU AI Act.",
      "Prepare the evidence clients' risk and legal teams draw on for their impact assessments and AI registers, such as data-flow maps, test results and failure lists.",
      "Review data-transfer terms, region notes and vendor terms for each engagement.",
      "Keep the site's regulatory references and their review dates current.",
      "Brief engineers and evaluators on what must be tested and recorded, and bring in external legal advice when a question needs it.",
    ],
    bring: [
      "Experience in privacy, technology risk or regulatory work.",
      "The ability to read legislation and standards closely, and to say what they do and don't require.",
      "Plain-English writing: you can turn a regulation into a checklist an engineer will use.",
      "Familiarity with AI governance frameworks such as ISO/IEC 42001 or the NIST AI RMF.",
      "Judgement about when a question needs a lawyer.",
    ],
    terms: PAID,
  },
];

const P1 =
  "Techsider Pty Ltd (ABN 12 636 205 868), headquartered in Sydney, Australia, collects what you send when you apply: your name, contact details, CV, note and links, and anything else you choose to include. We use it to assess your application and to contact you about it. If you don't include your contact details and CV, we can't consider your application.";
const P2 =
  "Applications arrive in our Lark Suite mailbox, and only the people who handle applications and decide on roles see them. Lark Suite, and some of those people, may handle your information outside Australia; the countries are not yet confirmed. We keep applications for 12 months after we decide, then delete them, or sooner if you ask.";
const P3 =
  "We don't use AI to score or reject applications; a person reads every one. To see, correct or delete your application, or to withdraw it, email admin@techsider.com.au. If you're unhappy with how we've handled it, email us first so we can try to put it right. You can also complain to the Office of the Australian Information Commissioner, to the data protection authority where you live or work if you're in the EU, or to the Information Commissioner's Office if you're in the UK.";

const MAILTOS = [
  "mailto:admin@techsider.com.au?subject=Application%3A%20Forward%20Deployed%20Engineer",
  "mailto:admin@techsider.com.au?subject=Application%3A%20Marketing%20Strategist%20(AI)",
  "mailto:admin@techsider.com.au?subject=Application%3A%20Client%20Service%20Officer",
  "mailto:admin@techsider.com.au?subject=Application%3A%20AI%20Governance%20%26%20Risk%20Specialist",
];

const withRoles = (items) => ({ ...CAREERS, roles: { ...CAREERS.roles, items } });
const withNotice = (paragraphs) => ({ ...CAREERS, notice: { ...CAREERS.notice, paragraphs } });

// ---------------------------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------------------------

test("CAREERS parses with careersData (careers spec §9)", () => {
  const parsed = careersData.safeParse(CAREERS);
  assert.ok(parsed.success, parsed.success ? "" : JSON.stringify(parsed.error.issues, null, 2));
});

test("the hero is spec §4.1's, with the highlight one whole word of the title", () => {
  assert.deepEqual(CAREERS.hero, {
    eyebrow: "Careers",
    title: "Own the work. Grow with the firm.",
    highlight: "firm",
    sub: "Techsider is an AI automation company headquartered in Sydney, Australia, building for organisations in any country. We're forming the team that does the work, and every role below is open to people wherever we can lawfully engage them.",
    primary: { label: "See the roles", href: "#roles" },
    secondary: { label: "How to apply", href: "#apply" },
  });
  assert.ok(CAREERS.hero.title.split(/[\s.]+/).includes(CAREERS.hero.highlight));
});

test("Built like a professional firm: both paragraphs verbatim and the three principles exact (spec §4.2)", () => {
  assert.equal(CAREERS.firm.heading, "Built like a professional firm");
  assert.deepEqual(CAREERS.firm.paragraphs, [
    "Techsider is built like a professional firm. People who lead client work well can become partners, with responsibility for clients and a real say in how the firm is run. Forward Deployed Engineers join on the partner track, and people in any other role can move onto it. We agree each partner's terms individually, in writing.",
    'Techsider Pty Ltd is a company, not a partnership. "Partner" is a role title. It doesn\'t make anyone a legal partner, and on its own it carries no ownership.',
  ]);
  assert.deepEqual(CAREERS.firm.principles, [
    { title: "Own the result.", body: "The person who scopes the work builds it, tests it and answers for it once it's live." },
    {
      title: "Measure before you claim.",
      body: "Every system we build is tested against thresholds agreed before testing starts, and every claim we make has to be one we can back.",
    },
    { title: "Use AI with care.", body: "We use AI tools every day, and a person checks what they produce before it reaches a client." },
  ]);
});

test("Where you could contribute: the heading, the lede and the where-you-work line (spec §4.3)", () => {
  assert.equal(CAREERS.roles.heading, "Where you could contribute");
  assert.equal(CAREERS.roles.lede, "Each application is an expression of interest: tell us what you'd bring. We'd welcome several Forward Deployed Engineers.");
  assert.equal(CAREERS.roles.where, "Remote, from anywhere we can lawfully engage you, with travel to client sites when an engagement needs it.");
});

test("the four roles, in spec §4.3's order, each with its card copy, lists and terms exactly as spec §4.3–§4.4 give them", () => {
  assert.deepEqual(CAREERS.roles.items.map((r) => r.id), ["forward-deployed-engineer", "marketing-strategist-ai", "client-service-officer", "ai-governance-and-risk-specialist"]);
  for (const r of CAREERS.roles.items) assert.equal(r.id, slugify(r.title));
  assert.deepEqual(CAREERS.roles.items, ROLES);
  // Only the Forward Deployed Engineer carries a label.
  assert.deepEqual(CAREERS.roles.items.map((r) => r.label), ["Partner track", undefined, undefined, undefined]);
});

test("How the role works: the partner-track line for the Forward Deployed Engineer, the paid line for the other three (spec §4.4, §12 R1)", () => {
  assert.equal(CAREERS.roles.items[0].terms, "Partner track from the start. Partners are rewarded differently from the other roles: we explain how before any interview, and agree it individually, in writing. Access to a client's systems is agreed in that client's contract, including where you work from.");
  for (const r of CAREERS.roles.items.slice(1)) assert.equal(r.terms, "A paid role, with terms agreed individually. The partner track is open to you.");
});

test("How to apply: the opening with its {email} token, what to send, what to leave out and what happens next (spec §4.5)", () => {
  assert.deepEqual(CAREERS.apply, {
    heading: "How to apply",
    opening: "Email {email} with the role in the subject line. Each role's Apply by email link fills it in for you. Before you send it, read the applicant privacy notice below.",
    sendHeading: "What to send",
    send: [
      "Your CV, as a PDF.",
      "A short note: why this role, and what you've built or done that shows it.",
      "Links to your work, such as GitHub, a portfolio or LinkedIn.",
    ],
    leaveOut: "Please leave out identity documents, a photo, your date of birth, health or other sensitive information, and details of your current or past pay. We won't ask about your current or past pay.",
    rightToWork: "You'll need the right to work in the country you work from.",
    nextHeading: "What happens next",
    next: "A person reads every application. If there's a fit, we'll arrange a conversation about the work and the terms. Sending an application doesn't guarantee a role.",
  });
});

test("the applicant privacy notice is stored with its tokens, and the retention flag sits on its own line beside P2 (spec §4.6)", () => {
  assert.equal(CAREERS.notice.heading, "Applicant privacy notice");
  assert.deepEqual(CAREERS.notice.paragraphs, [
    "{legalName}{abnPart}, headquartered in {hq}, collects what you send when you apply: your name, contact details, CV, note and links, and anything else you choose to include. We use it to assess your application and to contact you about it. If you don't include your contact details and CV, we can't consider your application.",
    "Applications arrive in our {provider} mailbox, and only the people who handle applications and decide on roles see them. {provider}, and some of those people, may handle your information outside Australia; {storage}. We keep applications for 12 months after we decide, then delete them, or sooner if you ask.",
    "We don't use AI to score or reject applications; a person reads every one. To see, correct or delete your application, or to withdraw it, email {email}. If you're unhappy with how we've handled it, email us first so we can try to put it right. You can also complain to the Office of the Australian Information Commissioner, to the data protection authority where you live or work if you're in the EU, or to the Information Commissioner's Office if you're in the UK.",
  ]);
  const source = readFileSync(join(ROOT, "src/data/careers.ts"), "utf8");
  assert.match(source, /^\s*\/\/ ⚑ owner: confirm the 12-month retention period for applications \(careers spec §4\.6\)$/m);
  const lines = source.split("\n");
  const flag = lines.findIndex((l) => /^\s*\/\/ ⚑ owner: confirm the 12-month retention period/.test(l));
  assert.match(lines[flag + 1], /^\s*"Applications arrive in our \{provider\} mailbox/, "the retention flag sits directly above P2");
  assert.equal((source.match(/⚑/g) ?? []).length, 1, "careers.ts carries the one retention flag and no other");
});

test("careers.ts opens with spec §5's four-line header", () => {
  const source = readFileSync(join(ROOT, "src/data/careers.ts"), "utf8");
  assert.equal(source.split("\n").slice(0, 4).join("\n"), [
    "// The careers page's copy (careers spec §4), validated by careersData in src/content/page-schemas.ts.",
    "// Copy rules: careers spec §5: no terms of engagement, no team size or names, no client claims, no",
    "// reach words, and no check 04 or check 11 phrase or S1 string. Checks 04 and 11 scan this file,",
    "// comments included, so this comment quotes none of them.",
  ].join("\n"));
});

test("careersData bounds the lists: 3–6 tags, 5–6 responsibilities, 5–6 bring items, 1–8 roles, and no unknown key (spec §9)", () => {
  const role = CAREERS.roles.items[1];
  assert.ok(careersData.safeParse({ ...CAREERS, roles: { ...CAREERS.roles, items: [{ ...CAREERS.roles.items[1], bring: CAREERS.roles.items[1].bring.slice(0, 4) }] } }).success === false);
  const bad = {
    "4 bring items": withRoles([{ ...role, bring: role.bring.slice(0, 4) }]),
    "7 bring items": withRoles([{ ...role, bring: [...role.bring, "x", "y"] }]),
    "4 responsibilities": withRoles([{ ...role, responsibilities: role.responsibilities.slice(0, 4) }]),
    "7 responsibilities": withRoles([{ ...role, responsibilities: [...role.responsibilities, "x"] }]),
    "2 tags": withRoles([{ ...role, tags: role.tags.slice(0, 2) }]),
    "7 tags": withRoles([{ ...role, tags: [...role.tags, "x", "y"] }]),
    "no role": withRoles([]),
    "9 roles": withRoles(Array.from({ length: 9 }, () => role)),
    "a role id that isn't a slug": withRoles([{ ...role, id: "Marketing Strategist" }]),
    "an unknown role key": withRoles([{ ...role, extra: "x" }]),
    "a hero link that isn't an anchor": { ...CAREERS, hero: { ...CAREERS.hero, primary: { label: "x", href: "/roles/" } } },
    "one firm paragraph": { ...CAREERS, firm: { ...CAREERS.firm, paragraphs: CAREERS.firm.paragraphs.slice(0, 1) } },
    "two principles": { ...CAREERS, firm: { ...CAREERS.firm, principles: CAREERS.firm.principles.slice(0, 2) } },
    "nothing to send": { ...CAREERS, apply: { ...CAREERS.apply, send: [] } },
    "four notice paragraphs": withNotice([...CAREERS.notice.paragraphs, "x"]),
    "an unknown top-level key": { ...CAREERS, team: [] },
  };
  for (const [label, data] of Object.entries(bad)) assert.equal(careersData.safeParse(data).success, false, label);
  assert.ok(careersData.safeParse(withRoles([role])).success, "one role is enough");
});

// ---------------------------------------------------------------------------------------------
// careersView
// ---------------------------------------------------------------------------------------------

test("careersView: cards numbered 01–04 in data order, each with its anchor and its per-role mailto (spec §3)", () => {
  const view = careersView(CAREERS, siteContext(false), CONTACT);
  assert.deepEqual(view.roles.cards.map((c) => [c.number, c.href]), [["01", "#forward-deployed-engineer"], ["02", "#marketing-strategist-ai"], ["03", "#client-service-officer"], ["04", "#ai-governance-and-risk-specialist"]]);
  assert.deepEqual(view.roles.cards.map((c) => c.mailto), [
    "mailto:admin@techsider.com.au?subject=Application%3A%20Forward%20Deployed%20Engineer",
    "mailto:admin@techsider.com.au?subject=Application%3A%20Marketing%20Strategist%20(AI)",
    "mailto:admin@techsider.com.au?subject=Application%3A%20Client%20Service%20Officer",
    "mailto:admin@techsider.com.au?subject=Application%3A%20AI%20Governance%20%26%20Risk%20Specialist",
  ]);
  // Each subject decodes back to "Application: " and the title, "&" and "(AI)" included.
  for (const [i, c] of view.roles.cards.entries()) {
    assert.equal(decodeURIComponent(c.mailto.split("?subject=")[1]), `Application: ${ROLES[i].title}`);
  }
  assert.deepEqual(view.roles.cards, ROLES.map((r, i) => ({
    number: String(i + 1).padStart(2, "0"), id: r.id, href: `#${r.id}`, mailto: MAILTOS[i], title: r.title,
    ...(r.label ? { label: r.label } : {}), tagline: r.tagline, description: r.description, tags: r.tags,
  })));
  assert.ok(!("label" in view.roles.cards[1]), "a role without a label gives a card without one");
});

test("careersView: one section per role, in order, with its number, lists and terms, and the same anchor and mailto as its card", () => {
  const view = careersView(CAREERS, siteContext(false), CONTACT);
  assert.deepEqual(view.sections, ROLES.map((r, i) => ({
    number: String(i + 1).padStart(2, "0"), id: r.id, href: `#${r.id}`, mailto: MAILTOS[i], title: r.title, ...(r.label ? { label: r.label } : {}),
    tagline: r.tagline, responsibilities: r.responsibilities, bring: r.bring, terms: r.terms,
  })));
});

test("careersView: the hero and the firm pass through; the roles keep their heading, lede and where-you-work line", () => {
  const view = careersView(CAREERS, siteContext(false), CONTACT);
  assert.deepEqual(view.hero, CAREERS.hero);
  assert.deepEqual(view.firm, CAREERS.firm);
  assert.equal(view.roles.heading, "Where you could contribute");
  assert.equal(view.roles.lede, CAREERS.roles.lede);
  assert.equal(view.roles.where, CAREERS.roles.where);
});

test("careersView: the notice and the apply opening are filled from SITE, CONTACT and the SiteContext (spec §4.5, §4.6)", () => {
  const view = careersView(CAREERS, siteContext(false), CONTACT);
  assert.equal(view.notice.heading, "Applicant privacy notice");
  assert.equal(view.notice.paragraphs[0], "Techsider Pty Ltd (ABN 12 636 205 868), headquartered in Sydney, Australia, collects what you send when you apply: your name, contact details, CV, note and links, and anything else you choose to include. We use it to assess your application and to contact you about it. If you don't include your contact details and CV, we can't consider your application.");
  assert.equal(view.notice.paragraphs[1], "Applications arrive in our Lark Suite mailbox, and only the people who handle applications and decide on roles see them. Lark Suite, and some of those people, may handle your information outside Australia; the countries are not yet confirmed. We keep applications for 12 months after we decide, then delete them, or sooner if you ask.");
  assert.equal(view.notice.paragraphs[2], "We don't use AI to score or reject applications; a person reads every one. To see, correct or delete your application, or to withdraw it, email admin@techsider.com.au. If you're unhappy with how we've handled it, email us first so we can try to put it right. You can also complain to the Office of the Australian Information Commissioner, to the data protection authority where you live or work if you're in the EU, or to the Information Commissioner's Office if you're in the UK.");
  assert.deepEqual(view.notice.paragraphs, [P1, P2, P3]);
  assert.equal(view.apply.opening, "Email admin@techsider.com.au with the role in the subject line. Each role's Apply by email link fills it in for you. Before you send it, read the applicant privacy notice below.");
  assert.deepEqual({ ...view.apply, opening: CAREERS.apply.opening }, CAREERS.apply, "the rest of How to apply passes through");
  for (const s of [...view.notice.paragraphs, view.apply.opening]) assert.doesNotMatch(s, /[{}]/);
});

test("careersView: every address comes from the SiteContext, never a literal, so the gallery shows its fixture address (spec §3)", () => {
  const site = fixtureSite;
  const view = careersView(CAREERS, site, CONTACT);
  assert.equal(view.roles.cards[3].mailto, "mailto:fixture@example.com?subject=Application%3A%20AI%20Governance%20%26%20Risk%20Specialist");
  assert.deepEqual(view.sections.map((s) => s.mailto), view.roles.cards.map((c) => c.mailto));
  assert.ok(view.apply.opening.startsWith("Email fixture@example.com with the role"));
  assert.ok(view.notice.paragraphs[2].includes("email fixture@example.com."));
  assert.ok(!JSON.stringify(view).includes(SITE.email), "the real address leaks into a fixture view");
});

test("careersView: the storage clause follows the Trust table's row for the email provider (spec §4.6)", () => {
  // storage clause follows the Trust table's row
  const confirmed = { ...CONTACT, subProcessors: CONTACT.subProcessors.map((s) => s.entity === "Lark Suite" ? { ...s, country: "Singapore" } : s) };
  assert.match(careersView(CAREERS, siteContext(false), confirmed).notice.paragraphs[1], /outside Australia; its storage country is Singapore\./);
  // The provider's own country field isn't what the clause reads: the Trust table's row is.
  const providerOnly = { ...CONTACT, emailProvider: { ...CONTACT.emailProvider, country: "Singapore" } };
  assert.match(careersView(CAREERS, siteContext(false), providerOnly).notice.paragraphs[1], /outside Australia; the countries are not yet confirmed\./);
  // Any other shape of the row's country fails the build instead of misreading (carried minor M11).
  const withCountry = (country) => ({ ...CONTACT, subProcessors: CONTACT.subProcessors.map((s) => s.entity === "Lark Suite" ? { ...s, country } : s) });
  for (const country of ["Storage countries not yet confirmed", "To be confirmed", "Confirmation pending", "Singapore and the United States", "Singapore or Japan", "Singapore, Japan"]) {
    assert.throws(() => careersView(CAREERS, siteContext(false), withCountry(country)), /neither one place nor "Not yet confirmed/, country);
  }
  assert.match(careersView(CAREERS, siteContext(false), withCountry("Not yet confirmed with Lark Suite")).notice.paragraphs[1], /outside Australia; the countries are not yet confirmed\./);
});

test("careersView: the ABN part drops while SITE.abn is null, as hqLine() does (spec §4.6)", () => {
  const saved = SITE.abn;
  try {
    SITE.abn = null;
    assert.ok(careersView(CAREERS, siteContext(false), CONTACT).notice.paragraphs[0].startsWith("Techsider Pty Ltd, headquartered in Sydney, Australia, collects"));
  } finally {
    SITE.abn = saved;
  }
});

test("careersView: fails the build on an empty, duplicated or mis-slugged role list, an unknown or unfilled token, or no sub-processor row (spec §9)", () => {
  // guards
  assert.throws(() => careersView({ ...CAREERS, roles: { ...CAREERS.roles, items: [] } }, siteContext(false), CONTACT), /no role/i);
  assert.throws(() => careersView({ ...CAREERS, roles: { ...CAREERS.roles, items: [CAREERS.roles.items[0], CAREERS.roles.items[0]] } }, siteContext(false), CONTACT), /duplicate/i);
  assert.throws(() => careersView({ ...CAREERS, roles: { ...CAREERS.roles, items: [{ ...CAREERS.roles.items[0], id: "fde" }] } }, siteContext(false), CONTACT), /slugify/i);
  assert.throws(() => careersView({ ...CAREERS, notice: { ...CAREERS.notice, paragraphs: ["{nope}", CAREERS.notice.paragraphs[1], CAREERS.notice.paragraphs[2]] } }, siteContext(false), CONTACT), /token/i);
  assert.throws(() => careersView(CAREERS, siteContext(false), { ...CONTACT, subProcessors: [] }), /sub-processor/i);
  // A stray brace is a token left unfilled; an unknown token in the apply opening fails too.
  assert.throws(() => careersView(withNotice([CAREERS.notice.paragraphs[0], "A { stray brace.", CAREERS.notice.paragraphs[2]]), siteContext(false), CONTACT), /token/i);
  assert.throws(() => careersView({ ...CAREERS, apply: { ...CAREERS.apply, opening: "Email {mail}." } }, siteContext(false), CONTACT), /unknown token \{mail\}/);
  // An inherited key is still an unknown token (carried minor M2).
  assert.throws(() => careersView(withNotice(["{constructor}", CAREERS.notice.paragraphs[1], CAREERS.notice.paragraphs[2]]), siteContext(false), CONTACT), /unknown token \{constructor\} in notice paragraph 1/);
  // A role whose title drifts from its id fails, so the anchor always matches the heading.
  assert.throws(() => careersView(withRoles([{ ...CAREERS.roles.items[3], title: "AI Governance and Risk Lead" }]), siteContext(false), CONTACT), /slugify/i);
  // The notice is three paragraphs.
  assert.throws(() => careersView(withNotice(CAREERS.notice.paragraphs.slice(0, 2)), siteContext(false), CONTACT), /three paragraphs/i);
});

// ---------------------------------------------------------------------------------------------
// The built page (dist/careers/index.html) and where the site links to it. Run `npm run build`
// (and `npm run build:preview` for the gallery page) first.
// ---------------------------------------------------------------------------------------------

const BUILT = join(ROOT, "dist/careers/index.html");
const GALLERY_PAGE = join(ROOT, "dist-preview/preview/templates/careers/index.html");
/** Text as a browser shows it inline: tags dropped without adding spaces, entities decoded, whitespace collapsed. */
const textOf = (html) => decodeEntities(html.replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();
const mainOf = (html) => html.slice(html.indexOf("<main"), html.indexOf("</main>"));
const byId = (html, id) => elements(html, (t) => t.attrs.id === id);
const tagged = (html, name) => elements(html, (t) => t.name === name);

/** The built page, asserted present rather than skipped when the build is missing. */
function builtPage() {
  assert.ok(existsSync(BUILT), "dist/careers/index.html is missing: run `npm run build` first");
  const html = readFileSync(BUILT, "utf8");
  return { html, main: mainOf(html) };
}

test("built page: spec §3's sections in order, one h1 with 'firm' highlighted, and the full heading outline", () => {
  const { main } = builtPage();
  // section order
  const ids = [...main.matchAll(/<section[^>]*\sid="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(ids.filter((id) => ["firm", "roles", "forward-deployed-engineer", "marketing-strategist-ai", "client-service-officer", "ai-governance-and-risk-specialist", "apply"].includes(id)),
    ["firm", "roles", "forward-deployed-engineer", "marketing-strategist-ai", "client-service-officer", "ai-governance-and-risk-specialist", "apply"]);
  // h1 and highlight
  assert.equal(textOf(main.match(/<h1[\s\S]*?<\/h1>/)[0]), "Own the work. Grow with the firm.");
  assert.equal((main.match(/<h1\b/g) ?? []).length, 1, "one h1");
  assert.deepEqual([...main.matchAll(/class="[^"]*\bhl\b[^"]*"[^>]*>([^<]*)</g)].map((m) => m[1]), ["firm"]);
  // Every heading, in order, at its level (spec §3's table): headings never skip a level.
  const outline = elements(main, (t) => /^h[1-6]$/.test(t.name)).map((h) => `h${h.name[1]} ${textOf(h.inner)}`);
  assert.deepEqual(outline, [
    "h1 Own the work. Grow with the firm.",
    "h2 Built like a professional firm", "h3 Own the result.", "h3 Measure before you claim.", "h3 Use AI with care.",
    "h2 Where you could contribute", ...ROLES.map((r) => `h3 ${r.title}`),
    ...ROLES.flatMap((r) => [`h2 ${r.title}`, "h3 Responsibilities", "h3 What you bring"]),
    "h2 How to apply", "h3 What to send", "h3 What happens next", "h3 Applicant privacy notice",
  ]);
  const levels = outline.map((h) => Number(h[1]));
  assert.deepEqual(levels.flatMap((l, i) => (i > 0 && l > levels[i - 1] + 1 ? [i] : [])), [], "a heading skips a level");
});

test("built page: the hero's eyebrow, sub and two calls to action, and the breadcrumb Home › About › Careers", () => {
  const { main } = builtPage();
  const hero = elements(main, (t) => "data-page-hero" in t.attrs)[0];
  assert.ok(hero, "no hero");
  // The eyebrow's brackets are aria-hidden decoration; its words are spec §4.1's.
  const eyebrow = elements(hero.inner, (t) => t.attrs.class === "page-hero-eyebrow")[0];
  assert.equal(textOf(eyebrow.inner.replace(/<span aria-hidden="true"[^>]*>[^<]*<\/span>/g, "")), "Careers");
  assert.equal(textOf(elements(hero.inner, (t) => t.attrs.class === "page-hero-sub")[0].inner), CAREERS.hero.sub);
  const ctas = elements(hero.inner, (t) => "data-cta-links" in t.attrs)[0];
  assert.deepEqual(tagged(ctas.inner, "a").map((a) => [textOf(a.inner), a.attrs.href]), [["See the roles", "#roles"], ["How to apply", "#apply"]]);
  const crumb = elements(main, (t) => t.name === "nav" && t.attrs["aria-label"] === "Breadcrumb")[0];
  assert.deepEqual(tagged(crumb.inner, "li").map((li) => textOf(li.inner).replace(/^\/\s*/, "")), ["Home", "About", "Careers"]);
  assert.deepEqual(hrefsIn(crumb.inner), ["/", "/about/"]);
  const list = [...main.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1])).find((j) => j["@type"] === "BreadcrumbList");
  assert.deepEqual(list.itemListElement.map((i) => [i.name, i.item]), [
    ["Home", "https://techsider.com.au/"], ["About", "https://techsider.com.au/about/"], ["Careers", "https://techsider.com.au/careers/"],
  ]);
});

test("built page: the firm's two paragraphs and three principles, the lede and the where-you-work line", () => {
  const { main } = builtPage();
  const firm = textOf(byId(main, "firm")[0].inner);
  for (const s of [...CAREERS.firm.paragraphs, ...CAREERS.firm.principles.flatMap((p) => [p.title, p.body])]) assert.ok(firm.includes(s), s);
  const roles = textOf(byId(main, "roles")[0].inner);
  for (const s of [CAREERS.roles.lede, CAREERS.roles.where]) assert.ok(roles.includes(s), s);
});

test("built page: four cards numbered 01–04, each with its copy, its anchor and its mailto, and both links described by the card title", () => {
  const { html, main } = builtPage();
  // cards: numbers, hrefs, mailtos, aria-describedby on the repeated links
  for (const [n, id, subject] of [["01", "forward-deployed-engineer", "Forward%20Deployed%20Engineer"], ["02", "marketing-strategist-ai", "Marketing%20Strategist%20(AI)"], ["03", "client-service-officer", "Client%20Service%20Officer"], ["04", "ai-governance-and-risk-specialist", "AI%20Governance%20%26%20Risk%20Specialist"]]) {
    assert.ok(main.includes(`>${n}<`), `card ${n} shows its number`);
    assert.match(main, new RegExp(`<a[^>]*href="#${id}"[^>]*aria-describedby="[^"]+"`));
    assert.ok(main.includes(`href="mailto:admin@techsider.com.au?subject=Application%3A%20${subject}"`), `${id} mailto`);
  }
  // every aria-describedby resolves to an element on the page
  for (const m of main.matchAll(/aria-describedby="([^"]+)"/g)) for (const ref of m[1].split(/\s+/)) assert.ok(html.includes(`id="${ref}"`), `aria-describedby ${ref} resolves`);
  // Each card, in order: its number, title, label (the Forward Deployed Engineer only), tagline,
  // description, the tags joined by " · ", then "Read the role" and "Apply by email".
  const roles = byId(main, "roles")[0].inner;
  const cards = tagged(tagged(roles, "ol")[0].inner, "li");
  assert.equal(cards.length, 4);
  for (const [i, card] of cards.entries()) {
    const r = ROLES[i];
    const expected = [String(i + 1).padStart(2, "0"), r.title, ...(r.label ? [r.label] : []), r.tagline, r.description, r.tags.join(" · "), "Read the role Apply by email"];
    assert.equal(visibleText(card.inner).trim().replace(/\s+/g, " "), expected.join(" "), r.id);
  }
  // The repeated link texts name their role through aria-describedby: a card's links point at its
  // title, a role section's Apply link at its heading. No hidden text (go-global F16).
  const titleOf = (id) => textOf(byId(html, id)[0]?.inner ?? "");
  const links = tagged(main, "a");
  const named = (label) => links.filter((a) => textOf(a.inner) === label).map((a) => [a.attrs.href, titleOf(a.attrs["aria-describedby"])]);
  assert.deepEqual(named("Read the role"), ROLES.map((r) => [`#${r.id}`, r.title]));
  assert.deepEqual(named("Apply by email"), [...ROLES.map((r, i) => [MAILTOS[i], r.title]), ...ROLES.map((r, i) => [MAILTOS[i], r.title])]);
  assert.ok(!/class="[^"]*\bsr-only\b/.test(main), "no visually hidden text");
});

test("built page: each role section has its label, tagline, two lists, its terms line and its two links", () => {
  const { main } = builtPage();
  for (const [i, r] of ROLES.entries()) {
    const section = byId(main, r.id)[0];
    assert.ok(section, r.id);
    assert.equal(section.attrs["aria-labelledby"], `${r.id}-heading`);
    const text = textOf(section.inner);
    for (const s of [r.tagline, r.terms]) assert.ok(text.includes(s), `${r.id}: ${s}`);
    assert.equal(text.includes("Partner track"), r.label === "Partner track", `${r.id}: label`);
    assert.deepEqual(tagged(section.inner, "h3").map((h) => textOf(h.inner)), ["Responsibilities", "What you bring"]);
    assert.deepEqual(tagged(section.inner, "ul").map((ul) => tagged(ul.inner, "li").map((li) => textOf(li.inner))), [r.responsibilities, r.bring]);
    assert.deepEqual(tagged(section.inner, "a").map((a) => [textOf(a.inner), a.attrs.href]), [["Apply by email", MAILTOS[i]], ["How we handle applications", "#applicant-privacy"]]);
  }
});

test("built page: How to apply, with the plain address, and the applicant notice with every token filled", () => {
  const { main } = builtPage();
  // privacy links, notice, plain email
  assert.ok((main.match(/href="#applicant-privacy"/g) ?? []).length >= 6, "How we handle applications links (after the cards, each role, the apply opening)");
  assert.ok(main.includes('id="applicant-privacy"'));
  assert.ok(textOf(main.slice(main.indexOf('id="apply"'))).includes("admin@techsider.com.au"));
  // Exactly six: "How we handle applications" after the cards and in each role section, and the
  // opening's "read the applicant privacy notice below".
  const links = tagged(main, "a");
  assert.deepEqual(links.filter((a) => a.attrs.href === "#applicant-privacy").map((a) => textOf(a.inner)), [
    ...Array(5).fill("How we handle applications"), "read the applicant privacy notice below",
  ]);
  const apply = byId(main, "apply")[0].inner;
  const paragraphs = (html) => tagged(html, "p").map((p) => textOf(p.inner));
  assert.ok(paragraphs(apply).includes("Email admin@techsider.com.au with the role in the subject line. Each role's Apply by email link fills it in for you. Before you send it, read the applicant privacy notice below."));
  assert.ok(!hrefsIn(apply).some((h) => h.startsWith("mailto:")), "the address in How to apply is plain text, not a link");
  assert.deepEqual(tagged(tagged(apply, "ul")[0].inner, "li").map((li) => textOf(li.inner)), CAREERS.apply.send);
  for (const s of [CAREERS.apply.leaveOut, CAREERS.apply.rightToWork, CAREERS.apply.next]) assert.ok(paragraphs(apply).includes(s), s);
  // The notice: its h3, then P1–P3 with the tokens filled; it never reuses the enquiry form's notice.
  const notice = byId(main, "applicant-privacy")[0];
  assert.deepEqual(tagged(notice.inner, "h3").map((h) => [h.attrs.id, textOf(h.inner)]), [["applicant-privacy-heading", "Applicant privacy notice"]]);
  assert.deepEqual(paragraphs(notice.inner), [P1, P2, P3]);
  assert.ok(!main.includes("data-collection-notice") && !main.includes('id="enquiry-privacy"'));
});

test("built page: no JobPosting, the one minimal Organization, and its title and description from nav.ts", () => {
  const { html } = builtPage();
  // no JobPosting, one Organization
  assert.ok(!/"JobPosting"/.test(html));
  assert.equal((html.match(/"@type":"Organization"/g) ?? []).length, 1);
  assert.equal(html.match(/<title>([^<]*)<\/title>/)[1], "Careers | Techsider");
  assert.equal(
    decodeEntities(html.match(/<meta name="description" content="([^"]*)"/)[1]),
    "Careers at Techsider: Forward Deployed Engineers join on the partner track, alongside roles in marketing strategy, client service, and AI governance and risk.",
  );
});

test("built page: no partner-terms, size, reach or reply-time word in <main>, the title or the description (spec §5, §10)", () => {
  const { html, main } = builtPage();
  // word scan on <main>, title and description
  const visible = [textOf(main), visibleText(main), html.match(/<title>([^<]*)<\/title>/)[1], decodeEntities(html.match(/<meta name="description" content="([^"]*)"/)[1])].join(" ");
  for (const w of [/co-?founder/i, /\bfounder\b/i, /\bequity\b/i, /\bprofit/i, /\bsalary\b/i, /\bbuy[- ]in\b/i, /\binvest/i, /\bshares\b/i, /\bshareholding\b/i, /ownership percentage/i, /\bvesting\b/i, /\bvaluation\b/i, /\bunlimited\b/i, /\bheadcount\b/i, /\bsenior\b/i, /\bclearances?\b/i, /\bworldwide\b/i, /\bglobal\b/i, /\binternational\b/i, /\boverseas\b/i, /we reply within/i])
    assert.doesNotMatch(visible, w);
  // AI policies and registers are never a drafting duty: the one mention is the evidence clients'
  // teams draw on for "impact assessments and AI registers" (spec §5, §12 R2).
  const text = textOf(main);
  assert.doesNotMatch(text, /AI polic/i);
  assert.equal((text.match(/AI register/gi) ?? []).length, 1);
  assert.ok(text.includes("impact assessments and AI registers"));
});

test("placement: /careers/ is in the About menu, the footer's Company column, /llms.txt's Company section and the sitemap (spec §7)", () => {
  const llms = readFileSync(join(ROOT, "dist/llms.txt"), "utf8");
  assert.ok(llms.includes("(https://techsider.com.au/careers/)"));
  const company = llms.slice(llms.indexOf("## Company"), llms.indexOf("\n## ", llms.indexOf("## Company") + 1));
  // The link text is the page title without " | Techsider", and the note its meta description.
  assert.ok(company.includes("\n- [Careers](https://techsider.com.au/careers/): Careers at Techsider: Forward Deployed Engineers join on the partner track, alongside roles in marketing strategy, client service, and AI governance and risk.\n"), "Company section");
  assert.deepEqual([...company.matchAll(/\]\((https:[^)]+)\)/g)].map((m) => m[1]), ["https://techsider.com.au/about/", "https://techsider.com.au/careers/", "https://techsider.com.au/contact/"]);
  assert.ok(readFileSync(join(ROOT, "dist/sitemap-0.xml"), "utf8").includes("<loc>https://techsider.com.au/careers/</loc>"));
  const home = readFileSync(join(ROOT, "dist/index.html"), "utf8");
  const footer = tagged(home, "footer")[0];
  assert.ok(hrefsIn(footer.outer).includes("/careers/"), "the footer links /careers/");
  const company2 = hrefsIn(footer.outer);
  assert.deepEqual(company2.slice(company2.indexOf("/about/"), company2.indexOf("/about/") + 3), ["/about/", "/careers/", "/contact/"], "Company column order");
  assert.deepEqual(hrefsIn(byId(home, "nav-panel-about")[0].outer), ["/careers/", "/contact/", "/about/"], "the About menu: Careers and Contact, then the hub");
});

test("gallery: the careers specimen shows the fixture address, never the real one (careers Review Focus 5)", () => {
  assert.ok(existsSync(GALLERY_PAGE), "dist-preview/preview/templates/careers/index.html is missing: run `npm run build:preview` first");
  const html = readFileSync(GALLERY_PAGE, "utf8");
  const main = mainOf(html);
  assert.ok(main.includes('data-template="careers"'));
  // The gallery's shell (its footer) is the real site's; the template in <main> shows only the fixture address.
  assert.ok(!main.includes(SITE.email), "the real address is in the careers specimen");
  const mailtos = hrefsIn(main).filter((h) => h.startsWith("mailto:"));
  assert.ok(mailtos.length > 0 && mailtos.every((h) => h.startsWith("mailto:fixture@example.com?subject=Application%3A%20Fixture")), mailtos.join(", "));
  assert.ok(textOf(byId(main, "apply")[0].inner).includes("fixture@example.com"));
});

/** Spec §8: the three from/to phrase pairs the Sydney gate makes in one commit. */
const SYDNEY_GATE_PAIRS = [
  ["remotely from Sydney, under the data-transfer terms in your contract", "remotely, from the countries your contract names, under its data-transfer terms"],
  ["remotely from Sydney.", "remotely, from the countries your contract names."],
  ["Delivered remotely from Sydney; on-site visits by arrangement.", "Delivered remotely from Sydney and the countries your contract names; on-site visits by arrangement."],
];

test("README: the Sydney gate sits between Australian content and the demos, with its trigger and the three from/to pairs verbatim (spec §8)", () => {
  const readme = readFileSync(join(ROOT, "README.md"), "utf8");
  const heading = "### When someone outside Sydney first reaches a client's systems";
  assert.ok(readme.includes(heading));
  const start = readme.indexOf(heading);
  const headingsBefore = [...readme.slice(0, start).matchAll(/^#{2,3} .+$/gm)].map((m) => m[0]);
  assert.equal(headingsBefore.at(-1), "### Australian content, labelled", "the gate comes directly after Australian content, labelled");
  const end = readme.indexOf("\n### ", start + heading.length);
  assert.equal(readme.slice(end + 1).split("\n")[0], "### Demos and the checker", "the gate comes directly before Demos and the checker");
  const gate = readme.slice(start, end);
  assert.ok(gate.includes("the first time a person working outside Sydney gets access to a client's systems"), "the trigger");
  for (const s of [
    "remotely from Sydney, under the data-transfer terms in your contract", "remotely, from the countries your contract names, under its data-transfer terms",
    "remotely, from the countries your contract names.", "Delivered remotely from Sydney; on-site visits by arrangement.",
    "Delivered remotely from Sydney and the countries your contract names; on-site visits by arrangement.",
  ]) assert.ok(readme.includes(s), s);
  // Each pair is one line of the gate, in backticks, the old phrase before the new one.
  for (const [from, to] of SYDNEY_GATE_PAIRS) {
    const line = gate.split("\n").find((l) => l.includes(`\`${from}\``) && l.includes(`\`${to}\``)) ?? "";
    assert.ok(line && line.indexOf(`\`${from}\``) < line.indexOf(`\`${to}\``), `the gate doesn't change \`${from}\` to \`${to}\``);
  }
});

test("check 11 reads careers.ts as offer copy, so a pricing phrase or currency figure in it fails the build (spec §5, §9)", () => {
  assert.ok(OFFER_FILES.includes("src/data/careers.ts"), "11-pricing.mjs OFFER_FILES leaves out careers.ts");
  const r = result();
  scan(readFileSync(join(ROOT, "src/data/careers.ts"), "utf8"), "src/data/careers.ts", [], r, { lines: true, phrases: OFFER_RULES });
  assert.deepEqual(r.errors, []);
});
