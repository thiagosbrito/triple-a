"use client";

import { useId, type ReactNode } from "react";

import type { CreatePaymentResponse } from "../../api/contracts/payments";
import { getPaymentPresentation } from "../../domain/payment-presentation";
import type { PaymentOutcomeUpdate } from "./payment-outcome-types";

type PaymentOutcomeFrameProps = Readonly<{
  update: PaymentOutcomeUpdate;
  payment: CreatePaymentResponse;
  treatment: string;
  label: string;
  children: ReactNode;
}>;

export const PaymentOutcomeFrame = ({
  update,
  payment,
  treatment,
  label,
  children,
}: PaymentOutcomeFrameProps) => {
  const titleId = useId();
  const presentation = getPaymentPresentation(update.status);

  return (
    <section
      aria-labelledby={titleId}
      className={`mt-5 rounded-2xl border p-5 ${treatment}`}
    >
      <div role="status" aria-labelledby={titleId}>
        <p className="text-xs font-bold tracking-[0.16em] uppercase opacity-75">
          {label}
        </p>
        <h2 id={titleId} className="mt-1 text-lg font-semibold">
          {presentation.heading}
        </h2>
        <p className="mt-2 text-sm leading-6">{presentation.summary}</p>
      </div>
      {children}
      <p className="mt-4 text-xs opacity-80">
        Payment reference{" "}
        <span className="font-mono font-semibold">
          {payment.payment_reference}
        </span>
      </p>
    </section>
  );
};
