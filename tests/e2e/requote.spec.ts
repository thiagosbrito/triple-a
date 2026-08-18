import { expect, test } from "@playwright/test";

import { createPaymentResponseSchema } from "@/features/checkout/api/contracts/payments";

test("replaces expired instructions from the shopper UI", async ({
  page,
  request,
}) => {
  await page.goto("/");

  const createResponsePromise = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/payments") &&
      response.request().method() === "POST",
  );
  await page.locator('label:has(input[aria-label="USDC on Polygon"])').click();
  const payment = createPaymentResponseSchema.parse(
    await (await createResponsePromise).json(),
  );
  const parallelResponse = await request.post("/api/payments", {
    data: {
      order_id: "ORD-SECOND-CHECKOUT",
      currency: "USDT",
      network: "ethereum",
    },
  });
  const parallelPayment = createPaymentResponseSchema.parse(
    await parallelResponse.json(),
  );
  expect(parallelPayment.payment_reference).not.toBe(payment.payment_reference);

  const expireResponse = await request.put("/api/dev/scenario", {
    data: {
      payment_reference: payment.payment_reference,
      configuration: {
        scenario: { mode: "exact_state", status: "expired" },
        response_delay_ms: 0,
        failure: { mode: "none" },
      },
    },
  });
  expect(expireResponse.ok()).toBe(true);

  const expiredStatus = page.getByRole("status", { name: "Quote expired" });
  await expect(expiredStatus).toBeVisible({ timeout: 5_000 });
  await expect(page.getByRole("region", { name: "Send exactly" })).toHaveCount(
    0,
  );

  const requoteResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/requote") &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Request new quote" }).click();
  const requoteResponse = await requoteResponsePromise;
  expect(requoteResponse.status()).toBe(201);

  await expect(
    page.getByRole("region", { name: "Send exactly" }),
  ).toBeVisible();
  await expect(page.getByRole("timer")).toContainText("03:00");
  await expect(
    page.getByRole("button", { name: "Request new quote" }),
  ).toHaveCount(0);
});
