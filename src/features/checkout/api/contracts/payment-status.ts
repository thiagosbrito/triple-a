import { z } from "zod";

import {
  PAYMENT_FAILURE_REASON,
  PAYMENT_STATUS,
} from "./payment-status-values";
import {
  cryptoAddressSchema,
  isoTimestampSchema,
  paymentReferenceSchema,
  positiveDecimalStringSchema,
  positiveIntegerSchema,
  transactionHashSchema,
} from "./primitives";

const paymentReferenceField = {
  payment_reference: paymentReferenceSchema,
};

const transactionFields = {
  amount_received: positiveDecimalStringSchema,
  tx_hash: transactionHashSchema,
};

export const awaitingPaymentUpdateSchema = z.strictObject({
  ...paymentReferenceField,
  status: z.literal(PAYMENT_STATUS.awaiting_payment),
});

export const detectedUpdateSchema = z.strictObject({
  ...paymentReferenceField,
  status: z.literal(PAYMENT_STATUS.detected),
  confirmations: z.literal(0),
  required_confirmations: positiveIntegerSchema,
  ...transactionFields,
  detected_at: isoTimestampSchema,
});

export const confirmingUpdateSchema = z.strictObject({
  ...paymentReferenceField,
  status: z.literal(PAYMENT_STATUS.confirming),
  confirmations: positiveIntegerSchema,
  required_confirmations: positiveIntegerSchema,
  ...transactionFields,
});

export const paidUpdateSchema = z.strictObject({
  ...paymentReferenceField,
  status: z.literal(PAYMENT_STATUS.paid),
  confirmations: positiveIntegerSchema,
  required_confirmations: positiveIntegerSchema,
  ...transactionFields,
  settled_at: isoTimestampSchema,
});

export const underpaidUpdateSchema = z.strictObject({
  ...paymentReferenceField,
  status: z.literal(PAYMENT_STATUS.underpaid),
  ...transactionFields,
  amount_outstanding: positiveDecimalStringSchema,
  crypto_address: cryptoAddressSchema,
});

export const overpaidUpdateSchema = z.strictObject({
  ...paymentReferenceField,
  status: z.literal(PAYMENT_STATUS.overpaid),
  ...transactionFields,
  amount_excess: positiveDecimalStringSchema,
  settled_at: isoTimestampSchema,
});

export const expiredUpdateSchema = z.strictObject({
  ...paymentReferenceField,
  status: z.literal(PAYMENT_STATUS.expired),
  expired_at: isoTimestampSchema,
});

export const failedUpdateSchema = z.strictObject({
  ...paymentReferenceField,
  status: z.literal(PAYMENT_STATUS.failed),
  reason: z.literal(PAYMENT_FAILURE_REASON.settlement_rejected),
});

export const paymentStatusUpdateSchema = z
  .discriminatedUnion("status", [
    awaitingPaymentUpdateSchema,
    detectedUpdateSchema,
    confirmingUpdateSchema,
    paidUpdateSchema,
    underpaidUpdateSchema,
    overpaidUpdateSchema,
    expiredUpdateSchema,
    failedUpdateSchema,
  ])
  .superRefine((update, context) => {
    if (
      update.status === PAYMENT_STATUS.confirming &&
      update.confirmations >= update.required_confirmations
    ) {
      context.addIssue({
        code: "custom",
        message:
          "A confirming payment must have fewer than the required confirmations",
        path: ["confirmations"],
      });
    }

    if (
      update.status === PAYMENT_STATUS.paid &&
      update.confirmations < update.required_confirmations
    ) {
      context.addIssue({
        code: "custom",
        message: "A paid payment must have at least the required confirmations",
        path: ["confirmations"],
      });
    }
  });

export type AwaitingPaymentUpdate = z.infer<typeof awaitingPaymentUpdateSchema>;
export type DetectedUpdate = z.infer<typeof detectedUpdateSchema>;
export type ConfirmingUpdate = z.infer<typeof confirmingUpdateSchema>;
export type PaidUpdate = z.infer<typeof paidUpdateSchema>;
export type UnderpaidUpdate = z.infer<typeof underpaidUpdateSchema>;
export type OverpaidUpdate = z.infer<typeof overpaidUpdateSchema>;
export type ExpiredUpdate = z.infer<typeof expiredUpdateSchema>;
export type FailedUpdate = z.infer<typeof failedUpdateSchema>;
export type PaymentStatusUpdate = z.infer<typeof paymentStatusUpdateSchema>;
