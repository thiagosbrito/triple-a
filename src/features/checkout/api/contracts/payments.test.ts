import { describe, expect, it } from "vitest";

import {
  createPaymentRequestSchema,
  createPaymentResponseSchema,
  requotePaymentRequestSchema,
  requotePaymentResponseSchema,
} from "./payments";

const documentedRequest = {
  order_id: "ORD-88213",
  currency: "USDT",
  network: "tron",
};

const documentedResponse = {
  payment_reference: "AQH-100306-PMT",
  order_id: "ORD-88213",
  status: "awaiting_payment",
  merchant: { name: "Nordwind Audio", logo_url: null },
  order: { currency: "EUR", amount: "149.90" },
  quote: {
    crypto_currency: "USDT",
    network: "tron",
    network_name: "Tron (TRC-20)",
    exchange_rate: "0.9214",
    crypto_amount: "162.69",
    network_fee: "1.00",
    total_due: "163.69",
    crypto_address: "TQ5Nn8kLpVv3xJ7wYcR2bF9aH4dM6sGz1e",
    required_confirmations: 1,
    expires_at: "2026-08-14T08:52:10.842Z",
  },
};

describe("createPaymentRequestSchema", () => {
  it("validates the documented request", () => {
    expect(createPaymentRequestSchema.parse(documentedRequest)).toEqual(
      documentedRequest,
    );
  });

  it.each([
    ["a blank order id", { ...documentedRequest, order_id: "" }],
    ["a blank currency", { ...documentedRequest, currency: "" }],
    ["a blank network", { ...documentedRequest, network: "" }],
    ["an unknown field", { ...documentedRequest, amount: "149.90" }],
  ])("rejects %s", (_caseName, malformedRequest) => {
    expect(createPaymentRequestSchema.safeParse(malformedRequest).success).toBe(
      false,
    );
  });

  it("accepts identifiers from an expanded backend catalog", () => {
    expect(
      createPaymentRequestSchema.parse({
        ...documentedRequest,
        currency: "EURC",
        network: "base",
      }),
    ).toMatchObject({ currency: "EURC", network: "base" });
  });
});

describe("createPaymentResponseSchema", () => {
  it("validates the complete documented response without coercing money", () => {
    const result = createPaymentResponseSchema.parse(documentedResponse);

    expect(result.order.amount).toBe("149.90");
    expect(result.quote.exchange_rate).toBe("0.9214");
    expect(result.quote.crypto_amount).toBe("162.69");
    expect(result.quote.network_fee).toBe("1.00");
    expect(result.quote.total_due).toBe("163.69");
  });

  it.each([
    [
      "fiat amount",
      {
        ...documentedResponse,
        order: { ...documentedResponse.order, amount: 149.9 },
      },
    ],
    [
      "exchange rate",
      {
        ...documentedResponse,
        quote: { ...documentedResponse.quote, exchange_rate: 0.9214 },
      },
    ],
    [
      "crypto amount",
      {
        ...documentedResponse,
        quote: { ...documentedResponse.quote, crypto_amount: 162.69 },
      },
    ],
    [
      "network fee",
      {
        ...documentedResponse,
        quote: { ...documentedResponse.quote, network_fee: 1 },
      },
    ],
    [
      "total due",
      {
        ...documentedResponse,
        quote: { ...documentedResponse.quote, total_due: 163.69 },
      },
    ],
  ])("rejects a numeric %s", (_caseName, malformedResponse) => {
    expect(
      createPaymentResponseSchema.safeParse(malformedResponse).success,
    ).toBe(false);
  });

  it.each([
    [
      "a non-awaiting initial status",
      { ...documentedResponse, status: "detected" },
    ],
    [
      "an invalid merchant logo URL",
      {
        ...documentedResponse,
        merchant: { ...documentedResponse.merchant, logo_url: "not-a-url" },
      },
    ],
    [
      "an invalid expiry timestamp",
      {
        ...documentedResponse,
        quote: { ...documentedResponse.quote, expires_at: "tomorrow" },
      },
    ],
    [
      "zero required confirmations",
      {
        ...documentedResponse,
        quote: { ...documentedResponse.quote, required_confirmations: 0 },
      },
    ],
    [
      "an unknown quote field",
      {
        ...documentedResponse,
        quote: { ...documentedResponse.quote, memo: "unexpected" },
      },
    ],
  ])("rejects %s", (_caseName, malformedResponse) => {
    expect(
      createPaymentResponseSchema.safeParse(malformedResponse).success,
    ).toBe(false);
  });

  it.each(["0", "0.0", "1e3", "-1.00"])(
    "rejects an invalid positive amount: %s",
    (amount) => {
      expect(
        createPaymentResponseSchema.safeParse({
          ...documentedResponse,
          order: { ...documentedResponse.order, amount },
        }).success,
      ).toBe(false);
    },
  );

  it("accepts quote identifiers from an expanded backend catalog", () => {
    expect(
      createPaymentResponseSchema.parse({
        ...documentedResponse,
        quote: {
          ...documentedResponse.quote,
          crypto_currency: "EURC",
          network: "base",
          network_name: "Base",
        },
      }).quote,
    ).toMatchObject({ crypto_currency: "EURC", network: "base" });
  });
});

describe("requote payment contracts", () => {
  const documentedRequoteRequest = {
    currency: "USDT",
    network: "tron",
  };

  it("validates the documented requote request", () => {
    expect(requotePaymentRequestSchema.parse(documentedRequoteRequest)).toEqual(
      documentedRequoteRequest,
    );
  });

  it.each([
    ["a blank currency", { ...documentedRequoteRequest, currency: "" }],
    ["a blank network", { ...documentedRequoteRequest, network: "" }],
    [
      "a creation-only order id",
      { ...documentedRequoteRequest, order_id: "ORD-88213" },
    ],
  ])("rejects %s", (_caseName, malformedRequest) => {
    expect(
      requotePaymentRequestSchema.safeParse(malformedRequest).success,
    ).toBe(false);
  });

  it("uses the documented creation-response body for a successful requote", () => {
    expect(requotePaymentResponseSchema.parse(documentedResponse)).toEqual(
      documentedResponse,
    );
  });
});
