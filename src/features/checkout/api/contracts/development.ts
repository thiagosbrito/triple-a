import { z } from "zod";

import {
  paymentStatusUpdateSchema,
  type PaymentStatusUpdate,
} from "./payment-status";
import { paymentStatusSchema } from "./payment-status-values";
import { createPaymentResponseSchema } from "./payments";
import { paymentReferenceSchema } from "./primitives";

export const PAYMENT_SCENARIO_MODES = ["exact_state", "progression"] as const;
export const TRANSPORT_FAILURE_MODES = [
  "none",
  "next_request",
  "persistent",
] as const;
export const TRANSPORT_FAILURE_KINDS = [
  "http_500",
  "network_disconnect",
] as const;
export const MAX_SCENARIO_DELAY_MILLISECONDS = 30_000;
export const MAX_QUOTE_EXPIRY_SECONDS = 600;

export const paymentScenarioSchema = z.discriminatedUnion("mode", [
  z.strictObject({
    mode: z.literal(PAYMENT_SCENARIO_MODES[0]),
    status: paymentStatusSchema,
  }),
  z.strictObject({ mode: z.literal(PAYMENT_SCENARIO_MODES[1]) }),
]);

export const transportFailureSchema = z.discriminatedUnion("mode", [
  z.strictObject({ mode: z.literal(TRANSPORT_FAILURE_MODES[0]) }),
  z.strictObject({
    mode: z.literal(TRANSPORT_FAILURE_MODES[1]),
    kind: z.enum(TRANSPORT_FAILURE_KINDS),
  }),
  z.strictObject({
    mode: z.literal(TRANSPORT_FAILURE_MODES[2]),
    kind: z.enum(TRANSPORT_FAILURE_KINDS),
  }),
]);

export const paymentScenarioConfigurationSchema = z.strictObject({
  scenario: paymentScenarioSchema,
  response_delay_ms: z.int().min(0).max(MAX_SCENARIO_DELAY_MILLISECONDS),
  failure: transportFailureSchema,
});

export const paymentScenarioControlRequestSchema = z.strictObject({
  payment_reference: paymentReferenceSchema,
  configuration: paymentScenarioConfigurationSchema,
});

export const paymentScenarioControlResponseSchema =
  paymentScenarioControlRequestSchema;

export const developmentQuoteExpiryRequestSchema = z.strictObject({
  payment_reference: paymentReferenceSchema,
  expires_in_seconds: z.int().min(0).max(MAX_QUOTE_EXPIRY_SECONDS),
});

export const developmentQuoteExpiryResponseSchema = z.strictObject({
  payment: createPaymentResponseSchema,
});

export const developmentConfirmationRequestSchema = z.strictObject({
  payment_reference: paymentReferenceSchema,
});

export const developmentConfirmationResponseSchema = z.strictObject({
  payment_reference: paymentReferenceSchema,
  configuration: paymentScenarioConfigurationSchema,
  update: paymentStatusUpdateSchema,
});

export const requestMetricsSchema = z.strictObject({
  current_in_flight: z.int().nonnegative(),
  maximum_in_flight: z.int().nonnegative(),
  total_started: z.int().nonnegative(),
  total_completed: z.int().nonnegative(),
});

export const paymentRequestMetricsResponseSchema = z.strictObject({
  payment_reference: paymentReferenceSchema,
  metrics: requestMetricsSchema,
});

export type PaymentScenarioConfiguration = z.infer<
  typeof paymentScenarioConfigurationSchema
>;
export type PaymentScenarioControlRequest = z.infer<
  typeof paymentScenarioControlRequestSchema
>;
export type PaymentScenarioControlResponse = z.infer<
  typeof paymentScenarioControlResponseSchema
>;
export type DevelopmentQuoteExpiryRequest = z.infer<
  typeof developmentQuoteExpiryRequestSchema
>;
export type DevelopmentQuoteExpiryResponse = z.infer<
  typeof developmentQuoteExpiryResponseSchema
>;
export type DevelopmentConfirmationRequest = z.infer<
  typeof developmentConfirmationRequestSchema
>;
export type DevelopmentConfirmationResponse = Omit<
  z.infer<typeof developmentConfirmationResponseSchema>,
  "update"
> & { update: PaymentStatusUpdate };
export type RequestMetrics = z.infer<typeof requestMetricsSchema>;
export type PaymentRequestMetricsResponse = z.infer<
  typeof paymentRequestMetricsResponseSchema
>;
