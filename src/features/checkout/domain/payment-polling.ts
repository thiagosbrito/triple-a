import type { PaymentStatusUpdate } from "../api/contracts/payment-status";
import { PAYMENT_STATUS } from "../api/contracts/payment-status-values";

export const PAYMENT_POLL_INTERVAL_MILLISECONDS = Object.freeze({
  awaitingPayment: 3_000,
  detected: 1_500,
  confirming: 2_000,
  underpaid: 3_000,
});

export const getPaymentPollInterval = (
  update: PaymentStatusUpdate | undefined,
): number | false => {
  switch (update?.status) {
    case undefined:
    case PAYMENT_STATUS.awaiting_payment:
      return PAYMENT_POLL_INTERVAL_MILLISECONDS.awaitingPayment;
    case PAYMENT_STATUS.detected:
      return PAYMENT_POLL_INTERVAL_MILLISECONDS.detected;
    case PAYMENT_STATUS.confirming:
      return PAYMENT_POLL_INTERVAL_MILLISECONDS.confirming;
    case PAYMENT_STATUS.underpaid:
      return PAYMENT_POLL_INTERVAL_MILLISECONDS.underpaid;
    case PAYMENT_STATUS.paid:
    case PAYMENT_STATUS.overpaid:
    case PAYMENT_STATUS.expired:
    case PAYMENT_STATUS.failed:
      return false;
  }
};
