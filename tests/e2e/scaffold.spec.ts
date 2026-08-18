import { expect, test } from "@playwright/test";

test.use({ permissions: ["clipboard-read", "clipboard-write"] });

test("serves the API-driven hosted checkout through Next.js", async ({
  page,
}) => {
  const externalRequests: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).hostname !== "127.0.0.1") {
      externalRequests.push(request.url());
    }
  });

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

  const paymentResponsePromise = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/payments") &&
      response.request().method() === "POST",
  );
  await page.locator('label:has(input[aria-label="USDC on Polygon"])').click();
  const paymentResponse = await paymentResponsePromise;
  expect(paymentResponse.status()).toBe(201);
  await expect(
    page.getByRole("status", { name: "Quote created" }),
  ).toContainText("USDC on Polygon");
  await expect(
    page.getByRole("heading", { level: 1, name: "Complete your payment" }),
  ).toBeVisible();
  await expect(paymentMethods).toHaveCount(0);
  await expect(
    page.getByRole("region", { name: "Send exactly" }),
  ).toContainText("163.35 USDC");
  await expect(
    page.getByRole("complementary", { name: "Use only Polygon" }),
  ).toContainText("Send only USDC on Polygon");

  const visibleAddress = page.getByText("mock-usdc-polygon-destination");
  const paymentQr = page.getByRole("img", {
    name: "USDC destination address QR code for Polygon",
  });
  await expect(visibleAddress).toHaveText("mock-usdc-polygon-destination");
  await expect(paymentQr).toHaveAttribute(
    "data-payment-qr-payload",
    "mock-usdc-polygon-destination",
  );
  expect(externalRequests).toEqual([]);

  const copyAddress = page.getByRole("button", { name: "Copy address" });
  await copyAddress.click();
  await expect(
    page.getByRole("status").filter({ hasText: "Address copied" }),
  ).toBeVisible();
  await expect(copyAddress).toBeFocused();

  await page.getByRole("button", { name: "Change payment method" }).click();
  await expect(page.getByRole("alertdialog")).toHaveCount(0);
  await expect(page.getByRole("status", { name: "Quote created" })).toHaveCount(
    0,
  );
  await expect(page.getByRole("radio")).toHaveCount(6);
  await expect(
    page.getByRole("heading", { level: 1, name: "Choose how to pay" }),
  ).toBeVisible();
});
