// Execute a real Astro component in the installed compiler/container, without a second full
// site build. Inline assets avoid a CSS loader, as Astro's container compilation does. The
// actual frontmatter, markup and imported application modules execute without a mock.
import { readFileSync } from "node:fs";
import { transform } from "@astrojs/compiler-rs";
import { experimental_AstroContainer } from "astro/container";

export async function renderAstro(url, props) {
  const compiled = transform(readFileSync(url, "utf8"), {
    filename: url.pathname,
    inlineComponentAssets: true,
    resultScopedSlot: true,
    resolvePath: (specifier) => specifier,
    internalURL: "astro/compiler-runtime",
    astroGlobalArgs: '"https://techsider.com.au"',
  });
  const code = compiled.code
    .replace(/from "([^"\n]+)"/g, (_, specifier) => {
      const target = specifier.startsWith(".") ? new URL(`${specifier}.ts`, url).href : import.meta.resolve(specifier);
      return `from ${JSON.stringify(target)}`;
    });
  const component = (await import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`)).default;
  const container = await experimental_AstroContainer.create({ astroConfig: { site: "https://techsider.com.au" } });
  return container.renderToString(component, { props });
}
