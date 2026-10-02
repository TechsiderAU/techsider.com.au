import { test, expect } from '@playwright/test';
import { withoutScripts } from '../support/no-scripts.mjs';

for (const javaScriptEnabled of [true, false]) {
  for (const withQualifications of [false, true]) {
    test(`enquiry preserves complete answers with optional qualifications ${withQualifications}, JavaScript ${javaScriptEnabled}`, async ({ browser }) => {
      const context = await browser.newContext();
      const page = await context.newPage();
      let payload;
      await context.route('https://formsubmit.co/**', async route => {
        payload = Object.fromEntries(new URLSearchParams(route.request().postData()));
        await route.fulfill({ status: 200, contentType: 'text/html', body: '<h1>Fixture provider accepted the enquiry</h1>' });
      });
      if (!javaScriptEnabled) await withoutScripts(page, '/contact/');
      await page.goto('http://127.0.0.1:4323/contact/');
      if (!javaScriptEnabled) await expect(page.locator('html')).toHaveClass(/no-js/);
      await page.locator('[name=name]').fill('Taylor O’Neil');
      await page.locator('[name=email]').fill('taylor@example.com');
      await page.locator('[name=organisation]').fill('Example & Co');
      const message = 'Documents arrive by email.\nCheck agreement dates & prepare a register — café team. Source: https://example.com/?a=1&b=2';
      await page.locator('[name=message]').fill(message);
      await page.locator('[name=consent]').check();
      for (const name of ['industry', 'size', 'interest']) await expect(page.locator(`[name=${name}]`)).not.toHaveAttribute('required');
      if (withQualifications) {
        await page.locator('[name=industry]').selectOption('accounting');
        await page.locator('[name=size]').selectOption('20–199');
        await page.locator('[name=interest]').selectOption('document-registers');
        await page.locator('[name=discovery]').selectOption('ChatGPT');
      }
      await page.getByRole('button', { name: 'Send enquiry' }).click();
      await expect(page.getByRole('heading', { name: 'Fixture provider accepted the enquiry' })).toBeVisible();
      payload.message = payload.message.replace(/\r\n/g, '\n');
      expect(payload).toMatchObject({ name: 'Taylor O’Neil', email: 'taylor@example.com', organisation: 'Example & Co', message, consent: 'yes', industry: withQualifications ? 'accounting' : '', size: withQualifications ? '20–199' : '', interest: withQualifications ? 'document-registers' : '', discovery: withQualifications ? 'ChatGPT' : '', _honey: '', _template: 'table', _next: 'https://techsider.com.au/contact/sent/' });
      await context.close();
    });
  }
}
