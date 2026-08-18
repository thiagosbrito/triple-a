import AxeBuilder from "@axe-core/playwright";
import {
  expect,
  test,
  type APIRequestContext,
  type Page,
} from "@playwright/test";

import type { PaymentScenarioConfiguration } from "@/features/checkout/api/contracts/development";
import type { PaymentStatus } from "@/features/checkout/api/contracts/payment-status-values";
import { createPaymentResponseSchema } from "@/features/checkout/api/contracts/payments";

const expectNoAccessibilityViolations = async (page: Page): Promise<void> => {
  const { violations } = await new AxeBuilder({ page }).analyze();

  expect(
    violations,
    violations
      .map(
        (violation) =>
          `${violation.id} (${violation.impact ?? "unknown"}): ${violation.help}`,
      )
      .join("\n"),
  ).toEqual([]);
};

const createEthereumPayment = async (page: Page) => {
  const responsePromise = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/payments") &&
      response.request().method() === "POST",
  );
  await page
    .locator('label:has(input[aria-label="USDT on Ethereum (ERC-20)"])')
    .click();
  return createPaymentResponseSchema.parse(
    await (await responsePromise).json(),
  );
};

const configureStatus = async (
  request: APIRequestContext,
  paymentReference: string,
  status: PaymentStatus,
): Promise<void> => {
  const configuration: PaymentScenarioConfiguration = {
    scenario: { mode: "exact_state", status },
    response_delay_ms: 0,
    failure: { mode: "none" },
  };
  const response = await request.put("/api/dev/scenario", {
    data: {
      payment_reference: paymentReference,
      configuration,
    },
  });
  expect(response.ok()).toBe(true);
};

test("has no automated violations in method selection and active instructions", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByRole("radio")).toHaveCount(6);
  await expectNoAccessibilityViolations(page);

  await createEthereumPayment(page);
  await expect(
    page.getByRole("status", { name: "Quote created" }),
  ).toBeVisible();
  await expectNoAccessibilityViolations(page);
});

const outcomeScenarios = [
  { status: "detected", accessibleName: "Payment detected" },
  { status: "confirming", accessibleName: "Payment confirming" },
  { status: "paid", accessibleName: "Payment complete" },
  { status: "underpaid", accessibleName: "Additional payment required" },
  {
    status: "overpaid",
    accessibleName: "Payment received with an excess amount",
  },
  { status: "expired", accessibleName: "Quote expired" },
  { status: "failed", accessibleName: "Payment could not be settled" },
] as const satisfies readonly {
  status: PaymentStatus;
  accessibleName: string;
}[];

for (const scenario of outcomeScenarios) {
  test(`has no automated violations in the ${scenario.status} outcome`, async ({
    page,
    request,
  }) => {
    await page.goto("/");
    const payment = await createEthereumPayment(page);
    await configureStatus(request, payment.payment_reference, scenario.status);

    await expect(
      page.getByRole("status", { name: scenario.accessibleName }),
    ).toBeVisible({ timeout: 5_000 });
    await expectNoAccessibilityViolations(page);
  });
}
