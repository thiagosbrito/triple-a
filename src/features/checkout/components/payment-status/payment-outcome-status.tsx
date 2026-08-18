import { PAYMENT_STATUS } from "../../api/contracts/payment-status-values";
import type { PaymentOutcomeStatusProps } from "./payment-outcome-types";
import {
  ExpiredStatus,
  FailedStatus,
  OverpaidStatus,
  PaidStatus,
} from "./payment-terminal-outcomes";
import { UnderpaidStatus } from "./payment-underpaid-status";

export const PaymentOutcomeStatus = (props: PaymentOutcomeStatusProps) => {
  switch (props.update.status) {
    case PAYMENT_STATUS.paid:
      return <PaidStatus {...props} update={props.update} />;
    case PAYMENT_STATUS.underpaid:
      return <UnderpaidStatus {...props} update={props.update} />;
    case PAYMENT_STATUS.overpaid:
      return <OverpaidStatus {...props} update={props.update} />;
    case PAYMENT_STATUS.expired:
      return <ExpiredStatus {...props} update={props.update} />;
    case PAYMENT_STATUS.failed:
      return <FailedStatus {...props} update={props.update} />;
  }
};
