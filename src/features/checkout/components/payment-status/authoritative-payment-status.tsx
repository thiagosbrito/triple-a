import type {
  AwaitingPaymentUpdate,
  PaymentStatusUpdate,
} from "../../api/contracts/payment-status";
import { PAYMENT_STATUS } from "../../api/contracts/payment-status-values";
import type { CreatePaymentResponse } from "../../api/contracts/payments";
import { PaymentOutcomeStatus } from "./payment-outcome-status";
import { PaymentProgressStatus } from "./payment-progress-status";
import {
  QuoteRequoteAction,
  type RequoteResult,
} from "./quote-deadline-status";

type AuthoritativeUpdate = Exclude<PaymentStatusUpdate, AwaitingPaymentUpdate>;

type AuthoritativePaymentStatusProps = Readonly<{
  payment: CreatePaymentResponse;
  update: AuthoritativeUpdate;
  assetDecimals: number;
  requote: RequoteResult;
}>;

export const AuthoritativePaymentStatus = ({
  payment,
  update,
  assetDecimals,
  requote,
}: AuthoritativePaymentStatusProps) => {
  if (
    update.status === PAYMENT_STATUS.detected ||
    update.status === PAYMENT_STATUS.confirming
  ) {
    return (
      <PaymentProgressStatus
        payment={payment}
        update={update}
        assetDecimals={assetDecimals}
      />
    );
  }

  return (
    <>
      <PaymentOutcomeStatus
        payment={payment}
        update={update}
        assetDecimals={assetDecimals}
      />
      {update.status === PAYMENT_STATUS.expired ? (
        <QuoteRequoteAction payment={payment} requote={requote} />
      ) : null}
    </>
  );
};
