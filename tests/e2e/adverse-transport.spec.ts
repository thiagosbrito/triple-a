import { expect, test } from "@playwright/test";

import {
  paymentRequestMetricsResponseSchema,
  paymentScenarioControlResponseSchema,
  type PaymentScenarioConfiguration,
} from "@/features/checkout/api/contracts/development";
import { createPaymentResponseSchema } from "@/features/checkout/api/contracts/payments";

test("keeps at most one payment-status request in flight during a slow response", async ({
  page,
  request,
}) => {
  await page.goto("/");

  const launcher = page.getByRole("button", { name: /^Dev tools/u });
  await expect(launcher).toBeVisible();
  await page.keyboard.press("Control+Shift+K");
  const controls = page.getByRole("complementary", {
    name: "Development scenario controls",
  });
  await expect(
    controls.getByRole("status", {
      name: "Create a quote to enable scenarios",
    }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(controls).toHaveCount(0);
  await expect(launcher).toBeFocused();

  const paymentResponsePromise = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/payments") &&
      response.request().method() === "POST",
  );
  await page.locator('label:has(input[aria-label="USDC on Polygon"])').click();
  const payment = createPaymentResponseSchema.parse(
    await (await paymentResponsePromise).json(),
  );
  await expect(controls).toHaveCount(0);
  await page.keyboard.press("Control+Shift+K");
  await expect(controls).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(controls).toHaveCount(0);
  await expect(launcher).toBeFocused();
  await launcher.click();
  await expect(controls).toBeVisible();

  const resetResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/dev/requests") &&
      response.request().method() === "DELETE",
  );
  await controls
    .getByRole("button", { name: "Reset polling diagnostics" })
    .click();
  expect((await resetResponsePromise).status()).toBe(200);

  await controls.getByText("Network conditions", { exact: true }).click();
  await controls.getByLabel("Response delay (ms)").fill("5000");
  const scenarioResponsePromise = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/dev/scenario") &&
      response.request().method() === "PUT",
  );
  await controls.getByRole("button", { name: "Apply scenario" }).click();
  const configuredScenario = paymentScenarioControlResponseSchema.parse(
    await (await scenarioResponsePromise).json(),
  );
  expect(configuredScenario.configuration.response_delay_ms).toBe(5_000);

  const readMetrics = async () => {
    const response = await request.get("/api/dev/requests", {
      params: { payment_reference: payment.payment_reference },
    });
    return paymentRequestMetricsResponseSchema.parse(await response.json())
      .metrics;
  };

  await expect
    .poll(async () => (await readMetrics()).current_in_flight)
    .toBe(1);
  await page.waitForTimeout(3_200);

  const duringSlowResponse = await readMetrics();
  expect(duringSlowResponse.current_in_flight).toBe(1);
  expect(duringSlowResponse.maximum_in_flight).toBe(1);

  await expect(
    controls.getByRole("status").filter({
      hasText: "Scenario applied and payment status refreshed",
    }),
  ).toBeVisible({ timeout: 7_000 });

  const cleanup = await request.put("/api/dev/scenario", {
    data: {
      payment_reference: payment.payment_reference,
      configuration: {
        scenario: { mode: "exact_state", status: "awaiting_payment" },
        response_delay_ms: 0,
        failure: { mode: "none" },
      },
    },
  });
  expect(cleanup.ok()).toBe(true);
});

test("preserves a detected payment through exhausted retries and recovers", async ({
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

  const configure = async (configuration: PaymentScenarioConfiguration) => {
    const response = await request.put("/api/dev/scenario", {
      data: {
        payment_reference: payment.payment_reference,
        configuration,
      },
    });
    expect(response.ok()).toBe(true);
  };

  await configure({
    scenario: { mode: "exact_state", status: "detected" },
    response_delay_ms: 0,
    failure: { mode: "none" },
  });

  const detected = page.getByRole("status", { name: "Payment detected" });
  await expect(detected).toContainText("Do not send another payment", {
    timeout: 5_000,
  });

  const reset = await request.delete("/api/dev/requests", {
    params: { payment_reference: payment.payment_reference },
  });
  expect(reset.ok()).toBe(true);

  await configure({
    scenario: { mode: "exact_state", status: "detected" },
    response_delay_ms: 0,
    failure: { mode: "persistent", kind: "http_500" },
  });

  const interrupted = page.getByRole("status", {
    name: "Payment status connection interrupted",
  });
  await expect(interrupted).toContainText(
    "This does not mean the payment failed or expired",
    { timeout: 12_000 },
  );
  await expect(interrupted).toContainText(
    "The last confirmed payment state remains on screen",
  );
  await expect(detected).toContainText("Do not send another payment");
  await expect(page.getByText("Quote is no longer active")).toHaveCount(0);
  await expect(page.getByText("Payment could not be completed")).toHaveCount(0);

  const metricsResponse = await request.get("/api/dev/requests", {
    params: { payment_reference: payment.payment_reference },
  });
  const metrics = paymentRequestMetricsResponseSchema.parse(
    await metricsResponse.json(),
  ).metrics;
  expect(metrics.total_started).toBeGreaterThanOrEqual(4);
  expect(metrics.maximum_in_flight).toBe(1);

  const retryResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes(`/api/payments/${payment.payment_reference}`) &&
      response.request().method() === "GET" &&
      response.status() === 500,
  );
  await interrupted
    .getByRole("button", { name: "Retry payment status" })
    .click();
  await retryResponsePromise;

  await configure({
    scenario: { mode: "exact_state", status: "confirming" },
    response_delay_ms: 0,
    failure: { mode: "none" },
  });

  await expect(
    page.getByRole("status", { name: "Payment confirming" }),
  ).toContainText("gaining the required", { timeout: 5_000 });
  await expect(interrupted).toHaveCount(0);
  await expect(detected).toHaveCount(0);

  const recoveredMetricsResponse = await request.get("/api/dev/requests", {
    params: { payment_reference: payment.payment_reference },
  });
  const recoveredMetrics = paymentRequestMetricsResponseSchema.parse(
    await recoveredMetricsResponse.json(),
  ).metrics;
  expect(recoveredMetrics.maximum_in_flight).toBe(1);
});
