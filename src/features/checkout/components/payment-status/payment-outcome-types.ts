import type {
  ExpiredUpdate,
  FailedUpdate,
  OverpaidUpdate,
  PaidUpdate,
  UnderpaidUpdate,
} from "../../api/contracts/payment-status";
import type { CreatePaymentResponse } from "../../api/contracts/payments";

export type PaymentOutcomeUpdate =
  PaidUpdate | UnderpaidUpdate | OverpaidUpdate | ExpiredUpdate | FailedUpdate;

export type PaymentOutcomeStatusProps = Readonly<{
  payment: CreatePaymentResponse;
  update: PaymentOutcomeUpdate;
  assetDecimals: number;
}>;
