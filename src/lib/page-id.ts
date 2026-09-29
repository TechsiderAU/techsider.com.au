// Ids for a component that can render more than once on a page, where a fixed id would repeat. Pass
// Astro.locals as `page`: it is one object per page render, so every page numbers from 1
// and a build gives the same ids every time.
const counters = new WeakMap<object, Map<string, number>>();

export function pageUniqueId(page: object, base: string): string {
  let seen = counters.get(page);
  if (!seen) {
    seen = new Map();
    counters.set(page, seen);
  }
  const n = (seen.get(base) ?? 0) + 1;
  seen.set(base, n);
  return `${base}-${n}`;
}
