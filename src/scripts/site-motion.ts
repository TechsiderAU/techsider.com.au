// Visible HTML is the baseline. Keep text contrast throughout the entrance animation.
export function initSiteMotion(): void {
  const root = document.documentElement;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const active = new Set<Animation>();
  const allowed = () => !reduced.matches && !document.hidden;
  const refresh = () => {
    root.dataset.siteMotion = allowed() ? "running" : "paused";
    if (!allowed()) {
      for (const animation of active) animation.cancel();
      active.clear();
    }
  };
  reduced.addEventListener("change", refresh);
  document.addEventListener("visibilitychange", refresh);
  refresh();
  const enter = (el: HTMLElement, distance: number, delay: number) => {
    const animation = el.animate([
      { transform: `translateY(${distance}px)` },
      { transform: "translateY(0)" },
    ], { duration: 560, delay, easing: "cubic-bezier(.22,1,.36,1)" });
    active.add(animation);
    animation.addEventListener("finish", () => active.delete(animation), { once: true });
  };
  // Play the headline entrance once.
  if (allowed()) document.querySelectorAll<HTMLElement>(".page-hero-copy > :is(.page-hero-eyebrow, .page-hero-title, .page-hero-sub)").forEach((el, i) => {
    if (typeof el.animate === "function") enter(el, 10, i * 45);
  });
  if (!("IntersectionObserver" in window)) return;

  const reveal = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      reveal.unobserve(entry.target);
      const el = entry.target as HTMLElement;
      el.dataset.motionSeen = "true";
      if (!allowed() || typeof el.animate !== "function" || entry.boundingClientRect.top < 96) continue;
      enter(el, 18, Number(el.dataset.motionOrder ?? 0) * 55);
    }
  }, { threshold: .08 });
  const targets = document.querySelectorAll<HTMLElement>("[data-section-header], .home-capabilities > li, .home-process > li, [data-link-card], [data-insight-card], [data-prompt-block]");
  for (const el of targets) {
    if (el.closest(".home-capabilities") && !el.matches(".capability")) continue;
    const siblings = [...(el.parentElement?.children ?? [])];
    el.dataset.motionOrder = String(Math.min(siblings.indexOf(el) % 3, 2));
    reveal.observe(el);
  }
}
