import { z } from "zod";

import {
  PAYMENT_FAILURE_REASON,
  PAYMENT_FAILURE_REASONS,
  PAYMENT_STATUS,
  PAYMENT_STATUSES,
} from "../../domain/payment-status";
import type {
  PaymentFailureReason,
  PaymentStatus,
} from "../../domain/payment-status";

export {
  PAYMENT_FAILURE_REASON,
  PAYMENT_FAILURE_REASONS,
  PAYMENT_STATUS,
  PAYMENT_STATUSES,
};
export type { PaymentFailureReason, PaymentStatus };

export const paymentStatusSchema = z.enum(PAYMENT_STATUSES);

export const paymentFailureReasonSchema = z.enum(PAYMENT_FAILURE_REASONS);
