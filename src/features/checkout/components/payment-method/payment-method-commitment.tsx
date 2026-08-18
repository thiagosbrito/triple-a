"use client";

import type { CreatePaymentResponse } from "../../api/contracts/payments";

type PaymentMethodCommitmentProps = Readonly<{
  payment: CreatePaymentResponse;
  onChangeMethod: () => void;
}>;

export const PaymentMethodCommitment = ({
  payment,
  onChangeMethod,
}: PaymentMethodCommitmentProps) => (
  <section
    aria-labelledby="issued-method-title"
    className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-950"
  >
    <div role="status" aria-labelledby="issued-method-title">
      <p
        id="issued-method-title"
        className="text-xs font-semibold tracking-[0.14em] text-emerald-700 uppercase"
      >
        Quote created
      </p>
      <h2 className="mt-2 text-xl font-semibold tracking-tight">
        {payment.quote.crypto_currency} on {payment.quote.network_name}
      </h2>
      <p className="mt-2 text-sm leading-6 text-emerald-900">
        This asset and network are fixed for payment reference{" "}
        <span className="font-mono font-semibold">
          {payment.payment_reference}
        </span>
        .
      </p>
    </div>

    <button
      type="button"
      className="mt-5 min-h-11 rounded-xl border border-emerald-800 px-4 py-2 text-sm font-semibold text-emerald-950 outline-offset-2 hover:bg-emerald-100 focus-visible:outline-2 focus-visible:outline-emerald-950"
      onClick={onChangeMethod}
    >
      Change payment method
    </button>
  </section>
);
