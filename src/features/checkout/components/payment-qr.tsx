import { QRCodeSVG } from "qrcode.react";

type PaymentQrProps = Readonly<{
  address: string;
  asset: string;
  networkName: string;
}>;

export function PaymentQr({ address, asset, networkName }: PaymentQrProps) {
  const accessibleName = `${asset} destination address QR code for ${networkName}`;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center">
      <QRCodeSVG
        value={address}
        size={240}
        level="M"
        marginSize={4}
        title={accessibleName}
        role="img"
        aria-label={accessibleName}
        data-payment-qr-payload={address}
        className="mx-auto h-auto w-full max-w-60"
      />
      <p className="mt-3 text-sm font-semibold text-slate-950">
        Scan the destination address
      </p>
      <p className="mt-1 text-xs leading-5 text-slate-600">
        The QR contains only the exact address shown here. Confirm your wallet
        is sending {asset} on {networkName}.
      </p>
    </div>
  );
}
