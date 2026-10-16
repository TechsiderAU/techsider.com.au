// The careers page (careers spec §3, §4, §10): its copy in src/data/careers.ts, the careersData
// schema that validates it, and careersView, which numbers the roles, derives each anchor and
// per-role email subject, and fills the applicant notice from the site's own records. Every
// visible string is pinned here exactly as spec §4 gives it, so a copy edit shows up as a diff.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { careersData } from "../src/content/page-schemas.ts";
import { CAREERS } from "../src/data/careers.ts";
import { CONTACT } from "../src/data/contact.ts";
import { SITE, slugify } from "../src/data/nav.ts";
import { siteContext } from "../src/lib/site.ts";
import { careersView } from "../src/lib/views/careers.ts";

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

test("careersView: one section per role, in order, with its lists, its terms and the same anchor and mailto as its card", () => {
  const view = careersView(CAREERS, siteContext(false), CONTACT);
  assert.deepEqual(view.sections, ROLES.map((r, i) => ({
    id: r.id, href: `#${r.id}`, mailto: MAILTOS[i], title: r.title, ...(r.label ? { label: r.label } : {}),
    tagline: r.tagline, tags: r.tags, responsibilities: r.responsibilities, bring: r.bring, terms: r.terms,
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
  const site = { ...siteContext(false), email: "fixture@example.com" };
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
  // A role whose title drifts from its id fails, so the anchor always matches the heading.
  assert.throws(() => careersView(withRoles([{ ...CAREERS.roles.items[3], title: "AI Governance and Risk Lead" }]), siteContext(false), CONTACT), /slugify/i);
  // The notice is three paragraphs.
  assert.throws(() => careersView(withNotice(CAREERS.notice.paragraphs.slice(0, 2)), siteContext(false), CONTACT), /three paragraphs/i);
});
