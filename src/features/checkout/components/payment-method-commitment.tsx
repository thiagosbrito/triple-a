"use client";

import { useEffect, useRef, useState } from "react";

import type { CreatePaymentResponse } from "../api/contracts/payments";

type PaymentMethodCommitmentProps = Readonly<{
  payment: CreatePaymentResponse;
  onConfirmChange(): void;
}>;

export function PaymentMethodCommitment({
  payment,
  onConfirmChange,
}: PaymentMethodCommitmentProps) {
  const [isConfirmingChange, setIsConfirmingChange] = useState(false);
  const changeButton = useRef<HTMLButtonElement>(null);
  const keepButton = useRef<HTMLButtonElement>(null);
  const confirmationWasOpen = useRef(false);

  useEffect(() => {
    if (isConfirmingChange) {
      confirmationWasOpen.current = true;
      keepButton.current?.focus();
      return;
    }

    if (confirmationWasOpen.current) {
      confirmationWasOpen.current = false;
      changeButton.current?.focus();
    }
  }, [isConfirmingChange]);

  function keepCurrentQuote(): void {
    setIsConfirmingChange(false);
  }

  return (
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

      {!isConfirmingChange ? (
        <button
          ref={changeButton}
          type="button"
          className="mt-5 min-h-11 rounded-xl border border-emerald-800 px-4 py-2 text-sm font-semibold text-emerald-950 outline-offset-2 hover:bg-emerald-100 focus-visible:outline-2 focus-visible:outline-emerald-950"
          onClick={() => setIsConfirmingChange(true)}
        >
          Change payment method
        </button>
      ) : (
        <div
          role="alertdialog"
          aria-labelledby="change-method-title"
          aria-describedby="change-method-description"
          className="mt-5 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-950"
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              keepCurrentQuote();
            }
          }}
        >
          <h3 id="change-method-title" className="font-semibold">
            Confirm payment method change
          </h3>
          <p id="change-method-description" className="mt-2 text-sm leading-6">
            Continue only if you have not sent funds or started the transfer. We
            will hide this quote before you choose another method. If you
            already sent funds, keep this quote and wait for detection.
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <button
              ref={keepButton}
              type="button"
              className="min-h-11 rounded-xl bg-amber-950 px-4 py-2 text-sm font-semibold text-white outline-offset-2 hover:bg-amber-900 focus-visible:outline-2 focus-visible:outline-amber-950"
              onClick={keepCurrentQuote}
            >
              Keep current quote
            </button>
            <button
              type="button"
              className="min-h-11 rounded-xl border border-amber-800 px-4 py-2 text-sm font-semibold text-amber-950 outline-offset-2 hover:bg-amber-100 focus-visible:outline-2 focus-visible:outline-amber-950"
              onClick={onConfirmChange}
            >
              I have not sent funds — change method
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
