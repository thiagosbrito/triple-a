import { expect, test, type APIRequestContext } from "@playwright/test";

import { currenciesResponseSchema } from "@/features/checkout/api/contracts/currencies";
import { paymentRequestMetricsResponseSchema } from "@/features/checkout/api/contracts/development";
import { paymentStatusUpdateSchema } from "@/features/checkout/api/contracts/payment-status";
import {
  PAYMENT_STATUS,
  type PaymentStatus,
} from "@/features/checkout/api/contracts/payment-status-values";
import {
  createPaymentResponseSchema,
  requotePaymentResponseSchema,
} from "@/features/checkout/api/contracts/payments";
import {
  internalServerErrorProblemSchema,
  quoteNotExpiredProblemSchema,
} from "@/features/checkout/api/contracts/problem";

type FailureConfiguration =
  | { mode: "none" }
  | {
      mode: "next_request" | "persistent";
      kind: "http_500" | "network_disconnect";
    };

type ScenarioConfiguration = {
  scenario:
    { mode: "exact_state"; status: PaymentStatus } | { mode: "progression" };
  response_delay_ms: number;
  failure: FailureConfiguration;
};

const orderId = "ORD-E2E-MOCK-API";

const createPayment = async (api: APIRequestContext) => {
  const response = await api.post("/api/payments", {
    data: { order_id: orderId, currency: "USDT", network: "ethereum" },
  });

  expect(response.status()).toBe(201);
  return createPaymentResponseSchema.parse(await response.json());
};

const configureScenario = async (
  api: APIRequestContext,
  paymentReference: string,
  configuration: ScenarioConfiguration,
): Promise<void> => {
  const response = await api.put("/api/dev/scenario", {
    data: { payment_reference: paymentReference, configuration },
  });

  expect(response.status()).toBe(200);
};

const exactState = (
  status: PaymentStatus,
  options: {
    delay?: number;
    failure?: FailureConfiguration;
  } = {},
): ScenarioConfiguration => {
  return {
    scenario: { mode: "exact_state", status },
    response_delay_ms: options.delay ?? 0,
    failure: options.failure ?? { mode: "none" },
  };
};

test.describe("deterministic mock API", () => {
  test.describe.configure({ mode: "serial" });

  test("serves the catalog and every lifecycle state through HTTP", async ({
    request,
  }) => {
    const catalogResponse = await request.get("/api/currencies");
    const catalog = currenciesResponseSchema.parse(
      await catalogResponse.json(),
    );

    expect(catalogResponse.status()).toBe(200);
    expect(
      catalog.currencies.flatMap((currency) => currency.networks),
    ).toHaveLength(6);

    const payment = await createPayment(request);

    for (const status of Object.values(PAYMENT_STATUS)) {
      await configureScenario(
        request,
        payment.payment_reference,
        exactState(status),
      );
      const response = await request.get(
        `/api/payments/${payment.payment_reference}`,
      );
      const update = paymentStatusUpdateSchema.parse(await response.json());

      expect(response.status()).toBe(200);
      expect(update.status).toBe(status);
    }
  });

  test("advances progression and exposes delay, failures, and overlap metrics", async ({
    request,
  }) => {
    const payment = await createPayment(request);
    await configureScenario(request, payment.payment_reference, {
      scenario: { mode: "progression" },
      response_delay_ms: 0,
      failure: { mode: "none" },
    });

    const progression: PaymentStatus[] = [];

    for (let requestIndex = 0; requestIndex < 4; requestIndex += 1) {
      const response = await request.get(
        `/api/payments/${payment.payment_reference}`,
      );
      progression.push(
        paymentStatusUpdateSchema.parse(await response.json()).status,
      );
    }

    expect(progression).toEqual([
      PAYMENT_STATUS.awaiting_payment,
      PAYMENT_STATUS.detected,
      PAYMENT_STATUS.confirming,
      PAYMENT_STATUS.paid,
    ]);

    await configureScenario(
      request,
      payment.payment_reference,
      exactState(PAYMENT_STATUS.awaiting_payment, { delay: 500 }),
    );
    await request.delete(
      `/api/dev/requests?payment_reference=${payment.payment_reference}`,
    );

    const statusUrl = `/api/payments/${payment.payment_reference}`;
    const [first, second] = await Promise.all([
      request.get(statusUrl),
      request.get(statusUrl),
    ]);
    expect(first.status()).toBe(200);
    expect(second.status()).toBe(200);

    const metricsResponse = await request.get(
      `/api/dev/requests?payment_reference=${payment.payment_reference}`,
    );
    const metrics = paymentRequestMetricsResponseSchema.parse(
      await metricsResponse.json(),
    );
    expect(metrics.metrics).toEqual({
      current_in_flight: 0,
      maximum_in_flight: 2,
      total_started: 2,
      total_completed: 2,
    });

    await configureScenario(
      request,
      payment.payment_reference,
      exactState(PAYMENT_STATUS.detected, {
        failure: { mode: "next_request", kind: "http_500" },
      }),
    );
    const failed = await request.get(statusUrl);
    expect(failed.status()).toBe(500);
    internalServerErrorProblemSchema.parse(await failed.json());

    const recovered = await request.get(statusUrl);
    expect(recovered.status()).toBe(200);
    expect(paymentStatusUpdateSchema.parse(await recovered.json()).status).toBe(
      PAYMENT_STATUS.detected,
    );

    await configureScenario(
      request,
      payment.payment_reference,
      exactState(PAYMENT_STATUS.awaiting_payment, {
        failure: { mode: "persistent", kind: "http_500" },
      }),
    );
    expect((await request.get(statusUrl)).status()).toBe(500);
    expect((await request.get(statusUrl)).status()).toBe(500);

    await configureScenario(
      request,
      payment.payment_reference,
      exactState(PAYMENT_STATUS.awaiting_payment, {
        failure: { mode: "next_request", kind: "network_disconnect" },
      }),
    );
    await expect(request.get(statusUrl)).rejects.toThrow();
  });

  test("rejects early requote and atomically replaces an expired quote", async ({
    request,
  }) => {
    const payment = await createPayment(request);
    const requoteUrl = `/api/payments/${payment.payment_reference}/requote`;
    const earlyResponse = await request.post(requoteUrl, {
      data: { currency: "USDC", network: "polygon" },
    });

    expect(earlyResponse.status()).toBe(409);
    quoteNotExpiredProblemSchema.parse(await earlyResponse.json());

    await configureScenario(
      request,
      payment.payment_reference,
      exactState(PAYMENT_STATUS.expired),
    );
    const requoteResponse = await request.post(requoteUrl, {
      data: { currency: "USDC", network: "polygon" },
    });
    const requoted = requotePaymentResponseSchema.parse(
      await requoteResponse.json(),
    );

    expect(requoteResponse.status()).toBe(201);
    expect(requoted).toMatchObject({
      payment_reference: payment.payment_reference,
      order_id: orderId,
      status: PAYMENT_STATUS.awaiting_payment,
      quote: { crypto_currency: "USDC", network: "polygon" },
    });
    expect(new Date(requoted.quote.expires_at).getTime()).toBeGreaterThan(
      new Date(payment.quote.expires_at).getTime(),
    );
  });
});
