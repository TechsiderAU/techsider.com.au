// The live site, as AI search and assistant crawlers ask for it. robots.txt welcomes them, but an
// edge setting (Cloudflare's AI crawler blocking, Bot Fight Mode, a challenge) can still turn them
// away, and nothing in the build would notice. deploy.yml runs this in the live-check job, after
// each deploy and daily; a refusal is a warning on the run, never a failed deploy.
// The requests send each crawler's published user agent from a GitHub runner, not from the
// crawler's own network, so a 200 here shows the user agent isn't refused, not that the crawler's
// verified traffic gets through: Cloudflare's AI Crawl Control dashboard shows that.
import { pathToFileURL } from "node:url";

export const ORIGIN = "https://techsider.com.au";
export const PATHS = ["/", "/llms.txt", "/robots.txt"];
/** Each crawler's user agent, as its operator publishes it. */
export const CRAWLERS = {
  "OAI-SearchBot": "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; OAI-SearchBot/1.0; +https://openai.com/searchbot",
  "ChatGPT-User": "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; ChatGPT-User/1.0; +https://openai.com/bot",
  GPTBot: "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; GPTBot/1.2; +https://openai.com/gptbot",
  ClaudeBot: "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; ClaudeBot/1.0; +claudebot@anthropic.com)",
  "Claude-User": "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Claude-User/1.0; +Claude-User@anthropic.com)",
  PerplexityBot: "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot)",
  bingbot: "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm) Chrome/116.0.1938.76 Safari/537.36",
};

/** One line per refused request: anything but a 200 is a refusal. */
export function refusals(results) {
  return results.filter((r) => r.status !== 200).map((r) => `${r.crawler} got ${r.status === 0 ? "no response" : `HTTP ${r.status}`} for ${r.path}`);
}

export async function crawlerCheck({ origin = ORIGIN, crawlers = CRAWLERS, paths = PATHS, fetchImpl = fetch } = {}) {
  const results = [];
  for (const [crawler, ua] of Object.entries(crawlers)) {
    for (const path of paths) {
      let status = 0;
      try {
        status = (await fetchImpl(new URL(path, origin), { headers: { "User-Agent": ua }, redirect: "manual" })).status;
      } catch {
        status = 0;
      }
      results.push({ crawler, path, status });
    }
  }
  return results;
}

async function main() {
  const results = await crawlerCheck();
  const refused = refusals(results);
  // 403, 429 and 503 are how an edge refuses or challenges a client: Cloudflare's settings decide those.
  const edge = refused.length > 0 && results.some((r) => [403, 429, 503].includes(r.status));
  for (const line of refused) console.log(`::warning::${line}`);
  if (edge) console.log("::warning::An edge refusal: check Cloudflare's AI Crawl Control, Bot Fight Mode and security rules");
  console.log(`crawler check: ${results.length - refused.length} of ${results.length} requests answered 200`);
  return refused.length === 0 ? 0 : 3;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) process.exitCode = await main();
