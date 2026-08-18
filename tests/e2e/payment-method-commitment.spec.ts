import { expect, test } from "@playwright/test";

import type { PaymentScenarioConfiguration } from "@/features/checkout/api/contracts/development";
import { createPaymentResponseSchema } from "@/features/checkout/api/contracts/payments";

test("changes network only through a guarded new quote and locks after detection", async ({
  page,
  request,
}) => {
  await page.goto("/");

  const firstCreateResponsePromise = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/payments") &&
      response.request().method() === "POST",
  );
  await page
    .locator('label:has(input[aria-label="USDT on Tron (TRC-20)"])')
    .click();
  const firstPayment = createPaymentResponseSchema.parse(
    await (await firstCreateResponsePromise).json(),
  );

  const firstInstructions = page.getByRole("region", { name: "Send exactly" });
  const tronWarning = page.getByRole("complementary", {
    name: "Use only Tron (TRC-20)",
  });
  await expect(firstInstructions).toContainText(
    "Use the Tron (TRC-20) network",
  );
  await expect(tronWarning).toContainText(
    "A different asset or network may permanently lose your funds",
  );
  await expect(
    page.getByRole("img", {
      name: "USDT destination address QR code for Tron (TRC-20)",
    }),
  ).toHaveAttribute(
    "data-payment-qr-payload",
    firstPayment.quote.crypto_address,
  );

  const changeMethod = page.getByRole("button", {
    name: "Change payment method",
  });
  await changeMethod.click();
  const confirmation = page.getByRole("alertdialog", {
    name: "Confirm payment method change",
  });
  await expect(confirmation).toContainText(
    "If you already sent funds, keep this quote and wait for detection",
  );
  await confirmation
    .getByRole("button", { name: "Keep current quote" })
    .click();
  await expect(changeMethod).toBeFocused();
  await expect(firstInstructions).toContainText(firstPayment.quote.total_due);
  await expect(page.getByText(firstPayment.quote.crypto_address)).toBeVisible();

  await changeMethod.click();
  await confirmation
    .getByRole("button", {
      name: "I have not sent funds — change method",
    })
    .click();

  await expect(firstInstructions).toHaveCount(0);
  await expect(page.getByText(firstPayment.quote.crypto_address)).toHaveCount(
    0,
  );
  await expect(page.getByRole("radio")).toHaveCount(6);

  const secondCreateResponsePromise = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/payments") &&
      response.request().method() === "POST",
  );
  await page
    .locator('label:has(input[aria-label="USDT on Ethereum (ERC-20)"])')
    .click();
  const secondPayment = createPaymentResponseSchema.parse(
    await (await secondCreateResponsePromise).json(),
  );
  expect(secondPayment.payment_reference).not.toBe(
    firstPayment.payment_reference,
  );

  const secondInstructions = page.getByRole("region", {
    name: "Send exactly",
  });
  const ethereumWarning = page.getByRole("complementary", {
    name: "Use only Ethereum (ERC-20)",
  });
  await expect(
    page.getByRole("status", { name: "Quote created" }),
  ).toContainText("USDT on Ethereum (ERC-20)");
  await expect(secondInstructions).toContainText(
    `Use the Ethereum (ERC-20) network`,
  );
  await expect(secondInstructions).toContainText(secondPayment.quote.total_due);
  await expect(ethereumWarning).toContainText(
    "Send only USDT on Ethereum (ERC-20)",
  );
  await expect(
    page.getByText(secondPayment.quote.crypto_address),
  ).toBeVisible();
  await expect(
    page.getByRole("img", {
      name: "USDT destination address QR code for Ethereum (ERC-20)",
    }),
  ).toHaveAttribute(
    "data-payment-qr-payload",
    secondPayment.quote.crypto_address,
  );

  const detectedConfiguration: PaymentScenarioConfiguration = {
    scenario: { mode: "exact_state", status: "detected" },
    response_delay_ms: 0,
    failure: { mode: "none" },
  };
  const configureDetected = await request.put("/api/dev/scenario", {
    data: {
      payment_reference: secondPayment.payment_reference,
      configuration: detectedConfiguration,
    },
  });
  expect(configureDetected.ok()).toBe(true);

  const detected = page.getByRole("status", { name: "Payment detected" });
  await expect(detected).toContainText("USDT on Ethereum (ERC-20)", {
    timeout: 5_000,
  });
  await expect(detected).toContainText("Do not send another payment");
  await expect(changeMethod).toHaveCount(0);
  await expect(page.getByRole("radio")).toHaveCount(0);
});
