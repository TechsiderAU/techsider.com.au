// RFC 9116 security.txt (spec §11.3, §12 item 7): the text /.well-known/security.txt serves, and
// the paths its route builds. The route is src/pages/.well-known/[name].txt.ts, and it builds
// nothing while SITE.securityContact is null. scripts/ci/live-check.mjs checks the live file.
// Node-importable: no imports.

/** Where the file lives (RFC 9116 §3: under /.well-known/, over https). */
export const SECURITY_TXT_PATH = "/.well-known/security.txt";
/** Days from the build day to Expires. deploy.yml rebuilds weekly, so the live file stays 173–180 days from expiry. */
export const SECURITY_TXT_DAYS = 180;

const DAY_MS = 86_400_000;
/** An address for a mailto: URI, without the scheme. */
const ADDRESS = /^[^\s@:<>]+@[^\s@:<>]+\.[a-z]{2,}$/i;

/**
 * Expires (RFC 9116 §2.5.5), as an RFC 3339 UTC timestamp: UTC midnight of the build day plus
 * SECURITY_TXT_DAYS, so two builds on the same day write the same file. The RFC recommends less
 * than a year.
 */
export function securityTxtExpires(now: Date): string {
  const day = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return new Date(day + SECURITY_TXT_DAYS * DAY_MS).toISOString().replace(/\.\d{3}Z$/, "Z");
}

/**
 * The route's getStaticPaths: the one file once the owner sets a security contact (spec §12 item 7),
 * and nothing before. Throws when the contact isn't a bare address, so "mailto:…" or a URL fails
 * the build instead of shipping a broken Contact field.
 */
export function securityTxtPaths(contact: string | null): { params: { name: "security" }; props: { contact: string } }[] {
  if (contact === null) return [];
  if (!ADDRESS.test(contact)) {
    throw new Error(`SITE.securityContact "${contact}" isn't an email address; write it without "mailto:" (spec §12 item 7)`);
  }
  return [{ params: { name: "security" }, props: { contact } }];
}

/**
 * The file (RFC 9116 §2.5): the required Contact and Expires, then Preferred-Languages and a
 * Canonical naming the URL it is served from, one field per line, each line ending in LF. There's
 * no Policy field until a live page states one, and no Encryption field: no key is published.
 */
export function securityTxt({ contact, site, now }: { contact: string; site: URL | string; now: Date }): string {
  const lines = [
    `Contact: mailto:${contact}`,
    `Expires: ${securityTxtExpires(now)}`,
    "Preferred-Languages: en",
    `Canonical: ${new URL(SECURITY_TXT_PATH, site).href}`,
  ];
  return `${lines.join("\n")}\n`;
}
