import { z } from "zod";

export const nonBlankProtocolStringSchema = z
  .string()
  .min(1)
  .refine((value) => value.trim() === value, {
    message: "Must not contain leading or trailing whitespace",
  });

const plainNonNegativeDecimalStringSchema = z
  .string()
  .regex(/^\d+(?:\.\d+)?$/u, {
    message: "Must be a non-negative plain decimal string",
  });

/**
 * Validated wire-format money. The brand prevents arbitrary strings from being
 * passed to money-sensitive code after the HTTP boundary.
 */
export const nonNegativeDecimalStringSchema =
  plainNonNegativeDecimalStringSchema.brand<"NonNegativeDecimalString">();

export const positiveDecimalStringSchema = plainNonNegativeDecimalStringSchema
  .refine((value) => /[1-9]/u.test(value), {
    message: "Must be greater than zero",
  })
  .brand<"PositiveDecimalString">();

export type NonNegativeDecimalString = z.infer<
  typeof nonNegativeDecimalStringSchema
>;
export type PositiveDecimalString = z.infer<typeof positiveDecimalStringSchema>;

export const positiveIntegerSchema = z.int().positive();
export const isoTimestampSchema = z.iso
  .datetime({ offset: true })
  .brand<"IsoTimestamp">();

export type IsoTimestamp = z.infer<typeof isoTimestampSchema>;

export const orderIdSchema = nonBlankProtocolStringSchema.brand<"OrderId">();
export const paymentReferenceSchema =
  nonBlankProtocolStringSchema.brand<"PaymentReference">();
export const cryptoAddressSchema =
  nonBlankProtocolStringSchema.brand<"CryptoAddress">();
export const transactionHashSchema =
  nonBlankProtocolStringSchema.brand<"TransactionHash">();

export type OrderId = z.infer<typeof orderIdSchema>;
export type PaymentReference = z.infer<typeof paymentReferenceSchema>;
export type CryptoAddress = z.infer<typeof cryptoAddressSchema>;
export type TransactionHash = z.infer<typeof transactionHashSchema>;
