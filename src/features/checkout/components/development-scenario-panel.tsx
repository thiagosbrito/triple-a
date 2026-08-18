"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { developmentApi } from "../api/development-api";
import {
  checkoutMutationKeys,
  checkoutQueryKeys,
} from "../api/checkout-query-keys";
import {
  MAX_SCENARIO_DELAY_MILLISECONDS,
  paymentScenarioConfigurationSchema,
  type PaymentScenarioConfiguration,
} from "../api/contracts/development";
import {
  PAYMENT_STATUSES,
  PAYMENT_STATUS,
  type PaymentStatus,
} from "../api/contracts/payment-status-values";
import type { PaymentReference } from "../api/contracts/primitives";

type ScenarioMode = PaymentScenarioConfiguration["scenario"]["mode"];
type FailureMode = PaymentScenarioConfiguration["failure"]["mode"];
type FailureKind = "http_500" | "network_disconnect";

const STATUS_LABELS: Record<PaymentStatus, string> = {
  awaiting_payment: "Awaiting payment",
  detected: "Detected (0 confirmations)",
  confirming: "Confirming",
  paid: "Paid",
  underpaid: "Underpaid",
  overpaid: "Overpaid",
  expired: "Expired",
  failed: "Settlement failed",
};

const DEVELOPMENT_TOOLS_DOCK_CLASS_NAME =
  "fixed inset-x-0 bottom-0 z-50 max-h-[85dvh] overflow-y-auto rounded-t-2xl border-2 border-b-0 border-dashed border-violet-300 bg-violet-50 text-left shadow-[0_-20px_60px_-28px_rgba(76,29,149,0.45)] sm:inset-y-0 sm:right-0 sm:left-auto sm:max-h-none sm:w-[22rem] sm:rounded-none sm:border-y-0 sm:border-r-0 sm:shadow-[-20px_0_60px_-32px_rgba(76,29,149,0.45)]";

function DevelopmentToolsHeader({
  paymentReference,
  onClose,
}: Readonly<{
  paymentReference?: PaymentReference;
  onClose(): void;
}>) {
  return (
    <header className="sticky top-0 z-10 border-b border-violet-200 bg-violet-50/95 p-4 backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[0.65rem] font-bold tracking-[0.16em] text-violet-800 uppercase">
            Development only
          </p>
          <h2 className="mt-1 text-base font-semibold text-slate-950">
            Evaluator controls
          </h2>
        </div>
        <button
          type="button"
          aria-label="Close development tools"
          className="flex size-11 items-center justify-center rounded-xl border border-violet-300 bg-white text-xl text-violet-950 outline-offset-2 hover:bg-violet-100 focus-visible:outline-2 focus-visible:outline-violet-900"
          onClick={onClose}
        >
          <span aria-hidden="true">×</span>
        </button>
      </div>
      {paymentReference ? (
        <code className="mt-3 block overflow-hidden rounded-lg bg-white px-3 py-2 text-xs text-ellipsis whitespace-nowrap text-violet-900">
          {paymentReference}
        </code>
      ) : null}
    </header>
  );
}

export function DevelopmentToolsEmptyPanel({
  onClose,
}: Readonly<{ onClose(): void }>) {
  return (
    <aside
      id="development-tools-panel"
      aria-label="Development scenario controls"
      className={DEVELOPMENT_TOOLS_DOCK_CLASS_NAME}
    >
      <DevelopmentToolsHeader onClose={onClose} />
      <div className="p-4">
        <section
          role="status"
          aria-labelledby="development-tools-empty-title"
          className="rounded-xl border border-violet-200 bg-white p-4"
        >
          <h3
            id="development-tools-empty-title"
            className="font-semibold text-slate-950"
          >
            Create a quote to enable scenarios
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Select a payment method in the checkout. Payment-state, network, and
            polling controls will appear here once the mock API issues a payment
            reference.
          </p>
        </section>
      </div>
    </aside>
  );
}

