import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { developmentQuoteExpiryResponseSchema } from "@/features/checkout/api/contracts/development";
import { createPaymentRequestSchema } from "@/features/checkout/api/contracts/payments";
import { badRequestProblemSchema } from "@/features/checkout/api/contracts/problem";
import { createMockPayment } from "@/mocks/quote-factory";
import { paymentScenarioStore } from "@/mocks/scenario-store";

import { POST } from "./route";

const now = new Date("2026-08-14T08:44:02.120Z");

const registerPayment = () => {
  const payment = createMockPayment(
    createPaymentRequestSchema.parse({
      order_id: "ORD-88213",
      currency: "USDT",
      network: "ethereum",
    }),
    now,
  );
  paymentScenarioStore.registerPayment(payment, now);
  return payment;
};

const request = (body: unknown): Request =>
  new Request("http://localhost/api/dev/quote-expiry", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(now);
  paymentScenarioStore.clear();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
  paymentScenarioStore.clear();
});

describe("development quote expiry API", () => {
  it("moves the current quote deadline without replacing its reference", async () => {
    const payment = registerPayment();
    const response = await POST(
      request({
        payment_reference: payment.payment_reference,
        expires_in_seconds: 12,
      }),
    );
    const result = developmentQuoteExpiryResponseSchema.parse(
      await response.json(),
    );

    expect(response.status).toBe(200);
    expect(result.payment.payment_reference).toBe(payment.payment_reference);
    expect(result.payment.quote.expires_at).toBe("2026-08-14T08:44:14.120Z");
  });

  it("rejects an invalid expiry duration", async () => {
    const payment = registerPayment();
    const response = await POST(
      request({
        payment_reference: payment.payment_reference,
        expires_in_seconds: -1,
      }),
    );
    const problem = badRequestProblemSchema.parse(await response.json());

    expect(response.status).toBe(400);
    expect(problem.detail).toMatch(/expiry duration/iu);
  });

  it("is unavailable in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const payment = registerPayment();
    const response = await POST(
      request({
        payment_reference: payment.payment_reference,
        expires_in_seconds: 10,
      }),
    );

    expect(response.status).toBe(404);
  });
});
