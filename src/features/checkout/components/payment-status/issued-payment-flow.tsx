"use client";

import { PAYMENT_STATUS } from "../../api/contracts/payment-status-values";
import type { CreatePaymentResponse } from "../../api/contracts/payments";
import type { CheckoutSession } from "../../config/checkout-session";
import { useDeadlineReconciliation } from "../../hooks/use-deadline-reconciliation";
import { useRequotePayment } from "../../hooks/use-requote-payment";
import { PaymentInstructions } from "../payment-instructions/payment-instructions";
import { PaymentMethodCommitment } from "../payment-method/payment-method-commitment";
import { AuthoritativePaymentStatus } from "./authoritative-payment-status";
import { PaymentConnectivityNotice } from "./payment-connectivity-notice";
import { QuoteDeadlineStatus } from "./quote-deadline-status";

type IssuedPaymentFlowProps = Readonly<{
  payment: CreatePaymentResponse;
  session: CheckoutSession;
  assetDecimals: number;
  onChangeMethod: () => void;
}>;

export const IssuedPaymentFlow = ({
  payment,
  session,
  assetDecimals,
  onChangeMethod,
}: IssuedPaymentFlowProps) => {
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
          onChangeMethod={onChangeMethod}
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
        <QuoteDeadlineStatus
          payment={payment}
          phase={deadline.phase}
          countdown={countdown}
          requote={requote}
        />
      ) : null}

      {deadline.phase === "authoritative_status" &&
      deadline.statusUpdate &&
      deadline.statusUpdate.status !== PAYMENT_STATUS.awaiting_payment ? (
        <AuthoritativePaymentStatus
          payment={payment}
          update={deadline.statusUpdate}
          assetDecimals={assetDecimals}
          requote={requote}
        />
      ) : null}

      {deadline.phase !== "unavailable" ? connectivityNotice : null}
    </div>
  );
};
