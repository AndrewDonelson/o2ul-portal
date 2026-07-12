import { expect, test } from "@playwright/test";

test("loads htmx in a real browser and performs basic runtime actions", async ({ page }) => {
  await page.goto("/test/browser/smoke-fixture.html");

  await expect(page.locator("body")).toHaveAttribute("data-htmx-ready", "1");

  const hasHtmx = await page.evaluate(() => Boolean((window as unknown as Record<string, unknown>).__smokeHtmx));
  expect(hasHtmx).toBe(true);

  await page.evaluate(() => {
    const w = window as unknown as { __smokeHtmx: { swap: (target: string, content: string, spec: { swapStyle: string, swapDelay: number, settleDelay: number }) => void } };
    w.__smokeHtmx.swap("#target", "after", {
      swapStyle: "innerHTML",
      swapDelay: 0,
      settleDelay: 0
    });
  });

  await expect(page.locator("#target")).toHaveText("after");

  await page.click("#smoke-btn");
  await expect(page.locator("#smoke-btn")).toHaveAttribute("data-fired", "1");
});
