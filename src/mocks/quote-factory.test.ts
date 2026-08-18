import { describe, expect, it } from "vitest";

import { createPaymentRequestSchema } from "@/features/checkout/api/contracts/payments";
import { CURRENCIES_FIXTURE } from "@/mocks/fixtures/currencies";

import {
  createMockPayment,
  MOCK_PAYMENT_REFERENCE,
  MOCK_QUOTE_LIFETIME_MILLISECONDS,
  MOCK_QUOTE_PROFILES,
  UnsupportedPaymentMethodError,
} from "./quote-factory";

const now = new Date("2026-08-14T08:49:10.842Z");

describe("createMockPayment", () => {
  it("reproduces the documented USDT on Tron response with relative expiry", () => {
    const payment = createMockPayment(
      createPaymentRequestSchema.parse({
        order_id: "ORD-88213",
        currency: "USDT",
        network: "tron",
      }),
      now,
    );

    expect(payment).toEqual({
      payment_reference: MOCK_PAYMENT_REFERENCE,
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
    });
  });

  it("creates a complete consistent quote for every catalog method", () => {
    const quotes = CURRENCIES_FIXTURE.currencies.flatMap((currency) =>
      currency.networks.map((network) =>
        createMockPayment(
          createPaymentRequestSchema.parse({
            order_id: "ORD-88213",
            currency: currency.code,
            network: network.id,
          }),
          now,
        ),
      ),
    );

    expect(quotes).toHaveLength(6);
    expect(
      quotes.map(({ quote }) => `${quote.crypto_currency}:${quote.network}`),
    ).toEqual([
      "USDT:tron",
      "USDT:ethereum",
      "USDC:ethereum",
      "USDC:polygon",
      "USDC:solana",
      "ETH:ethereum",
    ]);
    expect(
      quotes.every(
        ({ quote }) =>
          Date.parse(quote.expires_at) - now.getTime() ===
          MOCK_QUOTE_LIFETIME_MILLISECONDS,
      ),
    ).toBe(true);
  });

  it("keeps every mock profile rate and address distinct", () => {
    expect(
      new Set(MOCK_QUOTE_PROFILES.map((profile) => profile.exchange_rate)).size,
    ).toBe(MOCK_QUOTE_PROFILES.length);
    expect(
      new Set(MOCK_QUOTE_PROFILES.map((profile) => profile.crypto_address))
        .size,
    ).toBe(MOCK_QUOTE_PROFILES.length);
  });

  it("preserves deliberate decimal scale in calculated totals", () => {
    const payment = createMockPayment(
      createPaymentRequestSchema.parse({
        order_id: "ORD-88213",
        currency: "USDC",
        network: "ethereum",
      }),
      now,
    );

    expect(payment.quote.total_due).toBe("167.50");
  });

  it("rejects a structurally valid pair absent from the catalog", () => {
    expect(() =>
      createMockPayment(
        createPaymentRequestSchema.parse({
          order_id: "ORD-88213",
          currency: "USDT",
          network: "solana",
        }),
        now,
      ),
    ).toThrow(UnsupportedPaymentMethodError);
  });
});
