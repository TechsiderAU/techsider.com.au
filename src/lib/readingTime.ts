/** Estimate reading time in whole minutes from raw markdown body (~200 wpm). */
export function readingMinutes(body: string | undefined): number {
  const words = (body ?? "").trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}
