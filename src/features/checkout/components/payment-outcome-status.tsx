"use client";

import { useId, type ReactNode } from "react";

import type {
  ExpiredUpdate,
  FailedUpdate,
  OverpaidUpdate,
  PaidUpdate,
  UnderpaidUpdate,
} from "../api/contracts/payment-status";
import { PAYMENT_STATUS } from "../api/contracts/payment-status-values";
import type { CreatePaymentResponse } from "../api/contracts/payments";
import { formatTransferAmount } from "../domain/money";
import { getPaymentPresentation } from "../domain/payment-presentation";
import { AddressCopy } from "./address-copy";
import { NetworkSafetyNotice } from "./network-safety-notice";
import { PaymentQr } from "./payment-qr";

type PaymentOutcomeUpdate =
  PaidUpdate | UnderpaidUpdate | OverpaidUpdate | ExpiredUpdate | FailedUpdate;

type PaymentOutcomeStatusProps = Readonly<{
  payment: CreatePaymentResponse;
  update: PaymentOutcomeUpdate;
  assetDecimals: number;
}>;

export function PaymentOutcomeStatus(props: PaymentOutcomeStatusProps) {
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
}

function StatusFrame({
  update,
  payment,
  treatment,
  label,
  children,
}: Readonly<{
  update: PaymentOutcomeUpdate;
  payment: CreatePaymentResponse;
  treatment: string;
  label: string;
  children: ReactNode;
}>) {
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
}

function PaidStatus({
  payment,
  update,
  assetDecimals,
}: PaymentOutcomeStatusProps & Readonly<{ update: PaidUpdate }>) {
  const amountReceived = formatTransferAmount(
    update.amount_received,
    assetDecimals,
  );

  return (
    <StatusFrame
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
    </StatusFrame>
  );
}

function UnderpaidStatus({
  payment,
  update,
  assetDecimals,
}: PaymentOutcomeStatusProps & Readonly<{ update: UnderpaidUpdate }>) {
  const asset = payment.quote.crypto_currency;
  const received = formatTransferAmount(update.amount_received, assetDecimals);
  const outstanding = formatTransferAmount(
    update.amount_outstanding,
    assetDecimals,
  );

  return (
    <StatusFrame
      update={update}
      payment={payment}
      label="Action required"
      treatment="border-amber-300 bg-amber-50 text-amber-950"
    >
      <dl className="mt-4 grid gap-3 rounded-xl bg-white/70 p-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-amber-800">Received</dt>
          <dd className="mt-1 font-mono font-semibold break-all">
            {received} {asset}
          </dd>
        </div>
        <div>
          <dt className="text-amber-800">Send only the outstanding amount</dt>
          <dd className="mt-1 font-mono text-xl font-semibold break-all">
            {outstanding} {asset}
          </dd>
        </div>
      </dl>
      <p className="mt-4 text-sm leading-6 font-semibold">
        Send only {outstanding} {asset} on {payment.quote.network_name} to the
        same address below. This page will continue checking the payment.
      </p>
      <div className="mt-4">
        <NetworkSafetyNotice
          asset={asset}
          networkName={payment.quote.network_name}
        />
      </div>
      <div className="mt-5 grid items-start gap-5 md:grid-cols-[15rem_minmax(0,1fr)]">
        <PaymentQr
          address={update.crypto_address}
          asset={asset}
          networkName={payment.quote.network_name}
        />
        <AddressCopy
          address={update.crypto_address}
          asset={asset}
          networkName={payment.quote.network_name}
        />
      </div>
    </StatusFrame>
  );
}

function OverpaidStatus({
  payment,
  update,
  assetDecimals,
}: PaymentOutcomeStatusProps & Readonly<{ update: OverpaidUpdate }>) {
  const asset = payment.quote.crypto_currency;
  const received = formatTransferAmount(update.amount_received, assetDecimals);
  const excess = formatTransferAmount(update.amount_excess, assetDecimals);

  return (
    <StatusFrame
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
    </StatusFrame>
  );
}

function ExpiredStatus({
  payment,
  update,
}: PaymentOutcomeStatusProps & Readonly<{ update: ExpiredUpdate }>) {
  return (
    <StatusFrame
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
    </StatusFrame>
  );
}

function FailedStatus({
  payment,
  update,
}: PaymentOutcomeStatusProps & Readonly<{ update: FailedUpdate }>) {
  return (
    <StatusFrame
      update={update}
      payment={payment}
      label="Support required"
      treatment="border-rose-200 bg-rose-50 text-rose-950"
    >
      <p className="mt-4 text-sm leading-6">
        The payment processor rejected settlement. Do not repeat the full
        payment. Keep the reference shown below and contact payment support for
        a safe next step.
      </p>
    </StatusFrame>
  );
}
