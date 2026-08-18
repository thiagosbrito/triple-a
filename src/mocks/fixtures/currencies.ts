import { currenciesResponseSchema } from "@/features/checkout/api/contracts/currencies";

/**
 * Assessment-owned currency catalog. Parsing at module initialization prevents
 * the mock server from drifting away from the same contract used by clients.
 */
export const CURRENCIES_FIXTURE = currenciesResponseSchema.parse({
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
});
