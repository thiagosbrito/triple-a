import type {
  ExpiredUpdate,
  FailedUpdate,
  OverpaidUpdate,
  PaidUpdate,
} from "../../api/contracts/payment-status";
import { formatTransferAmount } from "../../domain/money";
import { PaymentOutcomeFrame } from "./payment-outcome-frame";
import type { PaymentOutcomeStatusProps } from "./payment-outcome-types";

export const PaidStatus = ({
  payment,
  update,
  assetDecimals,
}: PaymentOutcomeStatusProps & Readonly<{ update: PaidUpdate }>) => {
  const amountReceived = formatTransferAmount(
    update.amount_received,
    assetDecimals,
  );

  return (
    <PaymentOutcomeFrame
      update={update}
      payment={payment}
      label="Completed"
      treatment="border-emerald-200 bg-emerald-50 text-emerald-950"
    >
      <dl className="mt-4 grid gap-3 rounded-xl bg-white/70 p-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-emerald-700">Amount received</dt>
          <dd className="mt-1 font-mono font-semibold break-all">
            {amountReceived} {payment.quote.crypto_currency}
          </dd>
        </div>
        <div>
          <dt className="text-emerald-700">Confirmations</dt>
          <dd className="mt-1 font-semibold">
            {update.confirmations} of {update.required_confirmations}
          </dd>
        </div>
      </dl>
      <p className="mt-4 text-sm font-semibold">
        No further payment is required.
      </p>
    </PaymentOutcomeFrame>
  );
};

export const OverpaidStatus = ({
  payment,
  update,
  assetDecimals,
}: PaymentOutcomeStatusProps & Readonly<{ update: OverpaidUpdate }>) => {
  const asset = payment.quote.crypto_currency;
  const received = formatTransferAmount(update.amount_received, assetDecimals);
  const excess = formatTransferAmount(update.amount_excess, assetDecimals);

  return (
    <PaymentOutcomeFrame
      update={update}
      payment={payment}
      label="Support may be required"
      treatment="border-rose-200 bg-rose-50 text-rose-950"
    >
      <dl className="mt-4 grid gap-3 rounded-xl bg-white/70 p-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-rose-700">Amount received</dt>
          <dd className="mt-1 font-mono font-semibold break-all">
            {received} {asset}
          </dd>
        </div>
        <div>
          <dt className="text-rose-700">Excess amount</dt>
          <dd className="mt-1 font-mono font-semibold break-all">
            {excess} {asset}
          </dd>
        </div>
      </dl>
      <p className="mt-4 text-sm leading-6 font-semibold">
        Do not send more. Keep the payment reference and contact payment
        support. This checkout cannot promise whether, when, or how the excess
        will be refunded.
      </p>
    </PaymentOutcomeFrame>
  );
};

export const ExpiredStatus = ({
  payment,
  update,
}: PaymentOutcomeStatusProps & Readonly<{ update: ExpiredUpdate }>) => (
  <PaymentOutcomeFrame
    update={update}
    payment={payment}
    label="Action required"
    treatment="border-amber-300 bg-amber-50 text-amber-950"
  >
    <p className="mt-4 text-sm leading-6 font-semibold">
      Do not use the previous amount, address, or QR code. Request a complete
      new quote before sending.
    </p>
    <p className="mt-3 text-xs text-amber-800">
      Expired at <time dateTime={update.expired_at}>{update.expired_at}</time>
    </p>
  </PaymentOutcomeFrame>
);

export const FailedStatus = ({
  payment,
  update,
}: PaymentOutcomeStatusProps & Readonly<{ update: FailedUpdate }>) => (
  <PaymentOutcomeFrame
    update={update}
    payment={payment}
    label="Support required"
    treatment="border-rose-200 bg-rose-50 text-rose-950"
  >
    <p className="mt-4 text-sm leading-6">
      The payment processor rejected settlement. Do not repeat the full payment.
      Keep the reference shown below and contact payment support for a safe next
      step.
    </p>
  </PaymentOutcomeFrame>
);
