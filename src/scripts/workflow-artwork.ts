// A fictional sample run; no network requests, real approvals or customer data.
const phases = [
  { key: "received", ms: 1400, current: 0, status: "Receiving request", step: "Receive request", description: "A sample document arrives.", last: "Source: shared inbox." },
  { key: "extract", ms: 1800, current: 1, status: "Extracting details", step: "Extract details", description: "Agreed fields are extracted.", last: "Preparing them for review." },
  { key: "check", ms: 1800, current: 2, status: "Checking rules", step: "Check business rules", description: "Fields are checked and matched.", last: "Approval is still required." },
  { key: "review", ms: 4200, current: 3, status: "Awaiting review", step: "Human approval", description: "Operations reviews the details.", last: "Updates wait for approval." },
  { key: "approved", ms: 1800, current: 3, status: "Approved", step: "Sample approval", description: "The example reviewer approves.", last: "The workflow can now continue." },
  { key: "update", ms: 1800, current: 4, status: "Preparing handoff", step: "Prepare handoff", description: "Approved details enter a review queue.", last: "The action is recorded." },
  { key: "complete", ms: 3200, current: 5, status: "Completed", step: "Run complete", description: "The sample workflow is complete.", last: "Every action has an audit trail." },
];
const cycle = phases.reduce((total, phase) => total + phase.ms, 0);

export function initWorkflowArtwork(figure: HTMLElement): void {
  const artwork = figure.querySelector<HTMLElement>("[data-workflow-artwork]");
  const toggle = figure.querySelector<HTMLButtonElement>("[data-workflow-toggle]");
  if (!artwork || !toggle || !("IntersectionObserver" in window)) return;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  let paused = false;
  let visible = false;
  let elapsed = 0;
  let last = 0;
  let frame = 0;
  let previous = "review";
  const write = (selector: string, value: string) => {
    const el = artwork.querySelector(selector);
    if (el) el.textContent = value;
  };
  const show = (phase: typeof phases[number]) => {
    if (phase.key === previous) return;
    previous = phase.key;
    artwork.dataset.workflowPhase = phase.key;
    artwork.querySelectorAll<SVGGElement>("[data-workflow-node]").forEach((node, i) => {
      const done = i < phase.current || (i === 3 && phase.key === "approved");
      node.dataset.state = done ? "complete" : i === phase.current ? (i === 3 ? "waiting" : "active") : "pending";
      const sub = node.querySelector("[data-node-sub]");
      if (i === 3 && sub) sub.textContent = done ? "Approved by reviewer" : "Awaiting review";
    });
    artwork.querySelectorAll<HTMLElement>("[data-mobile-step]").forEach((node, i) => {
      const done = i < phase.current || (i === 3 && phase.key === "approved");
      const state = done ? "complete" : i === phase.current ? (i === 3 ? "waiting" : "active") : "pending";
      node.dataset.state = state;
      const status = node.querySelector("[data-mobile-status]");
      if (status) status.textContent = state === "complete" ? "Complete" : state === "waiting" ? "Awaiting review" : state === "active" ? "In progress" : "Pending";
    });
    artwork.querySelectorAll<SVGGElement>("[data-workflow-connector]").forEach((line, i) => {
      line.toggleAttribute("data-connector-active", i === phase.current - 1 && phase.key !== "review" && phase.key !== "approved");
    });
    write("[data-run-status]", phase.status);
    write("[data-run-step]", phase.step);
    write("[data-run-description]", phase.description);
    write("[data-run-description-last]", phase.last);
    const statuses = [phase.current > 0 ? "Received" : "Receiving", phase.current > 1 ? "Processed" : "Pending", phase.current > 3 || phase.key === "approved" ? "Approved" : phase.current === 3 ? "Awaiting review" : "Pending"];
    artwork.querySelectorAll("[data-activity-status]").forEach((el, i) => { el.textContent = statuses[i]; });
    const details = [phase.current > 0 ? "Request received from shared inbox" : "Receiving a sample document", phase.current > 1 ? "Document analysed, key details extracted" : "Waiting for document extraction", statuses[2] === "Approved" ? "Example reviewer approved the details" : statuses[2] === "Pending" ? "Waiting for the preceding checks" : "Pending review by operations team"];
    artwork.querySelectorAll("[data-activity-description]").forEach((el, i) => { el.textContent = details[i]; });
    artwork.querySelectorAll<SVGGElement>("[data-workflow-activity]").forEach((el, i) => {
      el.dataset.state = statuses[i] === "Pending" ? "pending" : statuses[i] === "Awaiting review" ? "waiting" : "complete";
    });
  };
  const tick = (now: number) => {
    elapsed = (elapsed + (last ? now - last : 0)) % cycle;
    last = now;
    let end = 0;
    const phase = phases.find(p => { end += p.ms; return elapsed < end; }) ?? phases[0];
    show(phase);
    frame = requestAnimationFrame(tick);
  };
  const refresh = () => {
    cancelAnimationFrame(frame);
    last = 0;
    const running = visible && !paused && !reduced.matches && !document.hidden;
    artwork.dataset.workflowMotion = running ? "running" : "paused";
    toggle.hidden = reduced.matches;
    toggle.textContent = paused ? "Resume animation" : "Pause animation";
    toggle.setAttribute("aria-pressed", String(paused));
    if (reduced.matches) { elapsed = 0; show(phases[3]); }
    else if (running) frame = requestAnimationFrame(tick);
  };
  toggle.addEventListener("click", () => { paused = !paused; refresh(); });
  reduced.addEventListener("change", refresh);
  document.addEventListener("visibilitychange", refresh);
  new IntersectionObserver(entries => { visible = entries[0].isIntersecting; refresh(); }).observe(artwork);
  refresh();
}
