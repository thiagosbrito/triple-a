import { QRCodeSVG } from "qrcode.react";

type PaymentQrProps = Readonly<{
  address: string;
  asset: string;
  networkName: string;
  compact?: boolean;
}>;

export const PaymentQr = ({
  address,
  asset,
  networkName,
  compact = false,
}: PaymentQrProps) => {
  const accessibleName = `${asset} destination address QR code for ${networkName}`;

  return (
    <div
      className={`rounded-2xl border border-slate-200 bg-white text-center ${compact ? "flex h-full flex-col justify-center p-4" : "p-4"}`}
    >
      <QRCodeSVG
        value={address}
        size={240}
        level="M"
        marginSize={4}
        title={accessibleName}
        role="img"
        aria-label={accessibleName}
        data-payment-qr-payload={address}
        className={`mx-auto h-auto w-full ${compact ? "max-w-44" : "max-w-60"}`}
      />
      <p className="mt-3 text-sm font-semibold text-slate-950">
        {compact ? "Scan address" : "Scan the destination address"}
      </p>
      {compact ? (
        <p className="mt-1 text-xs text-slate-600">
          {asset} · {networkName}
        </p>
      ) : (
        <p className="mt-1 text-xs leading-5 text-slate-600">
          The QR contains only the exact address shown here. Confirm your wallet
          is sending {asset} on {networkName}.
        </p>
      )}
    </div>
  );
};
