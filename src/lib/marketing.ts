// Business-facing introductions; detailed evidence and scope remain on the solution pages.
export const AUTOMATION = {
  title: "AI automation. Built for your business.",
  sub: "We design, build and support AI workflows that connect your systems and keep people in control.",
  capabilities: [
    {number: "③", title: "Workflow automation", body: "Connect tasks across your tools, with people approving the actions that matter.", art: "workflow" as const},
    {number: "①", title: "Document intelligence", body: "Turn documents into structured information your team can check and use.", art: "documents" as const},
    {number: "②", title: "Knowledge assistants", body: "Find answers in your organisation’s knowledge, with sources you can verify.", art: "knowledge" as const},
  ],
  process: [
    {title: "Map the workflow", body: "Find the manual work worth automating and check what your existing software can do."},
    {title: "Build and test", body: "Connect the systems, define approval steps and test against your own examples."},
    {title: "Run and improve", body: "Support your team, monitor changes and keep the workflow useful as your business evolves."},
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
