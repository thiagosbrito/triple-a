"use client";

import { PAYMENT_STATUS } from "../api/contracts/payment-status-values";
import type { CreatePaymentResponse } from "../api/contracts/payments";
import { ApiProblemError } from "../api/contracts/problem";
import type { CheckoutSession } from "../config/checkout-session";
import { useDeadlineReconciliation } from "../hooks/use-deadline-reconciliation";
import { useRequotePayment } from "../hooks/use-requote-payment";
import { PaymentInstructions } from "./payment-instructions";
import { PaymentConnectivityNotice } from "./payment-connectivity-notice";
import { PaymentMethodCommitment } from "./payment-method-commitment";
import { PaymentOutcomeStatus } from "./payment-outcome-status";
import { PaymentProgressStatus } from "./payment-progress-status";
import { QuoteCountdown } from "./quote-countdown";

type IssuedPaymentFlowProps = Readonly<{
  payment: CreatePaymentResponse;
  session: CheckoutSession;
  assetDecimals: number;
  onConfirmChange(): void;
}>;

export function IssuedPaymentFlow({
  payment,
  session,
  assetDecimals,
  onConfirmChange,
}: IssuedPaymentFlowProps) {
  const deadline = useDeadlineReconciliation(payment, assetDecimals);
  const requote = useRequotePayment(payment, session, assetDecimals);
  const countdown = {
    remainingMilliseconds: deadline.remainingMilliseconds,
    isAtDeadline: deadline.isAtDeadline,
  } as const;
  const connectivityNotice = (
    <PaymentConnectivityNotice
      error={deadline.transport.error}
      failureCount={deadline.transport.failureCount}
      isError={deadline.transport.isError}
      isFetching={deadline.transport.isFetching}
      onRetry={() => {
        void deadline.transport.refetch({ cancelRefetch: false });
      }}
    />
  );

  if (deadline.phase === "active") {
    return (
      <>
        <PaymentMethodCommitment
          payment={payment}
          onConfirmChange={onConfirmChange}
        />
        <PaymentInstructions
          quote={payment.quote}
          assetDecimals={assetDecimals}
          countdown={countdown}
        />
        {connectivityNotice}
      </>
    );
  }

  return (
    <div>
      {deadline.phase !== "authoritative_status" ? (
        <QuoteCountdown expiresAt={payment.quote.expires_at} {...countdown} />
      ) : null}

      {deadline.phase === "reconciling" ? (
        <section
          role="status"
          aria-labelledby="deadline-status-title"
          className="mt-5 rounded-2xl border border-sky-200 bg-sky-50 p-5 text-sky-950"
        >
          <h2 id="deadline-status-title" className="text-lg font-semibold">
            Checking payment status
          </h2>
          <p className="mt-2 text-sm leading-6">
            The transfer window reached zero. Do not send while we check once
            for a payment that may already be on its way.
          </p>
        </section>
      ) : null}

      {deadline.phase === "locally_expired" ? (
        <ExpiredQuotePanel payment={payment} requote={requote} />
      ) : null}

      {deadline.phase === "unavailable" ? (
        <section
          role="alert"
          aria-labelledby="deadline-status-title"
          className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-950"
        >
          <h2 id="deadline-status-title" className="text-lg font-semibold">
            Payment status could not be confirmed
          </h2>
          <p className="mt-2 text-sm leading-6 text-rose-800">
            Do not send and do not assume the quote expired. Keep payment
            reference{" "}
            <span className="font-mono">{payment.payment_reference}</span> while
            connectivity recovers.
          </p>
        </section>
      ) : null}

      {deadline.phase === "authoritative_status" &&
      deadline.statusUpdate &&
      deadline.statusUpdate.status !== PAYMENT_STATUS.awaiting_payment ? (
        <>
          {deadline.statusUpdate.status === PAYMENT_STATUS.detected ||
          deadline.statusUpdate.status === PAYMENT_STATUS.confirming ? (
            <PaymentProgressStatus
              payment={payment}
              update={deadline.statusUpdate}
              assetDecimals={assetDecimals}
            />
          ) : (
            <PaymentOutcomeStatus
              payment={payment}
              update={deadline.statusUpdate}
              assetDecimals={assetDecimals}
            />
          )}
          {deadline.statusUpdate.status === PAYMENT_STATUS.expired ? (
            <RequoteAction payment={payment} requote={requote} />
          ) : null}
        </>
      ) : null}

      {deadline.phase !== "unavailable" ? connectivityNotice : null}
    </div>
  );
}

type RequoteResult = ReturnType<typeof useRequotePayment>;

function ExpiredQuotePanel({
  payment,
  requote,
}: Readonly<{
  payment: CreatePaymentResponse;
  requote: RequoteResult;
}>) {
  return (
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
      <RequoteAction payment={payment} requote={requote} />
    </section>
  );
}

function RequoteAction({
  payment,
  requote,
}: Readonly<{
  payment: CreatePaymentResponse;
  requote: RequoteResult;
}>) {
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
}
