// The build stamp BaseLayout writes into every page's <head> as <meta name="build">: the commit a
// GitHub Actions run builds (GITHUB_SHA), or "local" for any other build. deploy.yml's live-check
// job polls the live site until it serves this run's commit, so it never checks a page that an edge
// cache still holds from the previous deploy (scripts/ci/live-check.mjs). Node-importable: no imports.

/** Environment variables, as process.env holds them. */
export type BuildEnv = Record<string, string | undefined>;

/** A full commit id: 40 hex digits (SHA-1), or 64 in a SHA-256 repository. */
const COMMIT = /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/;

/** The build's environment, read the way nav.ts's isPreview() reads it, with no Node types needed. */
function buildEnv(): BuildEnv {
  return (globalThis as { process?: { env?: BuildEnv } }).process?.env ?? {};
}

/** GITHUB_SHA when it is a full commit id, else "local". */
export function buildStamp(env: BuildEnv = buildEnv()): string {
  const sha = env.GITHUB_SHA ?? "";
  return COMMIT.test(sha) ? sha : "local";
}
