import {test,expect} from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import {HOME_ANCHORS} from "../../scripts/ci/checks/03-anchors.mjs";
const sizes=[{width:1280,height:800},{width:390,height:844}];
for(const viewport of sizes){
  test(`homepage anchors work with and without JavaScript at ${viewport.width}px`,async({browser})=>{
    for(const javaScriptEnabled of [true,false]){
      const context=await browser.newContext({javaScriptEnabled,viewport,reducedMotion:"reduce"});
      for(const id of HOME_ANCHORS){const page=await context.newPage();await page.goto(`/#${id}`);await expect(page.locator(`#${id}`)).toBeInViewport();await page.close();}
      await context.close();
    }
  });
  test(`homepage has no accessibility violations at ${viewport.width}px, including an expanded FAQ`,async({page})=>{
    await page.setViewportSize(viewport);await page.goto("/");
    const axe=()=>new AxeBuilder({page}).withTags(["wcag2a","wcag2aa","wcag21aa","wcag22aa"]).analyze();
    expect((await axe()).violations).toEqual([]);
    await page.locator("#faq summary").first().click();
    expect((await axe()).violations).toEqual([]);
  });
}
test("responsive application images load without layout overflow at 320px",async({page})=>{
  await page.setViewportSize({width:320,height:700});await page.goto("/");
  for(const image of await page.locator("main [data-business-artwork] img").all()){
    await image.scrollIntoViewIfNeeded();
    await expect.poll(()=>image.evaluate(el=>el.complete && el.naturalWidth>0)).toBe(true);
    expect(await image.evaluate(el=>el.naturalWidth/el.naturalHeight)).toBeCloseTo(1.5,2);
  }
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
});
test("the concise demo teaser opens the live demo hub without loading replay code on the homepage",async({page})=>{
  const scripts=[];page.on("response",response=>{if(new URL(response.url()).pathname.endsWith(".js"))scripts.push(response);});
  await page.goto("/");await page.locator("#demo").scrollIntoViewIfNeeded();await page.waitForLoadState("networkidle");
  expect(await page.locator("[data-demo-frame]").count()).toBe(0);
  for(const response of scripts) expect(await response.text()).not.toContain("data-demo-root");
  await page.locator("[data-all-demos]").click();await expect(page).toHaveURL(/\/demos\/$/);
  await expect(page.locator("#demos [data-demo-kind]")).toHaveCount(5);
});
test("without JavaScript, the same capability links, images and FAQ are usable",async({browser})=>{
  const context=await browser.newContext({javaScriptEnabled:false,viewport:sizes[1]});const page=await context.newPage();await page.goto("/");
  await expect(page.locator("#services [data-capability] a")).toHaveCount(3);
  await page.locator("#faq summary").first().click();await expect(page.locator("#faq details").first()).toHaveAttribute("open","");
  await page.locator("[data-all-demos]").click();await expect(page).toHaveURL(/\/demos\/$/);await context.close();
});
