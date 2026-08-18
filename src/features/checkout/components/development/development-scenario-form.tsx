"use client";

import { useState } from "react";

import type { PaymentScenarioConfiguration } from "../../api/contracts/development";
import {
  PAYMENT_STATUS,
  type PaymentStatus,
} from "../../api/contracts/payment-status-values";
import { DevelopmentNetworkConditionFields } from "./development-network-condition-fields";
import { DevelopmentPaymentStateFields } from "./development-payment-state-fields";
import {
  configurationFromScenarioForm,
  type FailureKind,
  type FailureMode,
  type ScenarioMode,
} from "./development-scenario-form-model";

type DevelopmentScenarioFormProps = Readonly<{
  isPending: boolean;
  isSuccess: boolean;
  isError: boolean;
  onApply: (configuration: PaymentScenarioConfiguration) => void;
}>;

export const DevelopmentScenarioForm = ({
  isPending,
  isSuccess,
  isError,
  onApply,
}: DevelopmentScenarioFormProps) => {
  const [scenarioMode, setScenarioMode] = useState<ScenarioMode>("exact_state");
  const [status, setStatus] = useState<PaymentStatus>(
    PAYMENT_STATUS.awaiting_payment,
  );
  const [responseDelayMilliseconds, setResponseDelayMilliseconds] = useState(0);
  const [failureMode, setFailureMode] = useState<FailureMode>("none");
  const [failureKind, setFailureKind] = useState<FailureKind>("http_500");

  return (
    <form
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        onApply(
          configurationFromScenarioForm({
            scenarioMode,
            status,
            responseDelayMilliseconds,
            failureMode,
            failureKind,
          }),
        );
      }}
    >
      <DevelopmentPaymentStateFields
        scenarioMode={scenarioMode}
        status={status}
        onScenarioModeChange={setScenarioMode}
        onStatusChange={setStatus}
      />
      <DevelopmentNetworkConditionFields
        responseDelayMilliseconds={responseDelayMilliseconds}
        failureMode={failureMode}
        failureKind={failureKind}
        onResponseDelayChange={setResponseDelayMilliseconds}
        onFailureModeChange={setFailureMode}
        onFailureKindChange={setFailureKind}
      />

      <button
        type="submit"
        disabled={isPending}
        className="min-h-11 w-full rounded-xl bg-violet-800 px-5 py-2 text-sm font-semibold text-white outline-offset-2 hover:bg-violet-700 focus-visible:outline-2 focus-visible:outline-violet-900 disabled:cursor-wait disabled:opacity-60"
      >
        {isPending ? "Applying…" : "Apply scenario"}
      </button>
      {isSuccess ? (
        <p role="status" className="text-sm font-medium text-violet-900">
          Scenario applied and payment status refreshed.
        </p>
      ) : null}
      {isError ? (
        <p role="alert" className="text-sm font-medium text-rose-800">
          Scenario could not be applied.
        </p>
      ) : null}
    </form>
  );
};
