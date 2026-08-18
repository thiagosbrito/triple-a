import { MAX_SCENARIO_DELAY_MILLISECONDS } from "../../api/contracts/development";
import {
  DEVELOPMENT_FORM_INPUT_CLASS_NAME,
  type FailureKind,
  type FailureMode,
} from "./development-scenario-form-model";

type DevelopmentNetworkConditionFieldsProps = Readonly<{
  responseDelayMilliseconds: number;
  failureMode: FailureMode;
  failureKind: FailureKind;
  onResponseDelayChange: (delayMilliseconds: number) => void;
  onFailureModeChange: (failureMode: FailureMode) => void;
  onFailureKindChange: (failureKind: FailureKind) => void;
}>;

export const DevelopmentNetworkConditionFields = ({
  responseDelayMilliseconds,
  failureMode,
  failureKind,
  onResponseDelayChange,
  onFailureModeChange,
  onFailureKindChange,
}: DevelopmentNetworkConditionFieldsProps) => (
  <details className="rounded-xl border border-violet-200 bg-white p-3">
    <summary className="cursor-pointer text-sm font-semibold text-slate-900 outline-offset-4 focus-visible:outline-2 focus-visible:outline-violet-800">
      Network conditions
    </summary>
    <div className="mt-3 grid gap-3">
      <label className="text-sm font-semibold text-slate-800">
        Response delay (ms)
        <input
          className={DEVELOPMENT_FORM_INPUT_CLASS_NAME}
          max={MAX_SCENARIO_DELAY_MILLISECONDS}
          min={0}
          step={100}
          type="number"
          value={responseDelayMilliseconds}
          onChange={(event) =>
            onResponseDelayChange(event.currentTarget.valueAsNumber)
          }
        />
      </label>

      <label className="text-sm font-semibold text-slate-800">
        Transport failure
        <select
          className={DEVELOPMENT_FORM_INPUT_CLASS_NAME}
          value={failureMode}
          onChange={(event) =>
            onFailureModeChange(event.target.value as FailureMode)
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
          className={DEVELOPMENT_FORM_INPUT_CLASS_NAME}
          disabled={failureMode === "none"}
          value={failureKind}
          onChange={(event) =>
            onFailureKindChange(event.target.value as FailureKind)
          }
        >
          <option value="http_500">HTTP 500</option>
          <option value="network_disconnect">Network disconnect</option>
        </select>
      </label>
    </div>
  </details>
);
