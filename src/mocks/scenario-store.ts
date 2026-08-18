import { z } from "zod";

import type { PaymentStatusUpdate } from "@/features/checkout/api/contracts/payment-status";
import {
  paymentStatusSchema,
  PAYMENT_STATUS,
  type PaymentStatus,
} from "@/features/checkout/api/contracts/payment-status-values";
import {
  createPaymentResponseSchema,
  type CreatePaymentResponse,
} from "@/features/checkout/api/contracts/payments";
import { paymentReferenceSchema } from "@/features/checkout/api/contracts/primitives";
import {
  createPaymentStatusUpdate,
  getHappyPathStatuses,
} from "@/mocks/payment-simulator";

export const PAYMENT_SCENARIO_MODES = ["exact_state", "progression"] as const;
export const TRANSPORT_FAILURE_MODES = [
  "none",
  "next_request",
  "persistent",
] as const;
export const TRANSPORT_FAILURE_KINDS = [
  "http_500",
  "network_disconnect",
] as const;
export const MAX_SCENARIO_DELAY_MILLISECONDS = 30_000;

export const paymentScenarioSchema = z.discriminatedUnion("mode", [
  z.strictObject({
    mode: z.literal(PAYMENT_SCENARIO_MODES[0]),
    status: paymentStatusSchema,
  }),
  z.strictObject({ mode: z.literal(PAYMENT_SCENARIO_MODES[1]) }),
]);

export const transportFailureSchema = z.discriminatedUnion("mode", [
  z.strictObject({ mode: z.literal(TRANSPORT_FAILURE_MODES[0]) }),
  z.strictObject({
    mode: z.literal(TRANSPORT_FAILURE_MODES[1]),
    kind: z.enum(TRANSPORT_FAILURE_KINDS),
  }),
  z.strictObject({
    mode: z.literal(TRANSPORT_FAILURE_MODES[2]),
    kind: z.enum(TRANSPORT_FAILURE_KINDS),
  }),
]);

export const paymentScenarioConfigurationSchema = z.strictObject({
  scenario: paymentScenarioSchema,
  response_delay_ms: z.int().min(0).max(MAX_SCENARIO_DELAY_MILLISECONDS),
  failure: transportFailureSchema,
});

export const paymentScenarioControlRequestSchema = z.strictObject({
  payment_reference: paymentReferenceSchema,
  configuration: paymentScenarioConfigurationSchema,
});

export const paymentScenarioControlResponseSchema =
  paymentScenarioControlRequestSchema;

export type PaymentScenario = z.infer<typeof paymentScenarioSchema>;
export type TransportFailure = z.infer<typeof transportFailureSchema>;
export type PaymentScenarioConfiguration = z.infer<
  typeof paymentScenarioConfigurationSchema
>;
export type PaymentScenarioControlRequest = z.infer<
  typeof paymentScenarioControlRequestSchema
>;
export type PaymentScenarioControlResponse = z.infer<
  typeof paymentScenarioControlResponseSchema
>;

export const DEFAULT_PAYMENT_SCENARIO_CONFIGURATION =
  paymentScenarioConfigurationSchema.parse({
    scenario: {
      mode: PAYMENT_SCENARIO_MODES[0],
      status: PAYMENT_STATUS.awaiting_payment,
    },
    response_delay_ms: 0,
    failure: { mode: TRANSPORT_FAILURE_MODES[0] },
  });

export type PaymentSimulationInstruction =
  | Readonly<{
      outcome: "response";
      responseDelayMilliseconds: number;
      update: PaymentStatusUpdate;
    }>
  | Readonly<{
      outcome: "failure";
      responseDelayMilliseconds: number;
      failureKind: (typeof TRANSPORT_FAILURE_KINDS)[number];
    }>;

type StoredPaymentScenario = {
  payment: CreatePaymentResponse;
  configuration: PaymentScenarioConfiguration;
  progressionIndex: number;
  currentUpdate: PaymentStatusUpdate;
};

export class PaymentScenarioNotFoundError extends Error {
  constructor(readonly paymentReference: string) {
    super(`No mock payment is registered for ${paymentReference}`);
    this.name = "PaymentScenarioNotFoundError";
  }
}

