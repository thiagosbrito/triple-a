type NetworkSafetyNoticeProps = Readonly<{
  asset: string;
  networkName: string;
}>;

export const NetworkSafetyNotice = ({
  asset,
  networkName,
}: NetworkSafetyNoticeProps) => {
  return (
    <aside
      aria-labelledby="network-safety-title"
      className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-950"
    >
      <p
        id="network-safety-title"
        className="text-sm font-semibold tracking-wide uppercase"
      >
        Use only {networkName}
      </p>
      <p className="mt-2 text-sm leading-6">
        Send only {asset} on {networkName} to the address below. A different
        asset or network may permanently lose your funds.
      </p>
    </aside>
  );
};
