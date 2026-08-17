import { z } from "zod";

import {
  currencyCodeSchema,
  type CurrencyCode,
  networkIdSchema,
  type NetworkId,
} from "./payment-method";
import {
  nonBlankProtocolStringSchema,
  nonNegativeDecimalStringSchema,
  positiveIntegerSchema,
} from "./primitives";

export const supportedNetworkSchema = z.strictObject({
  id: networkIdSchema,
  name: nonBlankProtocolStringSchema,
  network_fee: nonNegativeDecimalStringSchema,
  required_confirmations: positiveIntegerSchema,
  avg_confirmation_seconds: positiveIntegerSchema,
});

export type SupportedNetwork = z.infer<typeof supportedNetworkSchema>;

const networksSchema = z
  .array(supportedNetworkSchema)
  .min(1)
  .superRefine((networks, context) => {
    const seenIds = new Set<NetworkId>();

    networks.forEach((network, index) => {
      if (seenIds.has(network.id)) {
        context.addIssue({
          code: "custom",
          message: `Duplicate network id: ${network.id}`,
          path: [index, "id"],
        });
      }

      seenIds.add(network.id);
    });
  });

const currencyFields = {
  code: currencyCodeSchema,
  name: nonBlankProtocolStringSchema,
  decimals: z.int().nonnegative(),
  networks: networksSchema,
};

/**
 * The endpoint owns the available assets, their precision, and their network
 * compatibility. The frontend validates that catalog structurally instead of
 * treating the PDF's current examples as a closed vocabulary.
 */
export const supportedCurrencySchema = z.strictObject(currencyFields);

export type SupportedCurrency = z.infer<typeof supportedCurrencySchema>;

export const currenciesResponseSchema = z
  .strictObject({
    currencies: z.array(supportedCurrencySchema).min(1),
  })
  .superRefine(({ currencies }, context) => {
    const seenCodes = new Set<CurrencyCode>();

    currencies.forEach((currency, index) => {
      if (seenCodes.has(currency.code)) {
        context.addIssue({
          code: "custom",
          message: `Duplicate currency code: ${currency.code}`,
          path: ["currencies", index, "code"],
        });
      }

      seenCodes.add(currency.code);
    });
  });

export type CurrenciesResponse = z.infer<typeof currenciesResponseSchema>;
