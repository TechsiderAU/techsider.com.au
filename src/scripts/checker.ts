// The "What you already pay for" checker (spec §8.7), in the browser. PlatformChecker renders every
// result at build time, hidden; this shows the ones for the ticked vendors and says what it shows
// in the status line. It reads nothing but the page: no network call, no storage.
// - Each [data-checker] root is enhanced once: the no-JS note hides, and the vendor form and the
//   results region show.
// - A tick or untick shows each [data-vendor] result whose vendor is ticked (every product and
//   feature listed under it), each [data-checker-kit] item whose category a ticked vendor has, and
//   each [data-checker-section] that has something to show (features, processing and build once
//   anything is ticked; kits once a kit item shows).
// - The status line (role="status", the results region's live part) changes once per tick, so a
//   screen reader hears one short summary, never the whole list again. The results themselves
//   aren't live.
// statusText() and EMPTY_STATUS are DOM-free, for node tests and for PlatformChecker's first render.

/** The status line before anything is ticked. */
export const EMPTY_STATUS = "Nothing ticked yet. Tick a vendor you pay for to see its AI features.";

const count = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`;

/**
 * The status line for `vendors` ticked vendors whose features are `included` included in a plan
 * and `addOn` sold as add-ons. Every vendor has at least one feature.
 */
export function statusText(vendors: number, included: number, addOn: number): string {
  if (vendors === 0) return EMPTY_STATUS;
  const features = included + addOn;
  let split: string;
  if (addOn === 0) split = features === 1 ? "included in the plans listed" : "all included in the plans listed";
  else if (included === 0) split = features === 1 ? "sold as an add-on" : "all sold as add-ons";
  else split = `${included} included in the plans listed and ${count(addOn, "add-on", "add-ons")}`;
  return `${count(vendors, "vendor", "vendors")} ticked: ${count(features, "AI feature", "AI features")}, ${split}.`;
}

const enhanced = new WeakSet<HTMLElement>();

function enhance(root: HTMLElement): void {
  const form = root.querySelector<HTMLElement>("[data-checker-form]");
  const results = root.querySelector<HTMLElement>("[data-checker-results]");
  const status = results?.querySelector<HTMLElement>("[data-checker-status]");
  if (!form || !results || !status || enhanced.has(root)) return;
  enhanced.add(root);

  const boxes = [...form.querySelectorAll<HTMLInputElement>("input[data-checker-vendor]")];
  const items = [...results.querySelectorAll<HTMLElement>("[data-vendor]")];
  const kits = [...results.querySelectorAll<HTMLElement>("[data-checker-kit]")];
  const sections = [...results.querySelectorAll<HTMLElement>("[data-checker-section]")];
  // Each vendor's features, counted once from the markup: [included, add-on].
  const tally = new Map<string, [number, number]>();
  for (const group of results.querySelectorAll<HTMLElement>("[data-checker-features][data-vendor]")) {
    const features = [...group.querySelectorAll<HTMLElement>("[data-checker-feature]")];
    const included = features.filter((f) => f.dataset.included === "included").length;
    tally.set(group.dataset.vendor ?? "", [included, features.length - included]);
  }

  const update = (): void => {
    const ticked = boxes.filter((b) => b.checked);
    const selected = new Set(ticked.map((b) => b.value));
    const categories = new Set(ticked.flatMap((b) => (b.dataset.categories ?? "").split(" ").filter(Boolean)));
    for (const item of items) item.hidden = !selected.has(item.dataset.vendor ?? "");
    for (const kit of kits) kit.hidden = !categories.has(kit.dataset.checkerKit ?? "");
    for (const section of sections) {
      section.hidden = section.dataset.checkerSection === "kits" ? kits.every((k) => k.hidden) : selected.size === 0;
    }
    let included = 0;
    let addOn = 0;
    for (const id of selected) {
      const [i, a] = tally.get(id) ?? [0, 0];
      included += i;
      addOn += a;
    }
    const text = statusText(selected.size, included, addOn);
    if (status.textContent !== text) status.textContent = text;
  };

  form.addEventListener("change", update);
  root.querySelector<HTMLElement>("[data-checker-nojs]")?.setAttribute("hidden", "");
  form.hidden = false;
  results.hidden = false;
  // A browser that restores form state (back/forward) may bring ticks back: show their results.
  update();
}

export function initChecker(): void {
  for (const root of document.querySelectorAll<HTMLElement>("[data-checker]")) enhance(root);
}
