import {
  expect,
  test,
  type APIRequestContext,
  type Page,
} from "@playwright/test";

import { paymentRequestMetricsResponseSchema } from "@/features/checkout/api/contracts/development";
import { createPaymentResponseSchema } from "@/features/checkout/api/contracts/payments";

const createAwaitingPayment = async (
  page: Page,
  request: APIRequestContext,
) => {
  await page.clock.install({ time: new Date() });
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
  await expect(
    page.getByRole("region", { name: "Send exactly" }),
  ).toBeVisible();

  await expect
    .poll(async () => {
      const response = await request.get("/api/dev/requests", {
        params: { payment_reference: payment.payment_reference },
      });
      return paymentRequestMetricsResponseSchema.parse(await response.json())
        .metrics.total_completed;
    })
    .toBeGreaterThan(0);

  return payment;
};

const configureDeadlineResult = async (
  request: APIRequestContext,
  paymentReference: string,
  status: "detected" | "expired",
): Promise<void> => {
  const response = await request.put("/api/dev/scenario", {
    data: {
      payment_reference: paymentReference,
      configuration: {
        scenario: { mode: "exact_state", status },
        response_delay_ms: 500,
        failure: { mode: "none" },
      },
    },
  });
  expect(response.ok()).toBe(true);
};

const restoreAfterDeadline = async (page: Page, expiresAt: string) => {
  await page.clock.setSystemTime(new Date(expiresAt).getTime() + 1);
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
};

test("recomputes an expired quote immediately after a background time jump", async ({
  page,
  request,
}) => {
  const payment = await createAwaitingPayment(page, request);
  await configureDeadlineResult(request, payment.payment_reference, "expired");

  await restoreAfterDeadline(page, payment.quote.expires_at);

  await expect(page.getByText("Checking payment status")).toBeVisible();
  await expect(page.getByRole("region", { name: "Send exactly" })).toHaveCount(
    0,
  );
  await expect(
    page.getByRole("button", { name: "Change payment method" }),
  ).toHaveCount(0);
  await expect(page.getByRole("status", { name: "Quote expired" })).toBeVisible(
    { timeout: 2_000 },
  );
  await expect(
    page.getByRole("button", { name: "Request new quote" }),
  ).toBeVisible();
});

test("lets detected funds win when the deadline status check resolves", async ({
  page,
  request,
}) => {
  const payment = await createAwaitingPayment(page, request);
  await configureDeadlineResult(request, payment.payment_reference, "detected");

  await restoreAfterDeadline(page, payment.quote.expires_at);

  await expect(page.getByText("Checking payment status")).toBeVisible();
  await expect(page.getByRole("region", { name: "Send exactly" })).toHaveCount(
    0,
  );
  const detected = page.getByRole("status", { name: "Payment detected" });
  await expect(detected).toContainText("zero confirmations", {
    timeout: 2_000,
  });
  await expect(detected).toContainText("Do not send another payment");
  await expect(page.getByRole("status", { name: "Quote expired" })).toHaveCount(
    0,
  );
  await expect(
    page.getByRole("button", { name: "Request new quote" }),
  ).toHaveCount(0);
});
