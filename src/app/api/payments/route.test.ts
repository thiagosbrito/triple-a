import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createPaymentResponseSchema } from "@/features/checkout/api/contracts/payments";
import { badRequestProblemSchema } from "@/features/checkout/api/contracts/problem";
import { paymentScenarioStore } from "@/mocks/scenario-store";

import { POST } from "./route";

function paymentRequest(body: string): Request {
  return new Request("http://localhost/api/payments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
}

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
