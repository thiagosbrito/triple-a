import type { IsoTimestamp } from "../api/contracts/primitives";
import type { PaymentStatus } from "./payment-status";
import { getPaymentStatusPolicy } from "./payment-status";

export type QuoteDeadlineState =
  "active" | "reconcile" | "expired" | "frozen" | "irrelevant";

export const getRemainingMilliseconds = (
  expiresAt: IsoTimestamp,
  nowEpochMilliseconds: number,
): number => {
  const expiresAtEpochMilliseconds = Date.parse(expiresAt);

  if (!Number.isFinite(nowEpochMilliseconds)) {
    throw new RangeError("Current time must be a finite epoch value");
  }

  return Math.max(0, expiresAtEpochMilliseconds - nowEpochMilliseconds);
};

export const formatRemainingMilliseconds = (
  remainingMilliseconds: number,
): string => {
  if (!Number.isFinite(remainingMilliseconds) || remainingMilliseconds < 0) {
    throw new RangeError("Remaining time must be a finite non-negative value");
  }

  const totalSeconds = Math.ceil(remainingMilliseconds / 1_000);
  const hours = Math.floor(totalSeconds / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;
  const minuteText = String(minutes).padStart(2, "0");
  const secondText = String(seconds).padStart(2, "0");

  return hours > 0
    ? `${String(hours).padStart(2, "0")}:${minuteText}:${secondText}`
    : `${minuteText}:${secondText}`;
};

/**
 * Local zero is not authoritative. The first zero observation deactivates the
 * instructions and requests one status reconciliation. Only an awaiting
 * payment that remains awaiting after that reconciliation becomes locally
 * expired.
 */
export const getQuoteDeadlineState = (
  status: PaymentStatus,
  expiresAt: IsoTimestamp,
  nowEpochMilliseconds: number,
  reconciledAtZero: boolean,
): QuoteDeadlineState => {
  const directive = getPaymentStatusPolicy(status).quoteExpiration;

  if (directive !== "active") {
    return directive;
  }

  if (getRemainingMilliseconds(expiresAt, nowEpochMilliseconds) > 0) {
    return "active";
  }

  return reconciledAtZero ? "expired" : "reconcile";
};
