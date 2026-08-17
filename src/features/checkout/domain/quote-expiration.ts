import type { IsoTimestamp } from "../api/contracts/primitives";
import type { PaymentStatus } from "./payment-status";
import { getPaymentStatusPolicy } from "./payment-status";

export type QuoteDeadlineState =
  "active" | "reconcile" | "expired" | "frozen" | "irrelevant";

export function getRemainingMilliseconds(
  expiresAt: IsoTimestamp,
  nowEpochMilliseconds: number,
): number {
  const expiresAtEpochMilliseconds = Date.parse(expiresAt);

  if (!Number.isFinite(nowEpochMilliseconds)) {
    throw new RangeError("Current time must be a finite epoch value");
  }

  return Math.max(0, expiresAtEpochMilliseconds - nowEpochMilliseconds);
}

/**
 * Local zero is not authoritative. The first zero observation deactivates the
 * instructions and requests one status reconciliation. Only an awaiting
 * payment that remains awaiting after that reconciliation becomes locally
 * expired.
 */
export function getQuoteDeadlineState(
  status: PaymentStatus,
  expiresAt: IsoTimestamp,
  nowEpochMilliseconds: number,
  reconciledAtZero: boolean,
): QuoteDeadlineState {
  const directive = getPaymentStatusPolicy(status).quoteExpiration;

  if (directive !== "active") {
    return directive;
  }

  if (getRemainingMilliseconds(expiresAt, nowEpochMilliseconds) > 0) {
    return "active";
  }

  return reconciledAtZero ? "expired" : "reconcile";
}
