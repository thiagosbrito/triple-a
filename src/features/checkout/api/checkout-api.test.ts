import { describe, expect, it, vi } from "vitest";

import { currenciesResponseSchema } from "./contracts/currencies";
import { paymentStatusUpdateSchema } from "./contracts/payment-status";
import {
  createPaymentRequestSchema,
  createPaymentResponseSchema,
  requotePaymentRequestSchema,
} from "./contracts/payments";
import { ApiProblemError, ProtocolError } from "./contracts/problem";
import { createCheckoutApi } from "./checkout-api";

const catalog = currenciesResponseSchema.parse({
  currencies: [
    {
      code: "USDT",
      name: "Tether USD",
      decimals: 6,
      networks: [
        {
          id: "tron",
          name: "Tron (TRC-20)",
          network_fee: "1.00",
          required_confirmations: 1,
          avg_confirmation_seconds: 3,
        },
      ],
    },
  ],
});

const payment = createPaymentResponseSchema.parse({
  payment_reference: "AQH-100306-PMT",
  order_id: "ORD-88213",
  status: "awaiting_payment",
  merchant: {
    name: "Acme Store",
    logo_url: null,
  },
  order: {
    currency: "EUR",
    amount: "149.90",
  },
  quote: {
    crypto_currency: "USDT",
    network: "tron",
    network_name: "Tron (TRC-20)",
    exchange_rate: "0.9190",
    crypto_amount: "162.69",
    network_fee: "1.00",
    total_due: "163.69",
    crypto_address: "TExampleAddress",
    required_confirmations: 1,
    expires_at: "2026-08-14T08:52:10.842Z",
  },
});

function jsonResponse(body: unknown, status = 200): Response {
  return Response.json(body, { status });
}

