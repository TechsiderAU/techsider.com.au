// Minimal static file server for e2e tests: serves a build directory with
// directory → index.html resolution, like GitHub Pages. No dependencies.
//   node tests/support/static-server.mjs [dir] [port] [--latency <ms>]
// Port 0 takes any free port; the "serving … on <origin>" line names the one it got, which
// tests/support/serve.mjs reads. --latency holds every response back that long before it starts,
// like a round trip on a slow mobile link: tests/e2e/prod-vitals.spec.mjs serves dist/ with
// Lighthouse's 150 ms (spec §11.4).
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";

const args = process.argv.slice(2);
const flag = args.indexOf("--latency");
const latency = flag === -1 ? 0 : Number(args.splice(flag, 2)[1]);
if (!Number.isInteger(latency) || latency < 0) {
  console.error("static-server: --latency needs a whole number of milliseconds");
  process.exit(2);
}
const [dir = "dist", port = "4322"] = args;
const root = resolve(dir);
const types = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css",
  ".svg": "image/svg+xml", ".png": "image/png", ".ico": "image/x-icon", ".woff2": "font/woff2",
  ".json": "application/json", ".webmanifest": "application/manifest+json", ".xml": "application/xml",
  // RFC 9116 §3: security.txt is text/plain with charset=utf-8 (the live check holds GitHub Pages to it).
  ".txt": "text/plain; charset=utf-8",
};

const server = createServer(async (req, res) => {
  if (latency > 0) await new Promise((done) => setTimeout(done, latency));
  try {
    const url = new URL(req.url ?? "/", "http://localhost");
    let path = normalize(join(root, decodeURIComponent(url.pathname)));
    if (!path.startsWith(root)) {
      res.writeHead(403).end();
      return;
    }
    let info = await stat(path).catch(() => null);
    if (info?.isDirectory()) {
      path = join(path, "index.html");
      info = await stat(path).catch(() => null);
    }
    if (!info) {
      res.writeHead(404, { "content-type": "text/plain" }).end("Not found");
      return;
    }
    res.writeHead(200, { "content-type": types[extname(path)] ?? "application/octet-stream" }).end(await readFile(path));
  } catch {
    res.writeHead(500).end();
  }
});
server.listen(Number(port), "127.0.0.1", () => console.log(`serving ${root} on http://127.0.0.1:${server.address().port}`));
