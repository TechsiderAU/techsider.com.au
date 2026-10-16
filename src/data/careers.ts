// The careers page's copy (careers spec §4), validated by careersData in src/content/page-schemas.ts.
// Copy rules: careers spec §5: no terms of engagement, no team size or names, no client claims, no
// reach words, and no check 04 or check 11 phrase or S1 string. Checks 04 and 11 scan this file,
// comments included, so this comment quotes none of them.
import type { CareersData } from "../content/page-schemas.ts";

const PAID = "A paid role, with terms agreed individually. The partner track is open to you.";

export const CAREERS: CareersData = {
  hero: {
    eyebrow: "Careers",
    title: "Own the work. Grow with the firm.",
    highlight: "firm",
    sub: "Techsider is an AI automation company headquartered in Sydney, Australia, building for organisations in any country. We're forming the team that does the work, and every role below is open to people wherever we can lawfully engage them.",
    primary: { label: "See the roles", href: "#roles" },
    secondary: { label: "How to apply", href: "#apply" },
  },
  firm: {
    heading: "Built like a professional firm",
    paragraphs: [
      "Techsider is built like a professional firm. People who lead client work well can become partners, with responsibility for clients and a real say in how the firm is run. Forward Deployed Engineers join on the partner track, and people in any other role can move onto it. We agree each partner's terms individually, in writing.",
      "Techsider Pty Ltd is a company, not a partnership. \"Partner\" is a role title. It doesn't make anyone a legal partner, and on its own it carries no ownership.",
    ],
    principles: [
      { title: "Own the result.", body: "The person who scopes the work builds it, tests it and answers for it once it's live." },
      {
        title: "Measure before you claim.",
        body: "Every system we build is tested against thresholds agreed before testing starts, and every claim we make has to be one we can back.",
      },
      { title: "Use AI with care.", body: "We use AI tools every day, and a person checks what they produce before it reaches a client." },
    ],
  },
  roles: {
    heading: "Where you could contribute",
    lede: "Each application is an expression of interest: tell us what you'd bring. We'd welcome several Forward Deployed Engineers.",
    where: "Remote, from anywhere we can lawfully engage you, with travel to client sites when an engagement needs it.",
    items: [
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
    ],
  },
  apply: {
    heading: "How to apply",
    // {email} is the SiteContext's address, shown as plain text.
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
  },
  notice: {
    heading: "Applicant privacy notice",
    // careersView (src/lib/views/careers.ts) fills the tokens (careers spec §4.6): {legalName} and
    // {abnPart} from SITE, {hq} from hqPlace(), {provider} from CONTACT.emailProvider, {storage} from
    // that provider's row in CONTACT.subProcessors, and {email} from the SiteContext.
    paragraphs: [
      "{legalName}{abnPart}, headquartered in {hq}, collects what you send when you apply: your name, contact details, CV, note and links, and anything else you choose to include. We use it to assess your application and to contact you about it. If you don't include your contact details and CV, we can't consider your application.",
      // ⚑ owner: confirm the 12-month retention period for applications (careers spec §4.6)
      "Applications arrive in our {provider} mailbox, and only the people who handle applications and decide on roles see them. {provider}, and some of those people, may handle your information outside Australia; {storage}. We keep applications for 12 months after we decide, then delete them, or sooner if you ask.",
      "We don't use AI to score or reject applications; a person reads every one. To see, correct or delete your application, or to withdraw it, email {email}. If you're unhappy with how we've handled it, email us first so we can try to put it right. You can also complain to the Office of the Australian Information Commissioner, to the data protection authority where you live or work if you're in the EU, or to the Information Commissioner's Office if you're in the UK.",
    ],
  },
};