function copyConfiguration(
  configuration: PaymentScenarioConfiguration,
): PaymentScenarioConfiguration {
  return paymentScenarioConfigurationSchema.parse(configuration);
}

function statusAt(
  statuses: readonly PaymentStatus[],
  index: number,
): PaymentStatus {
  const status = statuses[index];

  if (!status) {
    throw new Error(`Missing mock progression status at index ${index}`);
  }

  return status;
}

export class PaymentScenarioStore {
  readonly #payments = new Map<string, StoredPaymentScenario>();

  registerPayment(payment: CreatePaymentResponse, now = new Date()): void {
    const validatedPayment = createPaymentResponseSchema.parse(payment);
    const configuration = copyConfiguration(
      DEFAULT_PAYMENT_SCENARIO_CONFIGURATION,
    );

    this.#payments.set(validatedPayment.payment_reference, {
      payment: validatedPayment,
      configuration,
      progressionIndex: 0,
      currentUpdate: createPaymentStatusUpdate(
        validatedPayment,
        PAYMENT_STATUS.awaiting_payment,
        now,
      ),
    });
  }

  has(paymentReference: string): boolean {
    return this.#payments.has(paymentReference);
  }

  getPayment(paymentReference: string): CreatePaymentResponse {
    return createPaymentResponseSchema.parse(
      this.#getStored(paymentReference).payment,
    );
  }

  getConfiguration(paymentReference: string): PaymentScenarioConfiguration {
    return copyConfiguration(this.#getStored(paymentReference).configuration);
  }

  configure(
    paymentReference: string,
    input: unknown,
    now = new Date(),
  ): PaymentScenarioConfiguration {
    const stored = this.#getStored(paymentReference);
    const configuration = paymentScenarioConfigurationSchema.parse(input);
    const firstStatus =
      configuration.scenario.mode === PAYMENT_SCENARIO_MODES[0]
        ? configuration.scenario.status
        : statusAt(getHappyPathStatuses(stored.payment), 0);
    const currentUpdate = createPaymentStatusUpdate(
      stored.payment,
      firstStatus,
      now,
    );

    stored.configuration = configuration;
    stored.progressionIndex = 0;
    stored.currentUpdate = currentUpdate;

    return copyConfiguration(configuration);
  }

  simulate(
    paymentReference: string,
    now = new Date(),
  ): PaymentSimulationInstruction {
    const stored = this.#getStored(paymentReference);
    const { failure, response_delay_ms: responseDelayMilliseconds } =
      stored.configuration;

    if (failure.mode !== TRANSPORT_FAILURE_MODES[0]) {
      if (failure.mode === TRANSPORT_FAILURE_MODES[1]) {
        stored.configuration = {
          ...stored.configuration,
          failure: { mode: TRANSPORT_FAILURE_MODES[0] },
        };
      }

      return {
        outcome: "failure",
        responseDelayMilliseconds,
        failureKind: failure.kind,
      };
    }

    const update = stored.currentUpdate;

    if (stored.configuration.scenario.mode === PAYMENT_SCENARIO_MODES[1]) {
      const statuses = getHappyPathStatuses(stored.payment);

      if (stored.progressionIndex < statuses.length - 1) {
        stored.progressionIndex += 1;
        stored.currentUpdate = createPaymentStatusUpdate(
          stored.payment,
          statusAt(statuses, stored.progressionIndex),
          now,
        );
      }
    }

    return { outcome: "response", responseDelayMilliseconds, update };
  }

  clear(): void {
    this.#payments.clear();
  }

  #getStored(paymentReference: string): StoredPaymentScenario {
    const stored = this.#payments.get(paymentReference);

    if (!stored) {
      throw new PaymentScenarioNotFoundError(paymentReference);
    }

    return stored;
  }
}

type ScenarioStoreGlobal = typeof globalThis & {
  __tripleAStablecoinPaymentScenarioStore?: PaymentScenarioStore;
};

const scenarioStoreGlobal = globalThis as ScenarioStoreGlobal;

export const paymentScenarioStore =
  (scenarioStoreGlobal.__tripleAStablecoinPaymentScenarioStore ??=
    new PaymentScenarioStore());
