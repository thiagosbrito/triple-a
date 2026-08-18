import { ApiProblemError, ProtocolError } from "../api/contracts/problem";

export const PAYMENT_STATUS_RETRY_DELAYS_MILLISECONDS = [
  1_000, 2_000, 4_000,
] as const;

export const isRetryablePaymentStatusError = (error: unknown): boolean => {
  if (error instanceof ProtocolError) {
    return false;
  }

  if (error instanceof ApiProblemError) {
    return error.problem.status >= 500;
  }

  return error instanceof TypeError;
};

export const shouldRetryPaymentStatus = (
  failureCount: number,
  error: unknown,
): boolean => {
  return (
    failureCount < PAYMENT_STATUS_RETRY_DELAYS_MILLISECONDS.length &&
    isRetryablePaymentStatusError(error)
  );
};

export const getPaymentStatusRetryDelay = (failureCount: number): number => {
  return (
    PAYMENT_STATUS_RETRY_DELAYS_MILLISECONDS[
      Math.min(
        failureCount,
        PAYMENT_STATUS_RETRY_DELAYS_MILLISECONDS.length - 1,
      )
    ] ?? PAYMENT_STATUS_RETRY_DELAYS_MILLISECONDS[0]
  );
};