describe("checkout API", () => {
  it("validates and returns the server-owned currency catalog", async () => {
    const fetcher = vi.fn<typeof fetch>();
    fetcher.mockResolvedValue(jsonResponse(catalog));
    const api = createCheckoutApi({ fetch: fetcher });

    await expect(api.getCurrencies()).resolves.toEqual(catalog);
    expect(fetcher).toHaveBeenCalledWith(
      "/api/currencies",
      expect.objectContaining({
        headers: { Accept: "application/json, application/problem+json" },
      }),
    );
  });

  it("validates outbound payment data and the complete quote snapshot", async () => {
    const fetcher = vi.fn<typeof fetch>();
    fetcher.mockResolvedValue(jsonResponse(payment, 201));
    const api = createCheckoutApi({ fetch: fetcher });
    const request = createPaymentRequestSchema.parse({
      order_id: "ORD-88213",
      currency: "USDT",
      network: "tron",
    });
    const controller = new AbortController();

    await expect(
      api.createPayment(request, { signal: controller.signal }),
    ).resolves.toEqual(payment);

    const call = fetcher.mock.calls[0];
    expect(call).toBeDefined();
    if (!call) {
      throw new Error("Expected the payment request to be sent");
    }

    const [path, init] = call;
    expect(path).toBe("/api/payments");
    expect(init).toMatchObject({
      method: "POST",
      signal: controller.signal,
      headers: {
        Accept: "application/json, application/problem+json",
        "Content-Type": "application/json",
      },
    });
    expect(JSON.parse(String(init?.body))).toEqual({
      order_id: "ORD-88213",
      currency: "USDT",
      network: "tron",
    });
  });

  it("validates payment status responses and forwards cancellation", async () => {
    const fetcher = vi.fn<typeof fetch>();
    const update = paymentStatusUpdateSchema.parse({
      payment_reference: payment.payment_reference,
      status: "awaiting_payment",
    });
    fetcher.mockResolvedValue(jsonResponse(update));
    const api = createCheckoutApi({ fetch: fetcher });
    const controller = new AbortController();

    await expect(
      api.getPayment(payment.payment_reference, { signal: controller.signal }),
    ).resolves.toEqual(update);
    expect(fetcher).toHaveBeenCalledWith(
      "/api/payments/AQH-100306-PMT",
      expect.objectContaining({ signal: controller.signal }),
    );
  });

  it("throws a typed API problem for a valid non-success response", async () => {
    const fetcher = vi.fn<typeof fetch>();
    const problem = {
      type: "https://developers.triple-a.io/errors/quote-not-expired",
      title: "Quote has not expired",
      status: 409,
      detail: "The current quote remains active.",
    };
    fetcher.mockResolvedValue(jsonResponse(problem, 409));
    const api = createCheckoutApi({ fetch: fetcher });
    const request = requotePaymentRequestSchema.parse({
      currency: "USDT",
      network: "tron",
    });

    const result = api.requotePayment(payment.payment_reference, request);

    await expect(result).rejects.toMatchObject({
      kind: "api_problem",
      problem,
    });
    await expect(result).rejects.toBeInstanceOf(ApiProblemError);
  });

  it("rejects an unknown payment status as a protocol error", async () => {
    const fetcher = vi.fn<typeof fetch>();
    fetcher.mockResolvedValue(
      jsonResponse({
        payment_reference: payment.payment_reference,
        status: "refunded",
      }),
    );
    const api = createCheckoutApi({ fetch: fetcher });

    const result = api.getPayment(payment.payment_reference);

    await expect(result).rejects.toMatchObject({
      kind: "protocol_error",
      operation: "get_payment",
    });
    await expect(result).rejects.toBeInstanceOf(ProtocolError);
  });

  it("rejects a malformed success payload instead of leaking untrusted data", async () => {
    const fetcher = vi.fn<typeof fetch>();
    fetcher.mockResolvedValue(jsonResponse({ currencies: [] }));
    const api = createCheckoutApi({ fetch: fetcher });

    await expect(api.getCurrencies()).rejects.toMatchObject({
      kind: "protocol_error",
      operation: "get_currencies",
    });
  });

  it("rejects a mismatch between HTTP status and problem status", async () => {
    const fetcher = vi.fn<typeof fetch>();
    fetcher.mockResolvedValue(
      jsonResponse(
        {
          type: "about:blank",
          title: "Bad Request",
          status: 400,
          detail: "The request is invalid.",
        },
        409,
      ),
    );
    const api = createCheckoutApi({ fetch: fetcher });

    await expect(api.getCurrencies()).rejects.toMatchObject({
      kind: "protocol_error",
      issues: [expect.objectContaining({ path: ["status"] })],
    });
  });

  it("rejects valid JSON returned with an unexpected success status", async () => {
    const fetcher = vi.fn<typeof fetch>();
    fetcher.mockResolvedValue(jsonResponse(catalog, 201));
    const api = createCheckoutApi({ fetch: fetcher });

    await expect(api.getCurrencies()).rejects.toMatchObject({
      kind: "protocol_error",
      issues: [expect.objectContaining({ path: ["status"] })],
    });
  });

  it("classifies malformed JSON as a protocol error", async () => {
    const fetcher = vi.fn<typeof fetch>();
    fetcher.mockResolvedValue(
      new Response("{", {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const api = createCheckoutApi({ fetch: fetcher });

    await expect(api.getCurrencies()).rejects.toMatchObject({
      kind: "protocol_error",
      operation: "get_currencies",
      issues: [{ message: "Response body is not valid JSON", path: [] }],
    });
  });

  it("preserves a transport failure instead of mapping it to payment state", async () => {
    const transportError = new TypeError("Network connection lost");
    const fetcher = vi.fn<typeof fetch>();
    fetcher.mockRejectedValue(transportError);
    const api = createCheckoutApi({ fetch: fetcher });

    await expect(api.getCurrencies()).rejects.toBe(transportError);
  });

  it("preserves a response-stream failure as a transport error", async () => {
    const transportError = new TypeError("Response stream disconnected");
    const fetcher = vi.fn<typeof fetch>();
    fetcher.mockResolvedValue(
      new Response(
        new ReadableStream({
          start(controller) {
            controller.error(transportError);
          },
        }),
        { status: 200 },
      ),
    );
    const api = createCheckoutApi({ fetch: fetcher });

    await expect(api.getCurrencies()).rejects.toBe(transportError);
  });
});
