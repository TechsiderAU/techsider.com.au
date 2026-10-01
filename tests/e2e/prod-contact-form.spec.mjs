import { test, expect } from "@playwright/test";
import { CONTACT } from "../../src/data/contact.ts";
import { withoutScripts } from "../support/no-scripts.mjs";

// Intercept the real configured endpoint: no email or activation request leaves the test.
for (const javaScriptEnabled of [true, false]) {
  test.describe(`production contact form ${javaScriptEnabled ? "with" : "without"} site JavaScript`, () => {

    test("posts the enquiry through the browser and follows the provider redirect", async ({ page }) => {
      const submissions = [];
      // Strip site scripts as the gallery's no-JS submission tests do. Playwright's own
      // actionability checks still need JavaScript to scroll and click the consent control.
      if (!javaScriptEnabled) await withoutScripts(page, "/contact/");
      await page.route(CONTACT.formEndpoint, async (route) => {
        const request = route.request();
        submissions.push({ native: request.isNavigationRequest(), method: request.method(), fields: Object.fromEntries(new URLSearchParams(request.postData())) });
        await route.fulfill({ status: 303, headers: { location: new URL("/contact/sent/", page.url()).href } });
      });
      await page.goto("/contact/?industry=government&interest=ai-evaluation");
      if (!javaScriptEnabled) await expect(page.locator("html")).toHaveClass(/\bno-js\b/);
      const form = page.locator("[data-contact-form]");
      await expect(form).toHaveAttribute("action", CONTACT.formEndpoint);
      await expect(form).toHaveAttribute("data-submit-mode", "native");
      await expect(form.locator('[name="_next"]')).toHaveValue("https://techsider.com.au/contact/sent/");
      await expect(page.locator("#enquiry-privacy")).toContainText("FormSubmit");
      if (javaScriptEnabled) {
        await form.getByRole("button", { name: "Send enquiry" }).click();
        await expect(page.getByLabel("Name")).toBeFocused();
        await expect(page.locator("[data-form-summary]")).toHaveAttribute("data-state", "invalid");
        expect(submissions).toEqual([]);
        await expect(page.getByLabel("Industry")).toHaveValue("government");
        await expect(page.getByLabel("Interest")).toHaveValue("ai-evaluation");
      }
      await page.getByLabel("Name").fill("Contact Test");
      await page.getByLabel("Work email").fill("contact-test@example.com");
      await page.getByLabel("Organisation", { exact: true }).fill("Test Organisation");
      await page.getByLabel("Industry").selectOption("government");
      await page.getByLabel("Organisation size").selectOption({ index: 1 });
      await page.getByLabel("Interest").selectOption("ai-evaluation");
      await page.getByLabel("Message").fill("Test enquiry. No real message should be delivered.");
      await page.getByLabel(/I agree/).check();
      await form.getByRole("button", { name: "Send enquiry" }).click();
      await expect(page).toHaveURL(/\/contact\/sent\/$/);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText("Message sent.");
      expect(submissions).toHaveLength(1);
      const submission = submissions[0];
      expect(submission.native).toBe(true);
      expect(submission.method).toBe("POST");
      expect(submission.fields).toMatchObject({
        name: "Contact Test", email: "contact-test@example.com", organisation: "Test Organisation",
        industry: "government", interest: "ai-evaluation", consent: "yes", _honey: "",
        _next: "https://techsider.com.au/contact/sent/", ...CONTACT.hiddenFields,
      });
      expect(submission.fields).not.toHaveProperty("_captcha");
      expect(new URL(page.url()).search).toBe("");
    });
  });
}
