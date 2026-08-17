import { describe, expect, it } from "vitest";

import { currenciesResponseSchema } from "./currencies";

const documentedCurrenciesResponse = {
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
        {
          id: "ethereum",
          name: "Ethereum (ERC-20)",
          network_fee: "4.50",
          required_confirmations: 3,
          avg_confirmation_seconds: 180,
        },
      ],
    },
    {
      code: "USDC",
      name: "USD Coin",
      decimals: 6,
      networks: [
        {
          id: "ethereum",
          name: "Ethereum (ERC-20)",
          network_fee: "4.50",
          required_confirmations: 3,
          avg_confirmation_seconds: 180,
        },
        {
          id: "polygon",
          name: "Polygon",
          network_fee: "0.10",
          required_confirmations: 6,
          avg_confirmation_seconds: 30,
        },
        {
          id: "solana",
          name: "Solana",
          network_fee: "0.01",
          required_confirmations: 1,
          avg_confirmation_seconds: 15,
        },
      ],
    },
    {
      code: "ETH",
      name: "Ether",
      decimals: 18,
      networks: [
        {
          id: "ethereum",
          name: "Ethereum",
          network_fee: "3.20",
          required_confirmations: 3,
          avg_confirmation_seconds: 180,
        },
      ],
    },
  ],
};

const validNetwork = {
  id: "tron",
  name: "Tron (TRC-20)",
  network_fee: "1.00",
  required_confirmations: 1,
  avg_confirmation_seconds: 60,
};

const validCurrency = {
  code: "USDT",
  name: "Tether",
  decimals: 6,
  networks: [validNetwork],
};

describe("currenciesResponseSchema", () => {
  it("validates every documented currency and network combination", () => {
    const result = currenciesResponseSchema.parse(documentedCurrenciesResponse);

    expect(
      result.currencies.flatMap((currency) =>
        currency.networks.map((network) => `${currency.code}:${network.id}`),
      ),
    ).toEqual([
      "USDT:tron",
      "USDT:ethereum",
      "USDC:ethereum",
      "USDC:polygon",
      "USDC:solana",
      "ETH:ethereum",
    ]);
  });

  it.each([
    ["a numeric network fee", { ...validNetwork, network_fee: 1 }],
    ["exponent notation", { ...validNetwork, network_fee: "1e-3" }],
    ["a blank network id", { ...validNetwork, id: "" }],
    [
      "zero required confirmations",
      { ...validNetwork, required_confirmations: 0 },
    ],
    [
      "a fractional average confirmation time",
      { ...validNetwork, avg_confirmation_seconds: 1.5 },
    ],
    ["a blank network name", { ...validNetwork, name: "" }],
  ])("rejects %s", (_caseName, malformedNetwork) => {
    expect(
      currenciesResponseSchema.safeParse({
        currencies: [{ ...validCurrency, networks: [malformedNetwork] }],
      }).success,
    ).toBe(false);
  });

  it.each([
    ["a blank currency code", { ...validCurrency, code: "" }],
    ["a negative decimal scale", { ...validCurrency, decimals: -1 }],
    ["a fractional decimal scale", { ...validCurrency, decimals: 6.5 }],
    ["a missing network list", { ...validCurrency, networks: [] }],
    ["an unknown currency field", { ...validCurrency, symbol: "$" }],
  ])("rejects %s", (_caseName, malformedCurrency) => {
    expect(
      currenciesResponseSchema.safeParse({
        currencies: [malformedCurrency],
      }).success,
    ).toBe(false);
  });

  it("rejects duplicate currency codes", () => {
    expect(
      currenciesResponseSchema.safeParse({
        currencies: [validCurrency, validCurrency],
      }).success,
    ).toBe(false);
  });

  it("rejects duplicate network ids within a currency", () => {
    expect(
      currenciesResponseSchema.safeParse({
        currencies: [
          { ...validCurrency, networks: [validNetwork, validNetwork] },
        ],
      }).success,
    ).toBe(false);
  });

  it("rejects an empty response", () => {
    expect(currenciesResponseSchema.safeParse({ currencies: [] }).success).toBe(
      false,
    );
  });

  it("accepts a structurally valid currency and network added by the backend", () => {
    const result = currenciesResponseSchema.parse({
      currencies: [
        {
          code: "EURC",
          name: "Euro Coin",
          decimals: 6,
          networks: [
            {
              ...validNetwork,
              id: "base",
              name: "Base",
            },
          ],
        },
      ],
    });

    expect(result.currencies[0]?.code).toBe("EURC");
    expect(result.currencies[0]?.networks[0]?.id).toBe("base");
  });

  it("preserves a plain decimal fee with leading zeroes", () => {
    const result = currenciesResponseSchema.parse({
      currencies: [
        {
          ...validCurrency,
          networks: [{ ...validNetwork, network_fee: "001.00" }],
        },
      ],
    });

    expect(result.currencies[0]?.networks[0]?.network_fee).toBe("001.00");
  });
});
