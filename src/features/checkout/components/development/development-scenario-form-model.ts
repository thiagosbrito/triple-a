import {
  paymentScenarioConfigurationSchema,
  TRANSPORT_FAILURE_KINDS,
  type PaymentScenarioConfiguration,
} from "../../api/contracts/development";
import type { PaymentStatus } from "../../api/contracts/payment-status-values";

export type ScenarioMode = PaymentScenarioConfiguration["scenario"]["mode"];
export type FailureMode = PaymentScenarioConfiguration["failure"]["mode"];
export type FailureKind = (typeof TRANSPORT_FAILURE_KINDS)[number];

export type DevelopmentScenarioFormState = Readonly<{
  scenarioMode: ScenarioMode;
  status: PaymentStatus;
  responseDelayMilliseconds: number;
  failureMode: FailureMode;
  failureKind: FailureKind;
}>;

export const DEVELOPMENT_FORM_INPUT_CLASS_NAME =
  "mt-1 min-h-11 w-full rounded-lg border border-violet-300 bg-white px-3 py-2 text-sm text-slate-950 outline-offset-2 focus-visible:outline-2 focus-visible:outline-violet-700 disabled:bg-slate-100";

export const configurationFromScenarioForm = ({
  scenarioMode,
  status,
  responseDelayMilliseconds,
  failureMode,
  failureKind,
}: DevelopmentScenarioFormState): PaymentScenarioConfiguration =>
  paymentScenarioConfigurationSchema.parse({
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
