import type { PaymentQuote } from "../api/contracts/payments";
import { formatTransferAmount } from "../domain/money";
import { AddressCopy } from "./address-copy";
import { NetworkSafetyNotice } from "./network-safety-notice";
import { PaymentQr } from "./payment-qr";

type PaymentInstructionsProps = Readonly<{
  quote: PaymentQuote;
  assetDecimals: number;
}>;

export function PaymentInstructions({
  quote,
  assetDecimals,
}: PaymentInstructionsProps) {
  const asset = quote.crypto_currency;
  const paymentAmount = formatTransferAmount(
    quote.crypto_amount,
    assetDecimals,
  );
  const networkFee = formatTransferAmount(quote.network_fee, assetDecimals);
  const totalDue = formatTransferAmount(quote.total_due, assetDecimals);

  return (
    <section
      aria-labelledby="payment-instructions-title"
      className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"
    >
      <p className="text-sm font-semibold text-emerald-700">
        Transfer instructions
      </p>
      <h2
        id="payment-instructions-title"
        className="mt-2 text-2xl font-semibold tracking-tight text-slate-950"
      >
        Send exactly
      </h2>
      <p className="mt-3 font-mono text-3xl font-semibold tracking-tight break-all text-slate-950 sm:text-4xl">
        {totalDue} <span className="font-sans text-xl">{asset}</span>
      </p>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Use the <strong className="text-slate-950">{quote.network_name}</strong>{" "}
        network. The amount and network must match this quote.
      </p>

      <dl className="my-6 divide-y divide-slate-100 rounded-2xl bg-slate-50 px-4">
        <div className="flex items-start justify-between gap-4 py-3 text-sm">
          <dt className="text-slate-600">Payment amount</dt>
          <dd className="text-right font-mono font-semibold break-all text-slate-950">
            {paymentAmount} {asset}
          </dd>
        </div>
        <div className="flex items-start justify-between gap-4 py-3 text-sm">
          <dt className="text-slate-600">Network fee</dt>
          <dd className="text-right font-mono font-semibold break-all text-slate-950">
            {networkFee} {asset}
          </dd>
        </div>
        <div className="flex items-start justify-between gap-4 py-3 text-sm">
          <dt className="font-semibold text-slate-950">Total due</dt>
          <dd className="text-right font-mono font-semibold break-all text-slate-950">
            {totalDue} {asset}
          </dd>
        </div>
      </dl>

      <NetworkSafetyNotice asset={asset} networkName={quote.network_name} />

      <div className="mt-6 grid items-start gap-5 md:grid-cols-[15rem_minmax(0,1fr)]">
        <PaymentQr
          address={quote.crypto_address}
          asset={asset}
          networkName={quote.network_name}
        />
        <AddressCopy
          address={quote.crypto_address}
          asset={asset}
          networkName={quote.network_name}
        />
      </div>
    </section>
  );
}