function configurationFrom(
  scenarioMode: ScenarioMode,
  status: PaymentStatus,
  responseDelayMilliseconds: number,
  failureMode: FailureMode,
  failureKind: FailureKind,
): PaymentScenarioConfiguration {
  return paymentScenarioConfigurationSchema.parse({
    scenario:
      scenarioMode === "progression"
        ? { mode: "progression" }
        : { mode: "exact_state", status },
    response_delay_ms: responseDelayMilliseconds,
    failure:
      failureMode === "none"
        ? { mode: "none" }
        : { mode: failureMode, kind: failureKind },
  });
}

export function DevelopmentScenarioPanel({
  paymentReference,
  onClose,
}: Readonly<{
  paymentReference: PaymentReference;
  onClose(): void;
}>) {
  const queryClient = useQueryClient();
  const [scenarioMode, setScenarioMode] = useState<ScenarioMode>("exact_state");
  const [status, setStatus] = useState<PaymentStatus>(
    PAYMENT_STATUS.awaiting_payment,
  );
  const [responseDelayMilliseconds, setResponseDelayMilliseconds] = useState(0);
  const [failureMode, setFailureMode] = useState<FailureMode>("none");
  const [failureKind, setFailureKind] = useState<FailureKind>("http_500");

  const scenario = useQuery({
    queryKey: checkoutQueryKeys.developmentScenario(paymentReference),
    queryFn: () => developmentApi.getScenario(paymentReference),
    retry: false,
    staleTime: Number.POSITIVE_INFINITY,
  });
  const metrics = useQuery({
    queryKey: checkoutQueryKeys.developmentRequestMetrics(paymentReference),
    queryFn: () => developmentApi.getRequestMetrics(paymentReference),
    refetchInterval: 1_000,
    retry: false,
  });

  const updateScenario = useMutation({
    mutationKey: checkoutMutationKeys.setDevelopmentScenario(paymentReference),
    mutationFn: (configuration: PaymentScenarioConfiguration) =>
      developmentApi.setScenario(paymentReference, configuration),
    onSuccess: async (response) => {
      queryClient.setQueryData(
        checkoutQueryKeys.developmentScenario(paymentReference),
        response,
      );
      await queryClient.refetchQueries({
        queryKey: checkoutQueryKeys.paymentStatus(paymentReference),
        exact: true,
        type: "active",
      });
    },
  });
  const resetMetrics = useMutation({
    mutationKey:
      checkoutMutationKeys.resetDevelopmentRequestMetrics(paymentReference),
    mutationFn: () => developmentApi.resetRequestMetrics(paymentReference),
    onSuccess: (response) => {
      queryClient.setQueryData(
        checkoutQueryKeys.developmentRequestMetrics(paymentReference),
        response,
      );
    },
  });

  const inputClassName =
    "mt-1 min-h-11 w-full rounded-lg border border-violet-300 bg-white px-3 py-2 text-sm text-slate-950 outline-offset-2 focus-visible:outline-2 focus-visible:outline-violet-700 disabled:bg-slate-100";

  return (
    <aside
      id="development-tools-panel"
      aria-label="Development scenario controls"
      className={DEVELOPMENT_TOOLS_DOCK_CLASS_NAME}
    >
      <DevelopmentToolsHeader
        paymentReference={paymentReference}
        onClose={onClose}
      />

      <div className="p-4">
        {scenario.isError ? (
          <p role="alert" className="mb-4 text-sm font-medium text-rose-800">
            Scenario controls could not read the development API.
          </p>
        ) : null}

        <form
          className="grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            updateScenario.mutate(
              configurationFrom(
                scenarioMode,
                status,
                responseDelayMilliseconds,
                failureMode,
                failureKind,
              ),
            );
          }}
        >
          <details
            open
            className="rounded-xl border border-violet-200 bg-white p-3"
          >
            <summary className="cursor-pointer text-sm font-semibold text-slate-900 outline-offset-4 focus-visible:outline-2 focus-visible:outline-violet-800">
              Payment state
            </summary>
            <div className="mt-3 grid gap-3">
              <label className="text-sm font-semibold text-slate-800">
                Scenario
                <select
                  className={inputClassName}
                  value={scenarioMode}
                  onChange={(event) =>
                    setScenarioMode(event.target.value as ScenarioMode)
                  }
                >
                  <option value="exact_state">Exact state</option>
                  <option value="progression">Happy-path progression</option>
                </select>
              </label>

              <label className="text-sm font-semibold text-slate-800">
                Payment state
                <select
                  className={inputClassName}
                  disabled={scenarioMode === "progression"}
                  value={status}
                  onChange={(event) =>
                    setStatus(event.target.value as PaymentStatus)
                  }
                >
                  {PAYMENT_STATUSES.map((paymentStatus) => (
                    <option key={paymentStatus} value={paymentStatus}>
                      {STATUS_LABELS[paymentStatus]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </details>

          <details className="rounded-xl border border-violet-200 bg-white p-3">
            <summary className="cursor-pointer text-sm font-semibold text-slate-900 outline-offset-4 focus-visible:outline-2 focus-visible:outline-violet-800">
              Network conditions
            </summary>
            <div className="mt-3 grid gap-3">
              <label className="text-sm font-semibold text-slate-800">
                Response delay (ms)
                <input
                  className={inputClassName}
                  max={MAX_SCENARIO_DELAY_MILLISECONDS}
                  min={0}
                  step={100}
                  type="number"
                  value={responseDelayMilliseconds}
                  onChange={(event) =>
                    setResponseDelayMilliseconds(
                      event.currentTarget.valueAsNumber,
                    )
                  }
                />
              </label>

              <label className="text-sm font-semibold text-slate-800">
                Transport failure
                <select
                  className={inputClassName}
                  value={failureMode}
                  onChange={(event) =>
                    setFailureMode(event.target.value as FailureMode)
                  }
                >
                  <option value="none">None</option>
                  <option value="next_request">Next request only</option>
                  <option value="persistent">Persistent</option>
                </select>
              </label>

              <label className="text-sm font-semibold text-slate-800">
                Failure kind
                <select
                  className={inputClassName}
                  disabled={failureMode === "none"}
                  value={failureKind}
                  onChange={(event) =>
                    setFailureKind(event.target.value as FailureKind)
                  }
                >
                  <option value="http_500">HTTP 500</option>
                  <option value="network_disconnect">Network disconnect</option>
                </select>
              </label>
            </div>
          </details>

          <button
            type="submit"
            disabled={updateScenario.isPending}
            className="min-h-11 w-full rounded-xl bg-violet-800 px-5 py-2 text-sm font-semibold text-white outline-offset-2 hover:bg-violet-700 focus-visible:outline-2 focus-visible:outline-violet-900 disabled:cursor-wait disabled:opacity-60"
          >
            {updateScenario.isPending ? "Applying…" : "Apply scenario"}
          </button>
          {updateScenario.isSuccess ? (
            <p role="status" className="text-sm font-medium text-violet-900">
              Scenario applied and payment status refreshed.
            </p>
          ) : null}
          {updateScenario.isError ? (
            <p role="alert" className="text-sm font-medium text-rose-800">
              Scenario could not be applied.
            </p>
          ) : null}
        </form>

        <details
          open
          className="mt-3 rounded-xl border border-violet-200 bg-white p-3"
        >
          <summary className="cursor-pointer text-sm font-semibold text-slate-900 outline-offset-4 focus-visible:outline-2 focus-visible:outline-violet-800">
            Polling diagnostics
          </summary>
          {metrics.data ? (
            <>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                {[
                  ["Checking now", metrics.data.metrics.current_in_flight],
                  ["Peak concurrent", metrics.data.metrics.maximum_in_flight],
                  ["Checks sent", metrics.data.metrics.total_started],
                  ["Checks finished", metrics.data.metrics.total_completed],
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
            disabled={resetMetrics.isPending}
            className="mt-3 min-h-11 w-full rounded-xl border border-violet-400 bg-white px-4 py-2 text-sm font-semibold text-violet-900 outline-offset-2 hover:bg-violet-100 focus-visible:outline-2 focus-visible:outline-violet-900 disabled:cursor-wait disabled:opacity-60"
            onClick={() => resetMetrics.mutate()}
          >
            Reset polling diagnostics
          </button>
        </details>
      </div>
    </aside>
  );
}
