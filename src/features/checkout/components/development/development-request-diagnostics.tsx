import type { PaymentRequestMetricsResponse } from "../../api/contracts/development";

type DevelopmentRequestDiagnosticsProps = Readonly<{
  metrics: PaymentRequestMetricsResponse | undefined;
  isResetPending: boolean;
  onReset: () => void;
}>;

export const DevelopmentRequestDiagnostics = ({
  metrics,
  isResetPending,
  onReset,
}: DevelopmentRequestDiagnosticsProps) => (
  <details
    open
    className="mt-3 rounded-xl border border-violet-200 bg-white p-3"
  >
    <summary className="cursor-pointer text-sm font-semibold text-slate-900 outline-offset-4 focus-visible:outline-2 focus-visible:outline-violet-800">
      Polling diagnostics
    </summary>
    {metrics ? (
      <>
        <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
          {[
            ["Checking now", metrics.metrics.current_in_flight],
            ["Peak concurrent", metrics.metrics.maximum_in_flight],
            ["Checks sent", metrics.metrics.total_started],
            ["Checks finished", metrics.metrics.total_completed],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg bg-violet-50 p-2">
              <dt className="text-xs text-slate-500">{label}</dt>
              <dd className="mt-1 text-lg font-semibold text-slate-950">
                {value}
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-2 text-xs leading-5 text-slate-500">
          Expected peak: 1. Higher means status checks overlapped.
        </p>
      </>
    ) : (
      <p className="mt-3 text-sm text-slate-600">
        Loading polling diagnostics…
      </p>
    )}
    <button
      type="button"
      disabled={isResetPending}
      className="mt-3 min-h-11 w-full rounded-xl border border-violet-400 bg-white px-4 py-2 text-sm font-semibold text-violet-900 outline-offset-2 hover:bg-violet-100 focus-visible:outline-2 focus-visible:outline-violet-900 disabled:cursor-wait disabled:opacity-60"
      onClick={onReset}
    >
      Reset polling diagnostics
    </button>
  </details>
);
