// /.well-known/security.txt (RFC 9116; spec §11.3), built only once SITE.securityContact is set
// (spec §12 item 7): until then getStaticPaths returns no path, so no file ships. The text is
// securityTxt() from src/lib/security-txt.ts, with Expires 180 days after the build day, and
// deploy.yml's weekly rebuild keeps it fresh. Astro routes src/pages/.well-known/ (the one dot
// directory it doesn't skip), and the pinned withastro/action uploads dotfiles to Pages.
import type { APIRoute, GetStaticPaths } from "astro";
import { SITE } from "../../data/nav.ts";
import { securityTxt, securityTxtPaths } from "../../lib/security-txt.ts";

export const getStaticPaths = (() => securityTxtPaths(SITE.securityContact)) satisfies GetStaticPaths;

export const GET: APIRoute = ({ props, site }) => {
  if (!site) throw new Error("security.txt: astro.config.mjs sets no site, so the Canonical URL is unknown");
  const body = securityTxt({ contact: props.contact, site, now: new Date() });
  // RFC 9116 §3: text/plain with charset=utf-8. A static build writes only the body; GitHub Pages
  // sets the type from the .txt extension, which the live check asserts.
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
};
