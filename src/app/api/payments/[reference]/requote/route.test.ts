import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PAYMENT_STATUS } from "@/features/checkout/api/contracts/payment-status-values";
import {
  createPaymentRequestSchema,
  requotePaymentResponseSchema,
} from "@/features/checkout/api/contracts/payments";
import {
  badRequestProblemSchema,
  conflictProblemSchema,
  notFoundProblemSchema,
  quoteNotExpiredProblemSchema,
} from "@/features/checkout/api/contracts/problem";
import { createMockPayment } from "@/mocks/quote-factory";
import { paymentScenarioStore } from "@/mocks/scenario-store";

import { POST } from "./route";

const quoteCreatedAt = new Date("2026-08-14T08:49:10.842Z");
const quoteExpiresAt = new Date("2026-08-14T08:52:10.842Z");

const context = (reference: string) => {
  return { params: Promise.resolve({ reference }) };
};

const requoteRequest = (body: unknown): Request => {
  return new Request("http://localhost/api/payments/AQH-100306-PMT/requote", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
};

const registerPayment = () => {
  const payment = createMockPayment(
    createPaymentRequestSchema.parse({
      order_id: "ORD-88213",
      currency: "USDT",
      network: "tron",
    }),
    quoteCreatedAt,
  );
  paymentScenarioStore.registerPayment(payment, quoteCreatedAt);
  return payment;
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(quoteCreatedAt);
  paymentScenarioStore.clear();
});

afterEach(() => {
  vi.useRealTimers();
  paymentScenarioStore.clear();
});

describe("POST /api/payments/:reference/requote", () => {
  it("returns the documented 409 problem before an awaiting quote expires", async () => {
    const payment = registerPayment();
    vi.setSystemTime(new Date("2026-08-14T08:50:10.842Z"));

    const response = await POST(
      requoteRequest({ currency: "USDC", network: "polygon" }),
      context(payment.payment_reference),
    );
    const problem = quoteNotExpiredProblemSchema.parse(await response.json());

    expect(response.status).toBe(409);
    expect(response.headers.get("content-type")).toContain(
      "application/problem+json",
    );
    expect(problem).toEqual({
      type: "https://developers.triple-a.io/errors/quote-not-expired",
      title: "Quote has not expired",
      status: 409,
      detail: "The current quote is valid until 2026-08-14T08:52:10.842Z.",
    });
    expect(
      paymentScenarioStore.getPayment(payment.payment_reference).quote.network,
    ).toBe("tron");
  });

  it("replaces the complete quote at the exact deadline", async () => {
    const payment = registerPayment();
    vi.setSystemTime(quoteExpiresAt);

    const response = await POST(
      requoteRequest({ currency: "USDC", network: "polygon" }),
      context(payment.payment_reference),
    );
    const requoted = requotePaymentResponseSchema.parse(await response.json());

    expect(response.status).toBe(201);
    expect(requoted).toMatchObject({
      payment_reference: payment.payment_reference,
      order_id: payment.order_id,
      status: "awaiting_payment",
      quote: {
        crypto_currency: "USDC",
        network: "polygon",
        network_name: "Polygon",
        total_due: "163.35",
      },
    });
    expect(requoted.quote.expires_at).toBe("2026-08-14T08:55:10.842Z");
    expect(
      paymentScenarioStore.getConfiguration(payment.payment_reference),
    ).toEqual({
      scenario: { mode: "exact_state", status: "awaiting_payment" },
      response_delay_ms: 0,
      failure: { mode: "none" },
    });
  });

  it("allows an authoritative expired state before the local quote deadline", async () => {
    const payment = registerPayment();
    paymentScenarioStore.configure(
      payment.payment_reference,
      {
        scenario: { mode: "exact_state", status: "expired" },
        response_delay_ms: 0,
        failure: { mode: "none" },
      },
      quoteCreatedAt,
    );

    const response = await POST(
      requoteRequest({ currency: "ETH", network: "ethereum" }),
      context(payment.payment_reference),
    );
    const requoted = requotePaymentResponseSchema.parse(await response.json());

    expect(response.status).toBe(201);
    expect(requoted.quote).toMatchObject({
      crypto_currency: "ETH",
      network: "ethereum",
    });
  });

  it("rejects replacing a detected payment even after wall-clock expiry", async () => {
    const payment = registerPayment();
    paymentScenarioStore.configure(
      payment.payment_reference,
      {
        scenario: { mode: "exact_state", status: "detected" },
        response_delay_ms: 0,
        failure: { mode: "none" },
      },
      quoteCreatedAt,
    );
    vi.setSystemTime(new Date("2026-08-14T08:53:10.842Z"));

    const response = await POST(
      requoteRequest({ currency: "USDC", network: "polygon" }),
      context(payment.payment_reference),
    );
    const problem = conflictProblemSchema.parse(await response.json());

    expect(response.status).toBe(409);
    expect(problem.detail).toMatch(/current state/i);
    expect(
      paymentScenarioStore.peekStatus(payment.payment_reference).status,
    ).toBe(PAYMENT_STATUS.detected);
  });

  it("rejects an unsupported pair before evaluating quote timing", async () => {
    const payment = registerPayment();

    const response = await POST(
      requoteRequest({ currency: "USDT", network: "solana" }),
      context(payment.payment_reference),
    );
    const problem = badRequestProblemSchema.parse(await response.json());

    expect(response.status).toBe(400);
    expect(problem.detail).toMatch(/not available/i);
  });

  it("returns a typed 404 for an unknown reference", async () => {
    const response = await POST(
      requoteRequest({ currency: "USDC", network: "polygon" }),
      context("UNKNOWN"),
    );
    const problem = notFoundProblemSchema.parse(await response.json());

    expect(response.status).toBe(404);
    expect(problem.detail).toMatch(/not found/i);
  });

  it("returns a typed 400 for a malformed request body", async () => {
    const payment = registerPayment();
    const response = await POST(
      requoteRequest({ currency: "USDC", network: "polygon", force: true }),
      context(payment.payment_reference),
    );
    const problem = badRequestProblemSchema.parse(await response.json());

    expect(response.status).toBe(400);
    expect(problem.detail).toMatch(/currency and network/i);
  });
});
