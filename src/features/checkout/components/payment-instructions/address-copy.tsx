"use client";

import { useId, useState } from "react";

type CopyState = "idle" | "copied" | "failed";

type AddressCopyProps = Readonly<{
  address: string;
  asset: string;
  networkName: string;
}>;

export const AddressCopy = ({
  address,
  asset,
  networkName,
}: AddressCopyProps) => {
  const addressId = useId();
  const [copyState, setCopyState] = useState<CopyState>("idle");

  const copyAddress = async (): Promise<void> => {
    try {
      if (!navigator.clipboard) {
        throw new Error("Clipboard API is unavailable");
      }

      await navigator.clipboard.writeText(address);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  };

  return (
    <div>
      <p className="text-sm font-semibold text-slate-950">
        Destination address
      </p>
      <p className="mt-1 text-sm leading-6 text-slate-600">
        This address accepts {asset} on {networkName} only.
      </p>

      <div className="mt-3 rounded-2xl border border-slate-300 bg-slate-50 p-4">
        <code
          id={addressId}
          className="block font-mono text-sm leading-6 break-all text-slate-950"
        >
          {address}
        </code>
        <button
          type="button"
          aria-describedby={addressId}
          className="mt-4 min-h-11 rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white outline-offset-2 hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-slate-950"
          onClick={() => void copyAddress()}
        >
          Copy address
        </button>
      </div>

      {copyState === "copied" ? (
        <p role="status" className="mt-3 text-sm font-medium text-emerald-800">
          Address copied. Verify it in your wallet before sending.
        </p>
      ) : null}

      {copyState === "failed" ? (
        <p role="alert" className="mt-3 text-sm font-medium text-rose-800">
          The address could not be copied automatically. Select and copy the
          full address shown above.
        </p>
      ) : null}
    </div>
  );
};
