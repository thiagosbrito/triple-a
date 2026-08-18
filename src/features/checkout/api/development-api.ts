import type { z } from "zod";

import {
  developmentConfirmationRequestSchema,
  developmentConfirmationResponseSchema,
  developmentQuoteExpiryRequestSchema,
  developmentQuoteExpiryResponseSchema,
  paymentRequestMetricsResponseSchema,
  paymentScenarioControlRequestSchema,
  paymentScenarioControlResponseSchema,
  type DevelopmentConfirmationResponse,
  type DevelopmentQuoteExpiryResponse,
  type PaymentRequestMetricsResponse,
  type PaymentScenarioConfiguration,
  type PaymentScenarioControlResponse,
} from "./contracts/development";
import {
  paymentReferenceSchema,
  type PaymentReference,
} from "./contracts/primitives";

type DevelopmentFetch = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

type DevelopmentApiOptions = Readonly<{ fetch?: DevelopmentFetch }>;

export class DevelopmentApiError extends Error {
  constructor(readonly status: number) {
    super(`Development API returned HTTP ${status}`);
    this.name = "DevelopmentApiError";
  }
}

const validatedResponse = async <T>(
  response: Response,
  schema: z.ZodType<T>,
): Promise<T> => {
  if (!response.ok || response.status !== 200) {
    throw new DevelopmentApiError(response.status);
  }

  return schema.parse(await response.json());
};

const referencePath = (path: string, reference: PaymentReference): string => {
  const validReference = paymentReferenceSchema.parse(reference);
  return `${path}?payment_reference=${encodeURIComponent(validReference)}`;
};

export const createDevelopmentApi = (options: DevelopmentApiOptions = {}) => {
  const fetcher: DevelopmentFetch =
    options.fetch ?? ((input, init) => globalThis.fetch(input, init));

  return {
    getScenario: (reference: PaymentReference) => {
      return fetcher(referencePath("/api/dev/scenario", reference), {
        headers: { Accept: "application/json" },
      }).then((response) =>
        validatedResponse(response, paymentScenarioControlResponseSchema),
      );
    },

    setScenario: async (
      reference: PaymentReference,
      configuration: PaymentScenarioConfiguration,
    ): Promise<PaymentScenarioControlResponse> => {
      const body = paymentScenarioControlRequestSchema.parse({
        payment_reference: reference,
        configuration,
      });
      const response = await fetcher("/api/dev/scenario", {
        method: "PUT",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      return validatedResponse(response, paymentScenarioControlResponseSchema);
    },

    setQuoteExpiry: async (
      reference: PaymentReference,
      expiresInSeconds: number,
    ): Promise<DevelopmentQuoteExpiryResponse> => {
      const body = developmentQuoteExpiryRequestSchema.parse({
        payment_reference: reference,
        expires_in_seconds: expiresInSeconds,
      });
      const response = await fetcher("/api/dev/quote-expiry", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      return validatedResponse(response, developmentQuoteExpiryResponseSchema);
    },

    advanceConfirmation: async (
      reference: PaymentReference,
    ): Promise<DevelopmentConfirmationResponse> => {
      const body = developmentConfirmationRequestSchema.parse({
        payment_reference: reference,
      });
      const response = await fetcher("/api/dev/confirmation", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      return validatedResponse(response, developmentConfirmationResponseSchema);
    },

    getRequestMetrics: (
      reference: PaymentReference,
    ): Promise<PaymentRequestMetricsResponse> => {
      return fetcher(referencePath("/api/dev/requests", reference), {
        headers: { Accept: "application/json" },
      }).then((response) =>
        validatedResponse(response, paymentRequestMetricsResponseSchema),
      );
    },

    resetRequestMetrics: (
      reference: PaymentReference,
    ): Promise<PaymentRequestMetricsResponse> => {
      return fetcher(referencePath("/api/dev/requests", reference), {
        method: "DELETE",
        headers: { Accept: "application/json" },
      }).then((response) =>
        validatedResponse(response, paymentRequestMetricsResponseSchema),
      );
    },
  } as const;
};

export const developmentApi = createDevelopmentApi();
