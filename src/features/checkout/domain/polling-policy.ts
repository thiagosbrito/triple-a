import type { PaymentStatus } from "./payment-status";
import { getPaymentStatusPolicy, PAYMENT_STATUS } from "./payment-status";

export const POLLING_INTERVAL_MILLISECONDS = {
  awaitingPayment: 3_000,
  detected: 1_500,
  confirming: 2_000,
  underpaid: 3_000,
} as const;

export const MAX_AUTOMATIC_TRANSPORT_RETRIES = 3;
export const INITIAL_RETRY_DELAY_MILLISECONDS = 1_000;
export const MAX_RETRY_DELAY_MILLISECONDS = 4_000;

export interface TransportRetryPolicy {
  retry: boolean;
  delayMilliseconds: number | null;
}

export const getPollingIntervalMilliseconds = (
  status: PaymentStatus,
): number | false => {
  if (getPaymentStatusPolicy(status).polling === "stop") {
    return false;
  }

  switch (status) {
    case PAYMENT_STATUS.awaiting_payment:
      return POLLING_INTERVAL_MILLISECONDS.awaitingPayment;
    case PAYMENT_STATUS.detected:
      return POLLING_INTERVAL_MILLISECONDS.detected;
    case PAYMENT_STATUS.confirming:
      return POLLING_INTERVAL_MILLISECONDS.confirming;
    case PAYMENT_STATUS.underpaid:
      return POLLING_INTERVAL_MILLISECONDS.underpaid;
    case PAYMENT_STATUS.paid:
    case PAYMENT_STATUS.overpaid:
    case PAYMENT_STATUS.expired:
    case PAYMENT_STATUS.failed:
      return false;
    default: {
      const exhaustiveStatus: never = status;
      return exhaustiveStatus;
    }
  }
};

/**
 * `consecutiveFailures` starts at one for the first failed request. The policy
 * permits three automatic retries with deterministic exponential delays; the
 * UI can then keep the last good state and offer a manual retry.
 */
export const getTransportRetryPolicy = (
  consecutiveFailures: number,
): TransportRetryPolicy => {
  if (!Number.isSafeInteger(consecutiveFailures) || consecutiveFailures < 1) {
    throw new RangeError(
      "Consecutive failures must be a positive safe integer",
    );
  }

  if (consecutiveFailures > MAX_AUTOMATIC_TRANSPORT_RETRIES) {
    return { retry: false, delayMilliseconds: null };
  }

  const delayMilliseconds = Math.min(
    INITIAL_RETRY_DELAY_MILLISECONDS * 2 ** (consecutiveFailures - 1),
    MAX_RETRY_DELAY_MILLISECONDS,
  );

  return { retry: true, delayMilliseconds };
};
