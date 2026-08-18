import { expect, test } from "@playwright/test";

import { paymentRequestMetricsResponseSchema } from "@/features/checkout/api/contracts/development";
import { createPaymentResponseSchema } from "@/features/checkout/api/contracts/payments";

test("keeps underpayment recovery on the issued method and continues to paid", async ({
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
    .locator('label:has(input[aria-label="USDT on Tron (TRC-20)"])')
    .click();
  const payment = createPaymentResponseSchema.parse(
    await (await createResponsePromise).json(),
  );

  await page.getByRole("button", { name: /^Dev tools/u }).click();
  const controls = page.getByRole("complementary", {
    name: "Development scenario controls",
  });
  await controls.getByLabel("Payment state").selectOption("underpaid");
  await controls.getByRole("button", { name: "Apply scenario" }).click();

  const underpaid = page.getByRole("status", {
    name: "Additional payment required",
  });
  await expect(underpaid).toContainText("amount remains outstanding");
  await expect(page.getByText("43.69 USDT", { exact: true })).toBeVisible();
  await expect(
    page.getByText(/Send only 43.69 USDT on Tron \(TRC-20\)/u),
  ).toBeVisible();
  await expect(
    page.getByRole("complementary", { name: "Use only Tron (TRC-20)" }),
  ).toContainText("Send only USDT on Tron (TRC-20)");
  await expect(page.getByText(payment.quote.crypto_address)).toBeVisible();
  await expect(
    page.getByRole("img", {
      name: "USDT destination address QR code for Tron (TRC-20)",
    }),
  ).toHaveAttribute("data-payment-qr-payload", payment.quote.crypto_address);
  await expect(page.getByRole("timer")).toHaveCount(0);
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
  expect(metrics.total_started).toBeGreaterThanOrEqual(1);
  expect(metrics.maximum_in_flight).toBe(1);

  await controls.getByLabel("Payment state").selectOption("paid");
  await controls.getByRole("button", { name: "Apply scenario" }).click();
  await expect(
    page.getByRole("status", { name: "Payment complete" }),
  ).toContainText("settled successfully");
  await expect(page.getByText("No further payment is required.")).toBeVisible();
});
