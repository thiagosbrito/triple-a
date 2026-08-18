"use client";

import { useState } from "react";

import { MAX_QUOTE_EXPIRY_SECONDS } from "../../api/contracts/development";

type DevelopmentQuoteExpiryControlProps = Readonly<{
  isPending: boolean;
  isSuccess: boolean;
  isError: boolean;
  onApply: (expiresInSeconds: number) => void;
}>;

export const DevelopmentQuoteExpiryControl = ({
  isPending,
  isSuccess,
  isError,
  onApply,
}: DevelopmentQuoteExpiryControlProps) => {
  const [expiresInSeconds, setExpiresInSeconds] = useState(15);

  return (
    <form
      className="mt-3 rounded-xl border border-violet-200 bg-white p-3"
      onSubmit={(event) => {
        event.preventDefault();
        onApply(expiresInSeconds);
      }}
    >
      <h3 className="text-sm font-semibold text-slate-900">Quote deadline</h3>
      <p className="mt-1 text-xs leading-5 text-slate-600">
        Move the current quote deadline closer for countdown and requote demos.
        The control does not change payment status.
      </p>
      <label className="mt-3 block text-sm font-semibold text-slate-800">
        Expires in (seconds)
        <input
          className="mt-1 min-h-11 w-full rounded-lg border border-violet-300 bg-white px-3 py-2 text-sm text-slate-950 outline-offset-2 focus-visible:outline-2 focus-visible:outline-violet-700"
          max={MAX_QUOTE_EXPIRY_SECONDS}
          min={0}
          step={1}
          type="number"
          value={expiresInSeconds}
          onChange={(event) =>
            setExpiresInSeconds(event.currentTarget.valueAsNumber)
          }
        />
      </label>
      <button
        type="submit"
        disabled={isPending}
        className="mt-3 min-h-11 w-full rounded-xl border border-violet-500 bg-white px-4 py-2 text-sm font-semibold text-violet-950 outline-offset-2 hover:bg-violet-100 focus-visible:outline-2 focus-visible:outline-violet-900 disabled:cursor-wait disabled:opacity-60"
      >
        {isPending ? "Updating deadline…" : "Update quote deadline"}
      </button>
      {isSuccess ? (
        <p role="status" className="mt-2 text-sm font-medium text-violet-900">
          Quote deadline updated.
        </p>
      ) : null}
      {isError ? (
        <p role="alert" className="mt-2 text-sm font-medium text-rose-800">
          Quote deadline could not be updated.
        </p>
      ) : null}
    </form>
  );
};
