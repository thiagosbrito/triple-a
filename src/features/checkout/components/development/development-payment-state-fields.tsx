import {
  PAYMENT_STATUSES,
  type PaymentStatus,
} from "../../api/contracts/payment-status-values";
import {
  DEVELOPMENT_FORM_INPUT_CLASS_NAME,
  type ScenarioMode,
} from "./development-scenario-form-model";

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

type DevelopmentPaymentStateFieldsProps = Readonly<{
  scenarioMode: ScenarioMode;
  status: PaymentStatus;
  onScenarioModeChange: (scenarioMode: ScenarioMode) => void;
  onStatusChange: (status: PaymentStatus) => void;
}>;

export const DevelopmentPaymentStateFields = ({
  scenarioMode,
  status,
  onScenarioModeChange,
  onStatusChange,
}: DevelopmentPaymentStateFieldsProps) => (
  <details open className="rounded-xl border border-violet-200 bg-white p-3">
    <summary className="cursor-pointer text-sm font-semibold text-slate-900 outline-offset-4 focus-visible:outline-2 focus-visible:outline-violet-800">
      Payment state
    </summary>
    <div className="mt-3 grid gap-3">
      <label className="text-sm font-semibold text-slate-800">
        Scenario
        <select
          className={DEVELOPMENT_FORM_INPUT_CLASS_NAME}
          value={scenarioMode}
          onChange={(event) =>
            onScenarioModeChange(event.target.value as ScenarioMode)
          }
        >
          <option value="exact_state">Exact state</option>
          <option value="progression">Happy-path progression</option>
        </select>
      </label>

      <label className="text-sm font-semibold text-slate-800">
        Payment state
        <select
          className={DEVELOPMENT_FORM_INPUT_CLASS_NAME}
          disabled={scenarioMode === "progression"}
          value={status}
          onChange={(event) =>
            onStatusChange(event.target.value as PaymentStatus)
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
);
