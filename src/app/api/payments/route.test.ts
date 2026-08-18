import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createPaymentResponseSchema } from "@/features/checkout/api/contracts/payments";
import { badRequestProblemSchema } from "@/features/checkout/api/contracts/problem";
import { paymentScenarioStore } from "@/mocks/scenario-store";

import { POST as REQUOTE } from "./[reference]/requote/route";

import { POST } from "./route";

const paymentRequest = (body: string): Request => {
  return new Request("http://localhost/api/payments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
};

const validPaymentRequest = (): Request => {
  return paymentRequest(
    JSON.stringify({
      order_id: "ORD-88213",
      currency: "USDT",
      network: "tron",
    }),
  );
};

beforeEach(() => {
  paymentScenarioStore.clear();
});

afterEach(() => {
  vi.useRealTimers();
  paymentScenarioStore.clear();
});

describe("POST /api/payments", () => {
  it("returns a contract-valid payment with a three-minute quote", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-14T08:49:10.842Z"));

    const response = await POST(
      paymentRequest(
        JSON.stringify({
          order_id: "ORD-88213",
          currency: "USDT",
          network: "tron",
        }),
      ),
    );
    const payment = createPaymentResponseSchema.parse(await response.json());

    expect(response.status).toBe(201);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(payment.quote.expires_at).toBe("2026-08-14T08:52:10.842Z");
    expect(payment.quote).toMatchObject({
      crypto_currency: "USDT",
      network: "tron",
      network_name: "Tron (TRC-20)",
      total_due: "163.69",
    });
    expect(paymentScenarioStore.has(payment.payment_reference)).toBe(true);
    expect(
      paymentScenarioStore.simulate(payment.payment_reference),
    ).toMatchObject({
      outcome: "response",
      update: { status: "awaiting_payment" },
    });
  });

  it("keeps simultaneous checkout sessions isolated by payment reference", async () => {
    vi.useFakeTimers();
    const firstCreatedAt = new Date("2026-08-14T08:49:10.842Z");
    vi.setSystemTime(firstCreatedAt);
    const first = createPaymentResponseSchema.parse(
      await (await POST(validPaymentRequest())).json(),
    );

    vi.setSystemTime(new Date(firstCreatedAt.getTime() + 60_000));
    const second = createPaymentResponseSchema.parse(
      await (await POST(validPaymentRequest())).json(),
    );

    expect(second.payment_reference).not.toBe(first.payment_reference);
    expect(paymentScenarioStore.has(first.payment_reference)).toBe(true);
    expect(paymentScenarioStore.has(second.payment_reference)).toBe(true);

    vi.setSystemTime(new Date(first.quote.expires_at));
    const requoteResponse = await REQUOTE(
      new Request(
        `http://localhost/api/payments/${first.payment_reference}/requote`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ currency: "USDC", network: "polygon" }),
        },
      ),
      { params: Promise.resolve({ reference: first.payment_reference }) },
    );

    expect(requoteResponse.status).toBe(201);
    expect(
      paymentScenarioStore.getPayment(second.payment_reference).quote
        .expires_at,
    ).toBe(second.quote.expires_at);
  });

  it.each([
    ["malformed JSON", "{"],
    [
      "a missing order id",
      JSON.stringify({ currency: "USDT", network: "tron" }),
    ],
    [
      "an unknown field",
      JSON.stringify({
        order_id: "ORD-88213",
        currency: "USDT",
        network: "tron",
        amount: "149.90",
      }),
    ],
  ])("returns a generic 400 problem for %s", async (_caseName, body) => {
    const response = await POST(paymentRequest(body));
    const problem = badRequestProblemSchema.parse(await response.json());

    expect(response.status).toBe(400);
    expect(response.headers.get("content-type")).toContain(
      "application/problem+json",
    );
    expect(problem.detail).toMatch(/request body/i);
  });

  it.each([
    ["a network offered for another currency", "USDT", "solana"],
    ["identifiers absent from the catalog", "UNKNOWN", "unknown"],
  ])(
    "returns a generic 400 problem for %s",
    async (_caseName, currency, network) => {
      const response = await POST(
        paymentRequest(
          JSON.stringify({ order_id: "ORD-88213", currency, network }),
        ),
      );
      const problem = badRequestProblemSchema.parse(await response.json());

      expect(response.status).toBe(400);
      expect(response.headers.get("content-type")).toContain(
        "application/problem+json",
      );
      expect(problem.detail).toMatch(/not available/i);
    },
  );
});
