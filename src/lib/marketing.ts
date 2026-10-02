// Business-facing introductions; detailed evidence and scope remain on the solution pages.
export const AUTOMATION = {
  title: "Less admin. Faster operations. AI you can control.",
  sub: "We help Australian businesses automate repetitive document and inbox work. We connect the systems you already use, test the workflow on your examples, and support it after launch.",
  capabilities: [
    {number: "①", title: "Document workflows", body: "Turn incoming documents into structured information, source links and a review queue your team can check.", art: "documents" as const},
    {number: "③", title: "Inbox and request workflows", body: "Sort incoming work, prepare drafts and route exceptions to the right person, with approval before anything is sent or changed.", art: "workflow" as const},
    {number: "②", title: "Operational knowledge", body: "Help staff find the right procedure or answer, with sources they can verify and access controls respected.", art: "knowledge" as const},
  ],
  process: [
    {title: "Assess and prove", body: "Choose one repeated task, check your existing software, and test an approach on examples your team knows."},
    {title: "Implement", body: "Build the agreed workflow, define review and approval steps, and check it against the acceptance criteria."},
    {title: "Support and improve", body: "Help your team operate it, respond to changes, and review whether it continues to deliver value."},
  ],
  industries: {
    "Government": "Evaluate AI and streamline policy-led workflows.",
    "Financial services": "Test AI systems and organise evidence for review.",
    "Accounting": "Extract client documents into checkable registers.",
    "Education": "Help staff find answers in policies and procedures.",
    "Manufacturing": "Make operating procedures easier to find and use.",
    "Real estate": "Organise agreement data and simplify property administration.",
    "Healthcare": "Evaluate AI tools before relying on their outputs.",
    "Resources & energy": "Track approval conditions and surface current procedures.",
    "Legal & professional": "Evaluate legal AI and prepare work for human review.",
  } as Record<string,string>,
};
export function solutionArtwork(number: string): "documents" | "knowledge" | "workflow" | "hero" {
  return number === "①" ? "documents" : number === "②" ? "knowledge" : number === "③" ? "workflow" : "hero";
}

export const SOLUTION_GUIDES: Record<string, { title: string; href: string }[]> = {
  "draft-for-approval": [
    { title: "Choose your first AI workflow", href: "/insights/choose-first-ai-workflow/" },
    { title: "Understand an automation project's scope", href: "/insights/ai-automation-project-scope/" },
  ],
  "document-registers": [
    { title: "Choose a process with checkable inputs and outputs", href: "/insights/choose-first-ai-workflow/" },
    { title: "Check the AI in your practice software first", href: "/insights/ai-inside-your-practice-software/" },
  ],
  "knowledge-assistant": [
    { title: "Follow a fictional SOP-assistant evaluation", href: "/insights/water-utility-sop-assistant-scenario/" },
    { title: "Compare model hosting and processing locations", href: "/insights/sovereign-llm-hosting-decision-matrix/" },
  ],
  "ai-switch-on": [
    { title: "Assess the AI in your existing practice software", href: "/insights/ai-inside-your-practice-software/" },
    { title: "Understand implementation scope and responsibilities", href: "/insights/ai-automation-project-scope/" },
  ],
  "ai-evaluation": [
    { title: "Build an acceptance checklist before a Copilot rollout", href: "/insights/copilot-agents-leaving-pilot/" },
    { title: "Inspect the synthetic workflow control check", href: "/insights/choose-first-ai-workflow/#check-the-controls-before-connecting-systems" },
  ],
};
