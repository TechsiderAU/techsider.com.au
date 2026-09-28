import { test, expect } from "@playwright/test";
import { buildShippedCss } from "../support/tailwind.mjs";

// No Phase A page uses surface-bone yet, so this renders the production-flattened CSS for a
// fixture: a bone section holding a graphite island (MockPanel) and a carbon island (trace panel).
const ACID = "rgb(200, 255, 46)";
const CARBON = "rgb(11, 11, 12)";

test("focus rings and form controls follow the surface they sit on", async ({ page }) => {
  const css = await buildShippedCss(["surface-bone", "bg-carbon", "bg-graphite"]);
  await page.setContent(`<!doctype html><html><head><style>${css}</style></head><body>
    <button id="on-carbon">on carbon</button>
    <section class="surface-bone">
      <button id="on-bone">on bone</button>
      <input id="input-on-bone" />
      <div class="bg-graphite"><button id="in-graphite">in graphite island</button><input id="input-in-graphite" /></div>
      <div class="bg-carbon"><p><button id="in-carbon">in carbon island</button></p></div>
      <button id="carbon-button-on-bone" class="bg-carbon">carbon button, ring drawn on bone</button>
    </section>
  </body></html>`);

  const expected = {
    "on-carbon": ACID,
    "on-bone": CARBON,
    "input-on-bone": CARBON,
    "in-graphite": ACID,
    "input-in-graphite": ACID,
    "in-carbon": ACID,
    "carbon-button-on-bone": CARBON,
  };
  const seen = {};
  for (let i = 0; i < Object.keys(expected).length; i++) {
    await page.keyboard.press("Tab");
    const { id, visible, color, style } = await page.evaluate(() => {
      const el = document.activeElement;
      const s = getComputedStyle(el);
      return { id: el.id, visible: el.matches(":focus-visible"), color: s.outlineColor, style: s.outlineStyle };
    });
    expect(visible, id).toBe(true);
    expect(style, id).toBe("solid");
    seen[id] = color;
  }
  expect(seen).toEqual(expected);

  const scheme = (id) => page.locator(`#${id}`).evaluate((el) => getComputedStyle(el).colorScheme);
  expect(await scheme("on-carbon")).toBe("dark");
  expect(await scheme("input-on-bone")).toBe("light");
  expect(await scheme("input-in-graphite")).toBe("dark");
});
