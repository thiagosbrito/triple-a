import { describe, expect, it } from "vitest";

import { currenciesResponseSchema } from "../api/contracts/currencies";
import { createPaymentRequestSchema } from "../api/contracts/payments";
import { isPaymentMethodSupported } from "./payment-method";

const catalog = currenciesResponseSchema.parse({
  currencies: [
    {
      code: "USDT",
      name: "Tether",
      decimals: 6,
      networks: [
        {
          id: "tron",
          name: "Tron (TRC-20)",
          network_fee: "1.00",
          required_confirmations: 1,
          avg_confirmation_seconds: 60,
        },
      ],
    },
    {
      code: "EURC",
      name: "Euro Coin",
      decimals: 6,
      networks: [
        {
          id: "base",
          name: "Base",
          network_fee: "0.01",
          required_confirmations: 2,
          avg_confirmation_seconds: 10,
        },
      ],
    },
  ],
});

describe("isPaymentMethodSupported", () => {
  it("accepts a new payment method supplied by the backend catalog", () => {
    const selection = createPaymentRequestSchema.parse({
      order_id: "ORD-88213",
      currency: "EURC",
      network: "base",
    });

    expect(isPaymentMethodSupported(catalog, selection)).toBe(true);
  });

  it("rejects a network that is not offered for the selected currency", () => {
    const selection = createPaymentRequestSchema.parse({
      order_id: "ORD-88213",
      currency: "USDT",
      network: "base",
    });

    expect(isPaymentMethodSupported(catalog, selection)).toBe(false);
  });

  it("rejects identifiers absent from the latest catalog", () => {
    const selection = createPaymentRequestSchema.parse({
      order_id: "ORD-88213",
      currency: "UNKNOWN",
      network: "unknown",
    });

    expect(isPaymentMethodSupported(catalog, selection)).toBe(false);
  });
});
