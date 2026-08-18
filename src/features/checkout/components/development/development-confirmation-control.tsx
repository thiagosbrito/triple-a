import type { DevelopmentConfirmationResponse } from "../../api/contracts/development";
import { PAYMENT_STATUS } from "../../api/contracts/payment-status-values";

type DevelopmentConfirmationControlProps = Readonly<{
  isPending: boolean;
  isError: boolean;
  result: DevelopmentConfirmationResponse | undefined;
  onAdvance: () => void;
}>;

export const DevelopmentConfirmationControl = ({
  isPending,
  isError,
  result,
  onAdvance,
}: DevelopmentConfirmationControlProps) => {
  const confirmingUpdate =
    result?.update.status === PAYMENT_STATUS.confirming
      ? result.update
      : undefined;

  return (
    <section className="mt-3 rounded-xl border border-violet-200 bg-white p-3">
      <h3 className="text-sm font-semibold text-slate-900">
        Network confirmations
      </h3>
      <p className="mt-1 text-xs leading-5 text-slate-600">
        Send one mock blockchain confirmation. Detected funds move from zero to
        confirming, and the payment becomes paid at the required count.
      </p>
      <button
        type="button"
        disabled={isPending}
        className="mt-3 min-h-11 w-full rounded-xl border border-violet-300 bg-violet-100 px-4 py-2 text-sm font-semibold text-violet-950 outline-offset-2 hover:bg-violet-200 focus-visible:outline-2 focus-visible:outline-violet-900 disabled:cursor-wait disabled:opacity-60"
        onClick={onAdvance}
      >
        {isPending ? "Sending confirmation…" : "Send next confirmation"}
      </button>
      {confirmingUpdate ? (
        <p role="status" className="mt-2 text-xs font-medium text-violet-900">
          Confirmation recorded: {confirmingUpdate.confirmations} of{" "}
          {confirmingUpdate.required_confirmations}.
        </p>
      ) : null}
      {isError ? (
        <p role="alert" className="mt-2 text-xs font-medium text-rose-800">
          Confirmation signal could not be applied.
        </p>
      ) : null}
    </section>
  );
};
