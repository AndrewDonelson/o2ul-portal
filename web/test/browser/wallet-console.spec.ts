import { expect, test } from "@playwright/test";

test("loads the HTMX wallet console and swaps between wallet states", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator("#wallet-console-body")).toContainText("Wallet Overview");

  await page.getByRole("button", { name: "Build spend packet" }).click();
  await expect(page.locator("#wallet-console-body")).toContainText("Spend Builder");
  await expect(page.locator("#wallet-console-body input[name='recipient']")).toHaveValue("0x8b2d4afc9b5e1b2a0c5d4f7e9a1c3b7f8d0e4c1");

  await page.getByRole("button", { name: "Confirm spend packet" }).click();
  await expect(page.locator("#wallet-console-body")).toContainText("Execution Receipt");

  await page.getByRole("button", { name: "Check notes" }).click();
  await expect(page.locator("#wallet-console-body")).toContainText("Note Queue");

  await page.getByRole("button", { name: "Review recovery" }).click();
  await expect(page.locator("#wallet-console-body")).toContainText("Recovery Console");
});
