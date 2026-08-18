import {
  PAYMENT_SCENARIO_MODES,
  TRANSPORT_FAILURE_KINDS,
  TRANSPORT_FAILURE_MODES,
  paymentScenarioConfigurationSchema,
  type PaymentScenarioConfiguration,
} from "@/features/checkout/api/contracts/development";
import {
  paymentStatusUpdateSchema,
  type PaymentStatusUpdate,
} from "@/features/checkout/api/contracts/payment-status";
import {
  PAYMENT_STATUS,
  type PaymentStatus,
} from "@/features/checkout/api/contracts/payment-status-values";
import {
  createPaymentResponseSchema,
  type CreatePaymentResponse,
} from "@/features/checkout/api/contracts/payments";
import {
  createPaymentStatusUpdate,
  getHappyPathStatuses,
} from "@/mocks/payment-simulator";

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

export class PaymentConfirmationUnavailableError extends Error {
  constructor(readonly paymentReference: string) {
    super(`Payment ${paymentReference} is not waiting for a confirmation`);
    this.name = "PaymentConfirmationUnavailableError";
  }
}

const copyConfiguration = (
  configuration: PaymentScenarioConfiguration,
): PaymentScenarioConfiguration => {
  return paymentScenarioConfigurationSchema.parse(configuration);
};

const statusAt = (
  statuses: readonly PaymentStatus[],
  index: number,
): PaymentStatus => {
  const status = statuses[index];

  if (!status) {
    throw new Error(`Missing mock progression status at index ${index}`);
  }

  return status;
};

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

  setQuoteExpiry(
    paymentReference: string,
    expiresInSeconds: number,
    now = new Date(),
  ): CreatePaymentResponse {
    const stored = this.#getStored(paymentReference);
    const expiresAt = new Date(
      now.getTime() + expiresInSeconds * 1_000,
    ).toISOString();

    stored.payment = createPaymentResponseSchema.parse({
      ...stored.payment,
      quote: { ...stored.payment.quote, expires_at: expiresAt },
    });

    return this.getPayment(paymentReference);
  }

  peekStatus(paymentReference: string): PaymentStatusUpdate {
    return paymentStatusUpdateSchema.parse(
      this.#getStored(paymentReference).currentUpdate,
    );
  }

  advanceConfirmation(
    paymentReference: string,
    now = new Date(),
  ): PaymentStatusUpdate {
    const stored = this.#getStored(paymentReference);
    const currentUpdate = stored.currentUpdate;

    if (
      currentUpdate.status !== PAYMENT_STATUS.detected &&
      currentUpdate.status !== PAYMENT_STATUS.confirming
    ) {
      throw new PaymentConfirmationUnavailableError(paymentReference);
    }

    if (currentUpdate.status === PAYMENT_STATUS.detected) {
      stored.currentUpdate = createPaymentStatusUpdate(
        stored.payment,
        currentUpdate.required_confirmations === 1
          ? PAYMENT_STATUS.paid
          : PAYMENT_STATUS.confirming,
        now,
      );
    } else {
      const nextConfirmation = currentUpdate.confirmations + 1;

      stored.currentUpdate =
        nextConfirmation >= currentUpdate.required_confirmations
          ? createPaymentStatusUpdate(stored.payment, PAYMENT_STATUS.paid, now)
          : paymentStatusUpdateSchema.parse({
              ...currentUpdate,
              confirmations: nextConfirmation,
            });
    }

    if (
      stored.currentUpdate.status === PAYMENT_STATUS.confirming ||
      stored.currentUpdate.status === PAYMENT_STATUS.paid
    ) {
      stored.configuration = {
        ...stored.configuration,
        scenario: {
          mode: PAYMENT_SCENARIO_MODES[0],
          status: stored.currentUpdate.status,
        },
      };
    }

    return this.peekStatus(paymentReference);
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
  __tripleAStablecoinPaymentScenarioStoreVersion?: number;
};

// Next.js preserves `globalThis` across development hot reloads. Version the
// singleton's runtime shape so a refreshed module never reuses an instance
// created before a newly added store method existed.
const PAYMENT_SCENARIO_STORE_VERSION = 3;
const scenarioStoreGlobal = globalThis as ScenarioStoreGlobal;

if (
  !scenarioStoreGlobal.__tripleAStablecoinPaymentScenarioStore ||
  scenarioStoreGlobal.__tripleAStablecoinPaymentScenarioStoreVersion !==
    PAYMENT_SCENARIO_STORE_VERSION
) {
  scenarioStoreGlobal.__tripleAStablecoinPaymentScenarioStore =
    new PaymentScenarioStore();
  scenarioStoreGlobal.__tripleAStablecoinPaymentScenarioStoreVersion =
    PAYMENT_SCENARIO_STORE_VERSION;
}

export const paymentScenarioStore =
  scenarioStoreGlobal.__tripleAStablecoinPaymentScenarioStore;
