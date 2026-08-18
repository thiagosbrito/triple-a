import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { paymentStatusUpdateSchema } from "@/features/checkout/api/contracts/payment-status";
import { PAYMENT_STATUS } from "@/features/checkout/api/contracts/payment-status-values";
import { createPaymentRequestSchema } from "@/features/checkout/api/contracts/payments";
import {
  internalServerErrorProblemSchema,
  notFoundProblemSchema,
} from "@/features/checkout/api/contracts/problem";
import { createMockPayment } from "@/mocks/quote-factory";
import { requestInstrumentation } from "@/mocks/request-instrumentation";
import { paymentScenarioStore } from "@/mocks/scenario-store";

import { GET } from "./route";

const now = new Date("2026-08-14T08:44:02.120Z");

const request = (reference: string): Request => {
  return new Request(`http://localhost/api/payments/${reference}`);
};

const context = (reference: string) => {
  return { params: Promise.resolve({ reference }) };
};

const createRegisteredPayment = () => {
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

const configuration = (
  status: string,
  options: {
    responseDelayMilliseconds?: number;
    failure?:
      | { mode: "none" }
      | {
          mode: "next_request" | "persistent";
          kind: "http_500" | "network_disconnect";
        };
  } = {},
) => {
  return {
    scenario: { mode: "exact_state", status },
    response_delay_ms: options.responseDelayMilliseconds ?? 0,
    failure: options.failure ?? { mode: "none" },
  };
};

beforeEach(() => {
  paymentScenarioStore.clear();
  requestInstrumentation.reset();
});

afterEach(() => {
  vi.useRealTimers();
  paymentScenarioStore.clear();
  requestInstrumentation.reset();
});

describe("GET /api/payments/:reference", () => {
  it.each(Object.values(PAYMENT_STATUS))(
    "returns the configured %s status",
    async (status) => {
      const payment = createRegisteredPayment();
      paymentScenarioStore.configure(
        payment.payment_reference,
        configuration(status),
        now,
      );

      const response = await GET(
        request(payment.payment_reference),
        context(payment.payment_reference),
      );
      const update = paymentStatusUpdateSchema.parse(await response.json());

      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain(
        "application/json",
      );
      expect(update.status).toBe(status);
    },
  );

  it.each(["UNKNOWN", " "])(
    "returns a typed 404 problem for reference %j",
    async (reference) => {
      const response = await GET(request("UNKNOWN"), context(reference));
      const problem = notFoundProblemSchema.parse(await response.json());

      expect(response.status).toBe(404);
      expect(response.headers.get("content-type")).toContain(
        "application/problem+json",
      );
      expect(problem.detail).toMatch(/not found/i);
    },
  );

  it("waits for the configured delay before responding", async () => {
    vi.useFakeTimers();
    const payment = createRegisteredPayment();
    paymentScenarioStore.configure(
      payment.payment_reference,
      configuration(PAYMENT_STATUS.detected, {
        responseDelayMilliseconds: 5_000,
      }),
      now,
    );
    let resolved = false;
    const responsePromise = GET(
      request(payment.payment_reference),
      context(payment.payment_reference),
    ).then((response) => {
      resolved = true;
      return response;
    });

    await vi.advanceTimersByTimeAsync(4_999);
    expect(resolved).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    expect((await responsePromise).status).toBe(200);
  });

  it("consumes a one-shot HTTP failure without changing payment state", async () => {
    const payment = createRegisteredPayment();
    paymentScenarioStore.configure(
      payment.payment_reference,
      configuration(PAYMENT_STATUS.detected, {
        failure: { mode: "next_request", kind: "http_500" },
      }),
      now,
    );

    const failedResponse = await GET(
      request(payment.payment_reference),
      context(payment.payment_reference),
    );
    const problem = internalServerErrorProblemSchema.parse(
      await failedResponse.json(),
    );
    const recoveredResponse = await GET(
      request(payment.payment_reference),
      context(payment.payment_reference),
    );
    const recovered = paymentStatusUpdateSchema.parse(
      await recoveredResponse.json(),
    );

    expect(failedResponse.status).toBe(500);
    expect(problem.detail).toMatch(/simulated server error/i);
    expect(recovered.status).toBe(PAYMENT_STATUS.detected);
  });

  it("keeps a persistent HTTP failure active", async () => {
    const payment = createRegisteredPayment();
    paymentScenarioStore.configure(
      payment.payment_reference,
      configuration(PAYMENT_STATUS.awaiting_payment, {
        failure: { mode: "persistent", kind: "http_500" },
      }),
      now,
    );

    const first = await GET(
      request(payment.payment_reference),
      context(payment.payment_reference),
    );
    const second = await GET(
      request(payment.payment_reference),
      context(payment.payment_reference),
    );

    expect(first.status).toBe(500);
    expect(second.status).toBe(500);
  });

  it("returns an errored body for a simulated network disconnect", async () => {
    const payment = createRegisteredPayment();
    paymentScenarioStore.configure(
      payment.payment_reference,
      configuration(PAYMENT_STATUS.awaiting_payment, {
        failure: { mode: "next_request", kind: "network_disconnect" },
      }),
      now,
    );

    const response = await GET(
      request(payment.payment_reference),
      context(payment.payment_reference),
    );

    await expect(response.text()).rejects.toThrow(/network disconnect/i);
  });

  it("records overlapping delayed requests for later client assertions", async () => {
    vi.useFakeTimers();
    const payment = createRegisteredPayment();
    paymentScenarioStore.configure(
      payment.payment_reference,
      configuration(PAYMENT_STATUS.awaiting_payment, {
        responseDelayMilliseconds: 1_000,
      }),
      now,
    );

    const first = GET(
      request(payment.payment_reference),
      context(payment.payment_reference),
    );
    const second = GET(
      request(payment.payment_reference),
      context(payment.payment_reference),
    );
    await vi.advanceTimersByTimeAsync(0);

    expect(requestInstrumentation.snapshot(payment.payment_reference)).toEqual({
      current_in_flight: 2,
      maximum_in_flight: 2,
      total_started: 2,
      total_completed: 0,
    });

    await vi.advanceTimersByTimeAsync(1_000);
    await Promise.all([first, second]);

    expect(requestInstrumentation.snapshot(payment.payment_reference)).toEqual({
      current_in_flight: 0,
      maximum_in_flight: 2,
      total_started: 2,
      total_completed: 2,
    });
  });
});
