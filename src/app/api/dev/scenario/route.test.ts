import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createPaymentRequestSchema } from "@/features/checkout/api/contracts/payments";
import { badRequestProblemSchema } from "@/features/checkout/api/contracts/problem";
import { createMockPayment } from "@/mocks/quote-factory";
import {
  paymentScenarioControlResponseSchema,
  paymentScenarioStore,
} from "@/mocks/scenario-store";

import { GET, PUT } from "./route";

const now = new Date("2026-08-14T08:44:02.120Z");

function registerPayment(currency = "USDT", network = "ethereum") {
  const payment = createMockPayment(
    createPaymentRequestSchema.parse({
      order_id: "ORD-88213",
      currency,
      network,
    }),
    now,
  );
  paymentScenarioStore.registerPayment(payment, now);
  return payment;
}

function getRequest(paymentReference: string): Request {
  const url = new URL("http://localhost/api/dev/scenario");
  url.searchParams.set("payment_reference", paymentReference);
  return new Request(url);
}

function putRequest(body: unknown): Request {
  return new Request("http://localhost/api/dev/scenario", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  paymentScenarioStore.clear();
});

afterEach(() => {
  vi.unstubAllEnvs();
  paymentScenarioStore.clear();
});

describe("development scenario API", () => {
  it("reads the default configuration for a registered payment", async () => {
    const payment = registerPayment();

    const response = await GET(getRequest(payment.payment_reference));
    const control = paymentScenarioControlResponseSchema.parse(
      await response.json(),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(control).toEqual({
      payment_reference: payment.payment_reference,
      configuration: {
        scenario: { mode: "exact_state", status: "awaiting_payment" },
        response_delay_ms: 0,
        failure: { mode: "none" },
      },
    });
  });

  it("replaces the full scenario configuration", async () => {
    const payment = registerPayment();
    const response = await PUT(
      putRequest({
        payment_reference: payment.payment_reference,
        configuration: {
          scenario: { mode: "exact_state", status: "paid" },
          response_delay_ms: 2_500,
          failure: { mode: "next_request", kind: "http_500" },
        },
      }),
    );
    const control = paymentScenarioControlResponseSchema.parse(
      await response.json(),
    );

    expect(response.status).toBe(200);
    expect(control.configuration).toEqual({
      scenario: { mode: "exact_state", status: "paid" },
      response_delay_ms: 2_500,
      failure: { mode: "next_request", kind: "http_500" },
    });
  });

  it.each([
    ["a missing payment reference", {}],
    [
      "an unknown status",
      {
        payment_reference: "AQH-100306-PMT",
        configuration: {
          scenario: { mode: "exact_state", status: "refunded" },
          response_delay_ms: 0,
          failure: { mode: "none" },
        },
      },
    ],
  ])("returns 400 for %s", async (_caseName, body) => {
    const response = await PUT(putRequest(body));
    const problem = badRequestProblemSchema.parse(await response.json());

    expect(response.status).toBe(400);
    expect(problem.detail).toMatch(/valid payment reference/i);
  });

  it("rejects a confirming state incompatible with a one-confirmation quote", async () => {
    const payment = registerPayment("USDT", "tron");
    const response = await PUT(
      putRequest({
        payment_reference: payment.payment_reference,
        configuration: {
          scenario: { mode: "exact_state", status: "confirming" },
          response_delay_ms: 0,
          failure: { mode: "none" },
        },
      }),
    );
    const problem = badRequestProblemSchema.parse(await response.json());

    expect(response.status).toBe(400);
    expect(problem.detail).toMatch(/not compatible/i);
    expect(
      paymentScenarioStore.getConfiguration(payment.payment_reference).scenario,
    ).toEqual({ mode: "exact_state", status: "awaiting_payment" });
  });

  it("is unavailable when the runtime is production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const payment = registerPayment();

    const response = await GET(getRequest(payment.payment_reference));

    expect(response.status).toBe(404);
  });
});
