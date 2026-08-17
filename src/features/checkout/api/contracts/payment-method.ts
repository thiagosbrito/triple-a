import { z } from "zod";

import { nonBlankProtocolStringSchema } from "./primitives";

/**
 * Currency and network identifiers are server-owned reference data. Branding
 * keeps the two identifiers distinct after validation without freezing the
 * frontend to the examples currently returned by the catalog endpoint.
 */
export const currencyCodeSchema =
  nonBlankProtocolStringSchema.brand<"CurrencyCode">();
export const networkIdSchema =
  nonBlankProtocolStringSchema.brand<"NetworkId">();

export type CurrencyCode = z.infer<typeof currencyCodeSchema>;
export type NetworkId = z.infer<typeof networkIdSchema>;
