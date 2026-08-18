import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { developmentConfirmationResponseSchema } from "@/features/checkout/api/contracts/development";
import { createPaymentRequestSchema } from "@/features/checkout/api/contracts/payments";
import {
  conflictProblemSchema,
  notFoundProblemSchema,
} from "@/features/checkout/api/contracts/problem";
import { PAYMENT_STATUS } from "@/features/checkout/api/contracts/payment-status-values";
import { createMockPayment } from "@/mocks/quote-factory";
import { paymentScenarioStore } from "@/mocks/scenario-store";

import { POST } from "./route";

const now = new Date("2026-08-14T08:44:02.120Z");

const registerConfirmingPayment = () => {
  const payment = createMockPayment(
    createPaymentRequestSchema.parse({
      order_id: "ORD-88213",
      currency: "USDT",
      network: "ethereum",
    }),
    now,
  );
  paymentScenarioStore.registerPayment(payment, now);
  paymentScenarioStore.configure(
    payment.payment_reference,
    {
      scenario: { mode: "exact_state", status: PAYMENT_STATUS.confirming },
      response_delay_ms: 0,
      failure: { mode: "none" },
    },
    now,
  );
  return payment;
};

const request = (paymentReference: string): Request =>
  new Request("http://localhost/api/dev/confirmation", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ payment_reference: paymentReference }),
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

describe("development confirmation API", () => {
  it("moves detected funds to their first confirmation", async () => {
    const payment = registerConfirmingPayment();
    paymentScenarioStore.configure(
      payment.payment_reference,
      {
        scenario: { mode: "exact_state", status: PAYMENT_STATUS.detected },
        response_delay_ms: 0,
        failure: { mode: "none" },
      },
      now,
    );

    const response = await POST(request(payment.payment_reference));
    const result = developmentConfirmationResponseSchema.parse(
      await response.json(),
    );

    expect(result.update).toMatchObject({
      status: "confirming",
      confirmations: 1,
      required_confirmations: 3,
    });
    expect(result.configuration.scenario).toEqual({
      mode: "exact_state",
      status: "confirming",
    });
  });

  it("records the next confirmation and returns the current scenario", async () => {
    const payment = registerConfirmingPayment();
    const response = await POST(request(payment.payment_reference));
    const result = developmentConfirmationResponseSchema.parse(
      await response.json(),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(result.update).toMatchObject({
      status: "confirming",
      confirmations: 2,
      required_confirmations: 3,
    });
    expect(result.configuration.scenario).toEqual({
      mode: "exact_state",
      status: "confirming",
    });
  });

  it("rejects a confirmation signal outside detected or confirming state", async () => {
    const payment = registerConfirmingPayment();
    paymentScenarioStore.configure(
      payment.payment_reference,
      {
        scenario: {
          mode: "exact_state",
          status: PAYMENT_STATUS.awaiting_payment,
        },
        response_delay_ms: 0,
        failure: { mode: "none" },
      },
      now,
    );

    const response = await POST(request(payment.payment_reference));
    const problem = conflictProblemSchema.parse(await response.json());

    expect(response.status).toBe(409);
    expect(problem.detail).toMatch(/not currently waiting/iu);
  });

  it("returns not found for an unknown payment", async () => {
    const response = await POST(request("AQH-100306-PMT"));
    const problem = notFoundProblemSchema.parse(await response.json());

    expect(response.status).toBe(404);
    expect(problem.detail).toMatch(/not found/iu);
  });

  it("is unavailable in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const payment = registerConfirmingPayment();

    const response = await POST(request(payment.payment_reference));

    expect(response.status).toBe(404);
  });
});
