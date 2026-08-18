import type { UnderpaidUpdate } from "../../api/contracts/payment-status";
import { formatTransferAmount } from "../../domain/money";
import { AddressCopy } from "../payment-instructions/address-copy";
import { NetworkSafetyNotice } from "../payment-instructions/network-safety-notice";
import { PaymentQr } from "../payment-instructions/payment-qr";
import { PaymentOutcomeFrame } from "./payment-outcome-frame";
import type { PaymentOutcomeStatusProps } from "./payment-outcome-types";

type UnderpaidStatusProps = PaymentOutcomeStatusProps &
  Readonly<{ update: UnderpaidUpdate }>;

export const UnderpaidStatus = ({
  payment,
  update,
  assetDecimals,
}: UnderpaidStatusProps) => {
  const asset = payment.quote.crypto_currency;
  const received = formatTransferAmount(update.amount_received, assetDecimals);
  const outstanding = formatTransferAmount(
    update.amount_outstanding,
    assetDecimals,
  );

  return (
    <PaymentOutcomeFrame
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
        same address below. This page will continue checking the payment. Your
        wallet may charge another network fee for this transfer.
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
    </PaymentOutcomeFrame>
  );
};
