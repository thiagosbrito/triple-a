"use client";

import type { CreatePaymentResponse } from "../../api/contracts/payments";
import { ApiProblemError } from "../../api/contracts/problem";
import type { DeadlineReconciliationPhase } from "../../hooks/use-deadline-reconciliation";
import { useRequotePayment } from "../../hooks/use-requote-payment";
import { QuoteCountdown } from "../payment-instructions/quote-countdown";

export type RequoteResult = ReturnType<typeof useRequotePayment>;

type QuoteDeadlineStatusProps = Readonly<{
  payment: CreatePaymentResponse;
  phase: Exclude<
    DeadlineReconciliationPhase,
    "active" | "authoritative_status"
  >;
  countdown: Readonly<{
    remainingMilliseconds: number;
    isAtDeadline: boolean;
  }>;
  requote: RequoteResult;
}>;

export const QuoteDeadlineStatus = ({
  payment,
  phase,
  countdown,
  requote,
}: QuoteDeadlineStatusProps) => (
  <>
    <QuoteCountdown expiresAt={payment.quote.expires_at} {...countdown} />

    {phase === "reconciling" ? <ReconcilingQuotePanel /> : null}
    {phase === "locally_expired" ? (
      <ExpiredQuotePanel payment={payment} requote={requote} />
    ) : null}
    {phase === "unavailable" ? (
      <UnavailableQuotePanel payment={payment} />
    ) : null}
  </>
);

const ReconcilingQuotePanel = () => (
  <section
    role="status"
    aria-labelledby="deadline-status-title"
    className="mt-5 rounded-2xl border border-sky-200 bg-sky-50 p-5 text-sky-950"
  >
    <h2 id="deadline-status-title" className="text-lg font-semibold">
      Checking payment status
    </h2>
    <p className="mt-2 text-sm leading-6">
      The transfer window reached zero. Do not send while we check once for a
      payment that may already be on its way.
    </p>
  </section>
);

const ExpiredQuotePanel = ({
  payment,
  requote,
}: Readonly<{
  payment: CreatePaymentResponse;
  requote: RequoteResult;
}>) => (
  <section
    role="status"
    aria-labelledby="deadline-status-title"
    className="mt-5 rounded-2xl border border-amber-300 bg-amber-50 p-5 text-amber-950"
  >
    <h2 id="deadline-status-title" className="text-lg font-semibold">
      Quote is no longer active
    </h2>
    <p className="mt-2 text-sm leading-6">
      Our status check found no detected payment. Do not use the old amount,
      address, or QR code.
    </p>
    <QuoteRequoteAction payment={payment} requote={requote} />
  </section>
);

const UnavailableQuotePanel = ({
  payment,
}: Readonly<{ payment: CreatePaymentResponse }>) => (
  <section
    role="alert"
    aria-labelledby="deadline-status-title"
    className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-950"
  >
    <h2 id="deadline-status-title" className="text-lg font-semibold">
      Payment status could not be confirmed
    </h2>
    <p className="mt-2 text-sm leading-6 text-rose-800">
      Do not send and do not assume the quote expired. Keep payment reference{" "}
      <span className="font-mono">{payment.payment_reference}</span> while
      connectivity recovers.
    </p>
  </section>
);

export const QuoteRequoteAction = ({
  payment,
  requote,
}: Readonly<{
  payment: CreatePaymentResponse;
  requote: RequoteResult;
}>) => {
  const problemDetail =
    requote.error instanceof ApiProblemError
      ? requote.error.problem.detail
      : null;

  return (
    <div className="mt-4">
      <button
        type="button"
        className="min-h-11 rounded-xl bg-amber-950 px-4 py-2 text-sm font-semibold text-white outline-offset-2 hover:bg-amber-900 focus-visible:outline-2 focus-visible:outline-amber-950 disabled:cursor-wait disabled:opacity-60"
        disabled={requote.isPending}
        onClick={() => requote.mutate()}
      >
        {requote.isPending ? "Requesting new quote…" : "Request new quote"}
      </button>

      {requote.isError ? (
        <div role="alert" className="mt-4 text-sm leading-6">
          <p className="font-semibold">
            No new payment instructions were issued.
          </p>
          {requote.isConflict ? (
            <>
              {problemDetail ? <p className="mt-1">{problemDetail}</p> : null}
              <p className="mt-1">
                {requote.conflictStatusRefresh === "failed"
                  ? "We could not refresh the payment status. Do not send; try again when connectivity recovers."
                  : "We refreshed the payment status so a late transfer can take precedence. Review the current state before trying again."}
              </p>
            </>
          ) : (
            <p className="mt-1">
              The previous amount, address, and QR code remain inactive. You can
              safely retry requesting a new quote for payment reference{" "}
              <span className="font-mono">{payment.payment_reference}</span>.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
};
