import { expect, type Locator, test } from "@playwright/test";

import { createPaymentRequestSchema } from "@/features/checkout/api/contracts/payments";
import { createMockPayment } from "@/mocks/quote-factory";

type Rgb = Readonly<{ red: number; green: number; blue: number }>;

const relativeLuminance = ({ red, green, blue }: Rgb): number => {
  const linear = [red, green, blue].map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.04045
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  });

  return (
    0.2126 * (linear[0] ?? 0) +
    0.7152 * (linear[1] ?? 0) +
    0.0722 * (linear[2] ?? 0)
  );
};

const contrastRatio = (foreground: Rgb, background: Rgb): number => {
  const lighter = Math.max(
    relativeLuminance(foreground),
    relativeLuminance(background),
  );
  const darker = Math.min(
    relativeLuminance(foreground),
    relativeLuminance(background),
  );

  return (lighter + 0.05) / (darker + 0.05);
};

const renderedContrast = async (locator: Locator): Promise<number> => {
  const colors = await locator.evaluate((element) => {
    const toRgb = (cssColor: string): Rgb => {
      const canvas = document.createElement("canvas");
      canvas.width = 1;
      canvas.height = 1;
      const context = canvas.getContext("2d");

      if (!context) {
        throw new Error("Canvas color conversion is unavailable");
      }

      context.fillStyle = cssColor;
      context.fillRect(0, 0, 1, 1);
      const [red = 0, green = 0, blue = 0] = context.getImageData(
        0,
        0,
        1,
        1,
      ).data;

      return { red, green, blue };
    };

    const foreground = toRgb(getComputedStyle(element).color);
    let current: Element | null = element;

    while (current) {
      const background = getComputedStyle(current).backgroundColor;
      if (background !== "transparent" && background !== "rgba(0, 0, 0, 0)") {
        return { foreground, background: toRgb(background) };
      }
      current = current.parentElement;
    }

    throw new Error("No opaque background found for contrast check");
  });

  return contrastRatio(colors.foreground, colors.background);
};

test("keeps the issued quote keyboard- and mobile-safe", async ({ page }) => {
  await page.route("**/api/payments", async (route) => {
    const request = createPaymentRequestSchema.parse(
      route.request().postDataJSON(),
    );
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify(createMockPayment(request)),
    });
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");

  const polygon = page.getByRole("radio", { name: "USDC on Polygon" });
  const polygonCard = page.locator(
    'label:has(input[aria-label="USDC on Polygon"])',
  );
  await expect(polygon).toBeVisible();
  expect(
    await polygonCard.evaluate(
      (element) => getComputedStyle(element).transitionDuration,
    ),
  ).toBe("0s");

  const paymentResponsePromise = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/payments") &&
      response.request().method() === "POST",
  );
  await polygon.focus();
  await page.keyboard.press("Space");
  expect((await paymentResponsePromise).status()).toBe(201);

  const quoteStatus = page.getByRole("status", { name: "Quote created" });
  const instructions = page.getByRole("region", { name: "Send exactly" });
  const warning = page.getByRole("complementary", {
    name: "Use only Polygon",
  });
  await expect(quoteStatus).toBeVisible();
  await expect(instructions).toBeVisible();
  await expect(warning).toBeVisible();

  const layout = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth);

  const qrImage = page.getByRole("img", {
    name: "USDC destination address QR code for Polygon",
  });
  const qrBox = await qrImage.boundingBox();
  expect(qrBox).not.toBeNull();
  expect(qrBox?.width).toBeLessThanOrEqual(240);
  expect(qrBox?.width).toBeLessThanOrEqual(layout.clientWidth - 32);

  const addressFits = await page
    .getByText("mock-usdc-polygon-destination")
    .evaluate((element) => element.scrollWidth <= element.clientWidth);
  expect(addressFits).toBe(true);

  for (const button of [
    page.getByRole("button", { name: "Copy address" }),
    page.getByRole("button", { name: "Change payment method" }),
  ]) {
    const box = await button.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(44);
  }

  expect(
    await renderedContrast(
      instructions.locator("p").filter({ hasText: "The amount and network" }),
    ),
  ).toBeGreaterThanOrEqual(4.5);
  expect(
    await renderedContrast(warning.locator("p").last()),
  ).toBeGreaterThanOrEqual(4.5);
  expect(
    await renderedContrast(quoteStatus.locator("p").last()),
  ).toBeGreaterThanOrEqual(4.5);

  await page.setViewportSize({ width: 1_440, height: 1_000 });
  const transferLabelBox = await instructions
    .getByText("Transfer instructions")
    .boundingBox();
  const countdownBox = await page.getByRole("timer").boundingBox();
  const qrPanelBox = await qrImage.locator("..").boundingBox();

  expect(transferLabelBox).not.toBeNull();
  expect(countdownBox).not.toBeNull();
  expect(qrPanelBox).not.toBeNull();
  expect(
    Math.abs((qrPanelBox?.y ?? 0) - (transferLabelBox?.y ?? 0)),
  ).toBeLessThanOrEqual(1);
  expect(
    Math.abs(
      (qrPanelBox?.y ?? 0) +
        (qrPanelBox?.height ?? 0) -
        ((countdownBox?.y ?? 0) + (countdownBox?.height ?? 0)),
    ),
  ).toBeLessThanOrEqual(1);

  const changeButton = page.getByRole("button", {
    name: "Change payment method",
  });
  await changeButton.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("radio")).toHaveCount(6);
  await expect(page.getByRole("alertdialog")).toHaveCount(0);
});

test("presents a catalog failure as an accessible recoverable error", async ({
  page,
}) => {
  await page.route("**/api/currencies", (route) =>
    route.fulfill({
      status: 500,
      contentType: "application/problem+json",
      body: JSON.stringify({
        type: "about:blank",
        title: "Internal Server Error",
        status: 500,
        detail: "A simulated server error occurred.",
      }),
    }),
  );
  await page.goto("/");

  const alert = page
    .getByRole("alert")
    .filter({ hasText: "Payment methods could not be loaded" });
  await expect(alert).toContainText("Payment methods could not be loaded");
  await expect(alert).toContainText("No payment has started");
  expect(
    await renderedContrast(alert.locator("p").last()),
  ).toBeGreaterThanOrEqual(4.5);

  const retry = page.getByRole("button", { name: "Try again" });
  const box = await retry.boundingBox();
  expect(box?.height).toBeGreaterThanOrEqual(44);
  await retry.focus();
  await expect(retry).toBeFocused();
});
