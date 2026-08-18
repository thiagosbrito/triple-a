import { expect, test } from "@playwright/test";

import {
  paymentRequestMetricsResponseSchema,
  paymentScenarioControlResponseSchema,
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
