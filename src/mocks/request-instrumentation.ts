import {
  requestMetricsSchema,
  type RequestMetrics,
} from "@/features/checkout/api/contracts/development";

type MutableRequestMetrics = {
  current_in_flight: number;
  maximum_in_flight: number;
  total_started: number;
  total_completed: number;
};

const emptyMetrics = (): MutableRequestMetrics => {
  return {
    current_in_flight: 0,
    maximum_in_flight: 0,
    total_started: 0,
    total_completed: 0,
  };
};

export class RequestInstrumentation {
  readonly #metrics = new Map<string, MutableRequestMetrics>();

  begin(paymentReference: string): () => void {
    const metrics = this.#metrics.get(paymentReference) ?? emptyMetrics();
    this.#metrics.set(paymentReference, metrics);
    metrics.current_in_flight += 1;
    metrics.total_started += 1;
    metrics.maximum_in_flight = Math.max(
      metrics.maximum_in_flight,
      metrics.current_in_flight,
    );
    let completed = false;

    return () => {
      if (completed) {
        return;
      }

      completed = true;
      metrics.current_in_flight -= 1;
      metrics.total_completed += 1;
    };
  }

  snapshot(paymentReference: string): RequestMetrics {
    return requestMetricsSchema.parse(
      this.#metrics.get(paymentReference) ?? emptyMetrics(),
    );
  }

  reset(paymentReference?: string): void {
    if (paymentReference === undefined) {
      this.#metrics.clear();
      return;
    }

    this.#metrics.delete(paymentReference);
  }
}

type RequestInstrumentationGlobal = typeof globalThis & {
  __tripleAStablecoinRequestInstrumentation?: RequestInstrumentation;
};

const instrumentationGlobal = globalThis as RequestInstrumentationGlobal;

export const requestInstrumentation =
  (instrumentationGlobal.__tripleAStablecoinRequestInstrumentation ??=
    new RequestInstrumentation());
