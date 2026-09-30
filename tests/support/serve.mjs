// Serves a build directory with tests/support/static-server.mjs on a free port, for a spec or a
// script that needs a build served differently from Playwright's webServers (such as
// tests/e2e/prod-vitals.spec.mjs, which serves dist/ with latency). Resolves once the server
// listens, with its origin and a close() that stops it.
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const SERVER = fileURLToPath(new URL("./static-server.mjs", import.meta.url));

/**
 * @param {string} dir the build directory (absolute, or relative to the working directory)
 * @param {{ latency?: number }} [options] latency: ms each response is held back (default 0)
 * @returns {Promise<{ origin: string, close: () => Promise<void> }>}
 */
export function serve(dir, { latency = 0 } = {}) {
  const args = [SERVER, dir, "0", ...(latency > 0 ? ["--latency", String(latency)] : [])];
  const child = spawn(process.execPath, args, { stdio: ["ignore", "pipe", "inherit"] });
  const close = () =>
    new Promise((done) => {
      if (child.exitCode !== null || child.signalCode !== null) return done();
      child.once("exit", () => done());
      child.kill();
    });
  return new Promise((resolve, reject) => {
    let out = "";
    child.once("error", reject);
    child.once("exit", (code) => reject(new Error(`static-server.mjs exited (${code}) before it listened`)));
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      out += chunk;
      const origin = out.match(/ on (http:\/\/127\.0\.0\.1:\d+)/)?.[1];
      if (origin) resolve({ origin, close });
    });
  });
}
