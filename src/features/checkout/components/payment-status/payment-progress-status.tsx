"use client";

import { useId } from "react";

import type {
  ConfirmingUpdate,
  DetectedUpdate,
} from "../../api/contracts/payment-status";
import { PAYMENT_STATUS } from "../../api/contracts/payment-status-values";
import type { CreatePaymentResponse } from "../../api/contracts/payments";
import { formatTransferAmount } from "../../domain/money";
import { getPaymentPresentation } from "../../domain/payment-presentation";

type PaymentProgressStatusProps = Readonly<{
  payment: CreatePaymentResponse;
  update: DetectedUpdate | ConfirmingUpdate;
  assetDecimals: number;
}>;

export const PaymentProgressStatus = ({
  payment,
  update,
  assetDecimals,
}: PaymentProgressStatusProps) => {
  const titleId = useId();
  const presentation = getPaymentPresentation(update.status);
  const amountReceived = formatTransferAmount(
    update.amount_received,
    assetDecimals,
  );
  const isDetected = update.status === PAYMENT_STATUS.detected;

  return (
    <section
      role="status"
      aria-labelledby={titleId}
      className="mt-5 rounded-2xl border border-sky-200 bg-sky-50 p-5 text-sky-950"
    >
      <p className="text-xs font-bold tracking-[0.16em] text-sky-700 uppercase">
        Payment in progress
      </p>
      <h2 id={titleId} className="mt-1 text-lg font-semibold">
        {presentation.heading}
      </h2>
      <p className="mt-2 text-sm leading-6">
        {isDetected
          ? "Your transfer was found with zero confirmations."
          : "Your transfer is gaining the required network confirmations."}
      </p>

      <div className="mt-4 rounded-xl border border-sky-200 bg-white/70 p-4">
        <div className="flex items-baseline justify-between gap-4 text-sm">
          <span className="font-medium">Network confirmations</span>
          <strong className="font-mono tabular-nums">
            {update.confirmations} of {update.required_confirmations}
          </strong>
        </div>
        <progress
          aria-label="Network confirmations"
          className="mt-3 h-2 w-full accent-sky-700"
          value={update.confirmations}
          max={update.required_confirmations}
        />
      </div>

      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-sky-700">Received</dt>
          <dd className="mt-1 font-mono font-semibold break-all">
            {amountReceived} {payment.quote.crypto_currency}
          </dd>
        </div>
        <div>
          <dt className="text-sky-700">Payment method</dt>
          <dd className="mt-1 font-semibold">
            {payment.quote.crypto_currency} on {payment.quote.network_name}
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-sky-700">Transaction hash</dt>
          <dd className="mt-1 font-mono text-xs break-all">{update.tx_hash}</dd>
        </div>
      </dl>

      <p className="mt-4 rounded-xl bg-sky-950 px-4 py-3 text-sm leading-6 font-semibold text-white">
        {presentation.safetyInstruction}
      </p>
      <p className="mt-3 text-xs text-sky-800">
        Payment reference{" "}
        <span className="font-mono font-semibold">
          {payment.payment_reference}
        </span>
      </p>
    </section>
  );
};
