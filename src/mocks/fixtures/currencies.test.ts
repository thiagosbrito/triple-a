import { describe, expect, it } from "vitest";

import { currenciesResponseSchema } from "@/features/checkout/api/contracts/currencies";

import { CURRENCIES_FIXTURE } from "./currencies";

describe("CURRENCIES_FIXTURE", () => {
  it("satisfies the runtime response contract", () => {
    expect(currenciesResponseSchema.parse(CURRENCIES_FIXTURE)).toEqual(
      CURRENCIES_FIXTURE,
    );
  });

  it("contains every documented currency and network combination", () => {
    expect(
      CURRENCIES_FIXTURE.currencies.flatMap((currency) =>
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

  it("preserves documented decimal fee strings and confirmation metadata", () => {
    expect(
      CURRENCIES_FIXTURE.currencies.flatMap((currency) =>
        currency.networks.map((network) => ({
          paymentMethod: `${currency.code}:${network.id}`,
          fee: network.network_fee,
          confirmations: network.required_confirmations,
          averageSeconds: network.avg_confirmation_seconds,
        })),
      ),
    ).toEqual([
      {
        paymentMethod: "USDT:tron",
        fee: "1.00",
        confirmations: 1,
        averageSeconds: 60,
      },
      {
        paymentMethod: "USDT:ethereum",
        fee: "4.50",
        confirmations: 3,
        averageSeconds: 180,
      },
      {
        paymentMethod: "USDC:ethereum",
        fee: "4.50",
        confirmations: 3,
        averageSeconds: 180,
      },
      {
        paymentMethod: "USDC:polygon",
        fee: "0.10",
        confirmations: 6,
        averageSeconds: 30,
      },
      {
        paymentMethod: "USDC:solana",
        fee: "0.01",
        confirmations: 1,
        averageSeconds: 15,
      },
      {
        paymentMethod: "ETH:ethereum",
        fee: "3.20",
        confirmations: 3,
        averageSeconds: 180,
      },
    ]);
  });
});
