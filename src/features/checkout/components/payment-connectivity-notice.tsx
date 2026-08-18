"use client";

import { ProtocolError } from "../api/contracts/problem";

type PaymentConnectivityNoticeProps = Readonly<{
  error: unknown;
  failureCount: number;
  isError: boolean;
  isFetching: boolean;
  onRetry(): void;
}>;

export function PaymentConnectivityNotice({
  error,
  failureCount,
  isError,
  isFetching,
  onRetry,
}: PaymentConnectivityNoticeProps) {
  const hasTransportTrouble = failureCount > 0 || isError;

  if (!hasTransportTrouble) {
    return null;
  }

  const retryExhausted = isError && !isFetching;
  const responseWasInvalid = error instanceof ProtocolError;
  const heading = retryExhausted
    ? responseWasInvalid
      ? "Payment update could not be verified"
      : "Payment status connection interrupted"
    : "Reconnecting to payment status";

  return (
    <section
      role="status"
      aria-label={heading}
      className="mt-5 rounded-2xl border border-violet-200 bg-violet-50 p-4 text-violet-950"
    >
      <p className="font-semibold">{heading}</p>
      <p className="mt-1 text-sm leading-6 text-violet-900">
        {retryExhausted
          ? responseWasInvalid
            ? "We ignored an unverified response and kept the last confirmed payment state. Do not act on the unverified update."
            : "This does not mean the payment failed or expired. The last confirmed payment state remains on screen. If you already sent funds, do not send again."
          : "Automatic recovery is in progress. The last confirmed payment state remains on screen; if you already sent funds, do not send again."}
      </p>

      {retryExhausted ? (
        <button
          type="button"
          className="mt-3 min-h-11 rounded-xl bg-violet-950 px-4 py-2 text-sm font-semibold text-white outline-offset-2 hover:bg-violet-900 focus-visible:outline-2 focus-visible:outline-violet-950"
          onClick={onRetry}
        >
          Retry payment status
        </button>
      ) : null}
    </section>
  );
}
