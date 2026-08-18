import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createPaymentRequestSchema } from "@/features/checkout/api/contracts/payments";
import { createMockPayment } from "@/mocks/quote-factory";
import {
  paymentRequestMetricsResponseSchema,
  requestInstrumentation,
} from "@/mocks/request-instrumentation";
import { paymentScenarioStore } from "@/mocks/scenario-store";

import { DELETE, GET } from "./route";

function request(reference?: string): Request {
  const url = new URL("http://localhost/api/dev/requests");

  if (reference !== undefined) {
    url.searchParams.set("payment_reference", reference);
  }

  return new Request(url);
}

function registerPayment() {
  const payment = createMockPayment(
    createPaymentRequestSchema.parse({
      order_id: "ORD-88213",
      currency: "USDT",
      network: "tron",
    }),
  );
  paymentScenarioStore.registerPayment(payment);
  return payment;
}

beforeEach(() => {
  paymentScenarioStore.clear();
  requestInstrumentation.reset();
});

afterEach(() => {
  vi.unstubAllEnvs();
  paymentScenarioStore.clear();
  requestInstrumentation.reset();
});

describe("development request metrics API", () => {
  it("returns current request metrics for a registered payment", async () => {
    const payment = registerPayment();
    const complete = requestInstrumentation.begin(payment.payment_reference);

    const response = GET(request(payment.payment_reference));
    const metrics = paymentRequestMetricsResponseSchema.parse(
      await response.json(),
    );
    complete();

    expect(response.status).toBe(200);
    expect(metrics.metrics).toEqual({
      current_in_flight: 1,
      maximum_in_flight: 1,
      total_started: 1,
      total_completed: 0,
    });
  });

  it("resets metrics for a registered payment", async () => {
    const payment = registerPayment();
    requestInstrumentation.begin(payment.payment_reference)();

    const response = DELETE(request(payment.payment_reference));
    const metrics = paymentRequestMetricsResponseSchema.parse(
      await response.json(),
    );

    expect(response.status).toBe(200);
    expect(metrics.metrics).toEqual({
      current_in_flight: 0,
      maximum_in_flight: 0,
      total_started: 0,
      total_completed: 0,
    });
  });

  it.each([undefined, "UNKNOWN"])(
    "rejects unavailable reference %j",
    (reference) => {
      const response = GET(request(reference));
      expect(response.status).toBe(reference === undefined ? 400 : 404);
    },
  );

  it("returns 404 in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    const payment = registerPayment();

    expect(GET(request(payment.payment_reference)).status).toBe(404);
  });
});
