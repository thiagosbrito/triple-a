import { z } from "zod";

import { currencyCodeSchema, networkIdSchema } from "./payment-method";
import { PAYMENT_STATUS } from "./payment-status-values";
import {
  cryptoAddressSchema,
  nonBlankProtocolStringSchema,
  nonNegativeDecimalStringSchema,
  orderIdSchema,
  paymentReferenceSchema,
  positiveDecimalStringSchema,
  positiveIntegerSchema,
  isoTimestampSchema,
} from "./primitives";

export const createPaymentRequestSchema = z.strictObject({
  order_id: orderIdSchema,
  currency: currencyCodeSchema,
  network: networkIdSchema,
});

export type CreatePaymentRequest = z.infer<typeof createPaymentRequestSchema>;

export const requotePaymentRequestSchema = z.strictObject({
  currency: currencyCodeSchema,
  network: networkIdSchema,
});

export type RequotePaymentRequest = z.infer<typeof requotePaymentRequestSchema>;

export const merchantDetailsSchema = z.strictObject({
  name: nonBlankProtocolStringSchema,
  logo_url: z.url({ protocol: /^https?$/u }).nullable(),
});

export type MerchantDetails = z.infer<typeof merchantDetailsSchema>;

export const orderSummarySchema = z.strictObject({
  currency: z.literal("EUR"),
  amount: positiveDecimalStringSchema,
});

export type OrderSummary = z.infer<typeof orderSummarySchema>;

export const paymentQuoteSchema = z.strictObject({
  crypto_currency: currencyCodeSchema,
  network: networkIdSchema,
  network_name: nonBlankProtocolStringSchema,
  exchange_rate: positiveDecimalStringSchema,
  crypto_amount: positiveDecimalStringSchema,
  network_fee: nonNegativeDecimalStringSchema,
  total_due: positiveDecimalStringSchema,
  crypto_address: cryptoAddressSchema,
  required_confirmations: positiveIntegerSchema,
  expires_at: isoTimestampSchema,
});

export type PaymentQuote = z.infer<typeof paymentQuoteSchema>;

export const createPaymentResponseSchema = z.strictObject({
  payment_reference: paymentReferenceSchema,
  order_id: orderIdSchema,
  status: z.literal(PAYMENT_STATUS.awaiting_payment),
  merchant: merchantDetailsSchema,
  order: orderSummarySchema,
  quote: paymentQuoteSchema,
});

export type CreatePaymentResponse = z.infer<typeof createPaymentResponseSchema>;

/** The assessment specifies the same body for payment creation and requote. */
export const requotePaymentResponseSchema = createPaymentResponseSchema;
export type RequotePaymentResponse = z.infer<
  typeof requotePaymentResponseSchema
>;
