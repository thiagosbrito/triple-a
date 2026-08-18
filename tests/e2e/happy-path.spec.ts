import { expect, test } from "@playwright/test";

import { paymentRequestMetricsResponseSchema } from "@/features/checkout/api/contracts/development";
import { createPaymentResponseSchema } from "@/features/checkout/api/contracts/payments";

test.use({ permissions: ["clipboard-read", "clipboard-write"] });

test("moves one shopper payment from awaiting through paid and stops polling", async ({
  page,
  request,
}) => {
  await page.goto("/");

  const createResponsePromise = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/payments") &&
      response.request().method() === "POST",
  );
  await page
    .locator('label:has(input[aria-label="USDT on Ethereum (ERC-20)"])')
    .click();
  const payment = createPaymentResponseSchema.parse(
    await (await createResponsePromise).json(),
  );

  const instructions = page.getByRole("region", { name: "Send exactly" });
  await expect(instructions).toContainText("USDT on Ethereum (ERC-20)");
  await expect(instructions).toContainText("167.35 USDT");
  await page.getByRole("button", { name: "Copy address" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Address copied" }),
  ).toBeVisible();

  await page.getByRole("button", { name: /^Dev tools/u }).click();
  const controls = page.getByRole("complementary", {
    name: "Development scenario controls",
  });
  await controls
    .getByLabel("Scenario")
    .selectOption({ label: "Happy-path progression" });
  await controls.getByRole("button", { name: "Apply scenario" }).click();
  await expect(
    controls.getByRole("status").filter({
      hasText: "Scenario applied and payment status refreshed",
    }),
  ).toBeVisible();

  const detected = page.getByRole("status", { name: "Payment detected" });
  await expect(detected).toContainText("zero confirmations", {
    timeout: 5_000,
  });
  await expect(detected).toContainText("Do not send another payment");

  const confirming = page.getByRole("status", {
    name: "Payment confirming",
  });
  await expect(confirming).toContainText("gaining the required", {
    timeout: 4_000,
  });
  await expect(
    page.getByRole("progressbar", { name: "Network confirmations" }),
  ).toBeVisible();

  const paid = page.getByRole("status", { name: "Payment complete" });
  await expect(paid).toContainText("settled successfully", {
    timeout: 5_000,
  });
  await expect(page.getByText("No further payment is required.")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Change payment method" }),
  ).toHaveCount(0);

  const reset = await request.delete("/api/dev/requests", {
    params: { payment_reference: payment.payment_reference },
  });
  expect(reset.ok()).toBe(true);
  await page.waitForTimeout(3_500);
  const metricsResponse = await request.get("/api/dev/requests", {
    params: { payment_reference: payment.payment_reference },
  });
  const metrics = paymentRequestMetricsResponseSchema.parse(
    await metricsResponse.json(),
  ).metrics;

  expect(metrics).toEqual({
    current_in_flight: 0,
    maximum_in_flight: 0,
    total_started: 0,
    total_completed: 0,
  });
});
