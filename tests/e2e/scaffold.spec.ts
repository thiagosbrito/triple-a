import { expect, test } from "@playwright/test";

test("serves the API-driven hosted checkout through Next.js", async ({
  page,
}) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Choose how to pay",
    }),
  ).toBeVisible();
  await expect(page.getByText("Nordwind Audio")).toBeVisible();
  await expect(page.getByText("ORD-88213")).toBeVisible();

  const paymentMethods = page.getByRole("radio");
  await expect(paymentMethods).toHaveCount(6);

  const polygon = page.getByRole("radio", { name: "USDC on Polygon" });
  await page.locator('label:has(input[aria-label="USDC on Polygon"])').click();
  await expect(polygon).toBeChecked();
  await expect(
    page.getByRole("status", { name: "Quote created" }),
  ).toContainText("USDC on Polygon is now fixed for this quote");
  await expect(polygon).toBeDisabled();
});
