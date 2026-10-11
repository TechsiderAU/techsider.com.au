// IndexNow (https://www.indexnow.org): after a deploy, tell the search engines that take part
// (Bing, whose index ChatGPT search and Copilot answer from, Yandex, Seznam, Naver) which URLs to
// recrawl, instead of waiting for them to revisit. deploy.yml runs it once the live-check job has
// seen this commit live, on a push to main only: the weekly rebuild changes no URL.
// The key proves we own the host: public/<key>.txt serves it, and every request names that file.
// It reads the live sitemap, so it submits exactly the canonical URLs the deploy published.
// Exit 0 when the engines accept the list (200 or 202), 1 otherwise; deploy.yml lets a failure pass.
import { pathToFileURL } from "node:url";

export const INDEXNOW_KEY = "b46fa24308a2e62fbbba5eed3139ced3";
export const ORIGIN = "https://techsider.com.au";
const ENDPOINT = "https://api.indexnow.org/indexnow";

/** Every <loc> in a sitemap or sitemap index. */
export function locs(xml) {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
}

/** The request body IndexNow takes: the host, the key, where the key file is, and the URLs. */
export function payload(urls, origin = ORIGIN, key = INDEXNOW_KEY) {
  const host = new URL(origin).host;
  const own = urls.filter((u) => new URL(u).host === host);
  return { host, key, keyLocation: `${origin}/${key}.txt`, urlList: [...new Set(own)] };
}

async function text(url) {
  const res = await fetch(url, { headers: { "User-Agent": "techsider-deploy-indexnow" } });
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return res.text();
}

async function main() {
  const key = (await text(`${ORIGIN}/${INDEXNOW_KEY}.txt`)).trim();
  if (key !== INDEXNOW_KEY) throw new Error(`the live key file holds "${key}", not the key this script sends`);
  const sitemaps = locs(await text(`${ORIGIN}/sitemap-index.xml`));
  const urls = (await Promise.all(sitemaps.map(async (s) => locs(await text(s))))).flat();
  if (urls.length === 0) throw new Error("the live sitemaps list no URL");
  const body = payload(urls);
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(body),
  });
  console.log(`IndexNow: ${body.urlList.length} URLs, HTTP ${res.status}`);
  if (res.status !== 200 && res.status !== 202) {
    console.log(`::warning::IndexNow answered HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
    process.exit(1);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.log(`::warning::IndexNow submission failed: ${err.message}`);
    process.exit(1);
  });
}
