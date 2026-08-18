import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  MAX_SCENARIO_DELAY_MILLISECONDS,
  paymentScenarioConfigurationSchema,
} from "@/features/checkout/api/contracts/development";
import { PAYMENT_STATUS } from "@/features/checkout/api/contracts/payment-status-values";
import { createPaymentRequestSchema } from "@/features/checkout/api/contracts/payments";
import { createMockPayment } from "@/mocks/quote-factory";

import {
  PaymentScenarioNotFoundError,
  PaymentScenarioStore,
} from "./scenario-store";

const initialTime = new Date("2026-08-14T08:44:02.120Z");
const laterTime = new Date("2026-08-14T08:47:31.004Z");

const createPayment = (currency = "USDT", network = "ethereum") => {
  return createMockPayment(
    createPaymentRequestSchema.parse({
      order_id: "ORD-88213",
      currency,
      network,
    }),
    initialTime,
  );
};

const exactState = (status: string, responseDelayMilliseconds = 0) => {
  return {
    scenario: { mode: "exact_state", status },
    response_delay_ms: responseDelayMilliseconds,
    failure: { mode: "none" },
  };
};

const progression = (
  failure:
    | { mode: "none" }
    | {
        mode: "next_request" | "persistent";
        kind: "http_500" | "network_disconnect";
      } = { mode: "none" },
) => {
  return {
    scenario: { mode: "progression" },
    response_delay_ms: 0,
    failure,
  };
};

describe("PaymentScenarioStore", () => {
  let store: PaymentScenarioStore;

  beforeEach(() => {
    store = new PaymentScenarioStore();
  });

  it("registers a payment pinned to awaiting payment by default", () => {
    const payment = createPayment();
    store.registerPayment(payment, initialTime);

    expect(store.getConfiguration(payment.payment_reference)).toEqual({
      scenario: { mode: "exact_state", status: "awaiting_payment" },
      response_delay_ms: 0,
      failure: { mode: "none" },
    });
    expect(store.simulate(payment.payment_reference, laterTime)).toEqual({
      outcome: "response",
      responseDelayMilliseconds: 0,
      update: {
        payment_reference: payment.payment_reference,
        status: "awaiting_payment",
      },
    });
  });

  it.each(Object.values(PAYMENT_STATUS))(
    "pins a multi-confirmation payment to %s",
    (status) => {
      const payment = createPayment();
      store.registerPayment(payment, initialTime);
      store.configure(
        payment.payment_reference,
        exactState(status),
        initialTime,
      );

      const first = store.simulate(payment.payment_reference, laterTime);
      const second = store.simulate(payment.payment_reference, laterTime);

      expect(first.outcome).toBe("response");
      expect(first).toEqual(second);
      if (first.outcome === "response") {
        expect(first.update.status).toBe(status);
      }
    },
  );

  it("advances deterministically and remains on the terminal happy-path state", () => {
    const payment = createPayment();
    store.registerPayment(payment, initialTime);
    store.configure(payment.payment_reference, progression(), initialTime);

    const statuses = [
      store.simulate(payment.payment_reference, initialTime),
      store.simulate(payment.payment_reference, laterTime),
      store.simulate(payment.payment_reference, laterTime),
      store.simulate(payment.payment_reference, laterTime),
      store.simulate(payment.payment_reference, laterTime),
    ].map((instruction) =>
      instruction.outcome === "response"
        ? instruction.update.status
        : instruction.outcome,
    );

    expect(statuses).toEqual([
      "awaiting_payment",
      "detected",
      "confirming",
      "paid",
      "paid",
    ]);
  });

  it("skips confirming in one-confirmation progression", () => {
    const payment = createPayment("USDT", "tron");
    store.registerPayment(payment, initialTime);
    store.configure(payment.payment_reference, progression(), initialTime);

    const statuses = [
      store.simulate(payment.payment_reference, initialTime),
      store.simulate(payment.payment_reference, laterTime),
      store.simulate(payment.payment_reference, laterTime),
    ].map((instruction) =>
      instruction.outcome === "response"
        ? instruction.update.status
        : instruction.outcome,
    );

    expect(statuses).toEqual(["awaiting_payment", "detected", "paid"]);
  });

  it("fails only the next request without advancing progression", () => {
    const payment = createPayment();
    store.registerPayment(payment, initialTime);
    store.configure(
      payment.payment_reference,
      progression({ mode: "next_request", kind: "http_500" }),
      initialTime,
    );

    expect(store.simulate(payment.payment_reference, initialTime)).toEqual({
      outcome: "failure",
      responseDelayMilliseconds: 0,
      failureKind: "http_500",
    });
    expect(
      store.simulate(payment.payment_reference, initialTime),
    ).toMatchObject({
      outcome: "response",
      update: { status: "awaiting_payment" },
    });
    expect(store.simulate(payment.payment_reference, laterTime)).toMatchObject({
      outcome: "response",
      update: { status: "detected" },
    });
  });

  it("keeps persistent failures active without advancing progression", () => {
    const payment = createPayment();
    store.registerPayment(payment, initialTime);
    store.configure(
      payment.payment_reference,
      progression({ mode: "persistent", kind: "network_disconnect" }),
      initialTime,
    );

    expect(store.simulate(payment.payment_reference, initialTime)).toEqual(
      store.simulate(payment.payment_reference, laterTime),
    );
    expect(store.getConfiguration(payment.payment_reference).failure).toEqual({
      mode: "persistent",
      kind: "network_disconnect",
    });
  });

  it("returns response delay as an orthogonal instruction", () => {
    const payment = createPayment();
    store.registerPayment(payment, initialTime);
    store.configure(
      payment.payment_reference,
      exactState(PAYMENT_STATUS.detected, 5_000),
      initialTime,
    );

    expect(store.simulate(payment.payment_reference, laterTime)).toMatchObject({
      outcome: "response",
      responseDelayMilliseconds: 5_000,
      update: { status: "detected" },
    });
  });

  it("re-registering the same assessment reference resets its scenario", () => {
    const payment = createPayment();
    store.registerPayment(payment, initialTime);
    store.configure(
      payment.payment_reference,
      exactState(PAYMENT_STATUS.paid),
      initialTime,
    );

    store.registerPayment(payment, laterTime);

    expect(store.simulate(payment.payment_reference, laterTime)).toMatchObject({
      outcome: "response",
      update: { status: "awaiting_payment" },
    });
  });

  it("returns defensive copies of payment and configuration data", () => {
    const payment = createPayment();
    store.registerPayment(payment, initialTime);

    const storedPayment = store.getPayment(payment.payment_reference);
    const configuration = store.getConfiguration(payment.payment_reference);
    const status = store.peekStatus(payment.payment_reference);
    storedPayment.order.amount = "999.00" as typeof storedPayment.order.amount;
    configuration.response_delay_ms = 20_000;
    status.status = "paid";

    expect(store.getPayment(payment.payment_reference).order.amount).toBe(
      "149.90",
    );
    expect(
      store.getConfiguration(payment.payment_reference).response_delay_ms,
    ).toBe(0);
    expect(store.peekStatus(payment.payment_reference).status).toBe(
      "awaiting_payment",
    );
  });

  it("moves only the current quote deadline for evaluator control", () => {
    const payment = createPayment();
    store.registerPayment(payment, initialTime);

    const updated = store.setQuoteExpiry(
      payment.payment_reference,
      12,
      initialTime,
    );

    expect(updated.payment_reference).toBe(payment.payment_reference);
    expect(updated.quote.expires_at).toBe("2026-08-14T08:44:14.120Z");
    expect(updated.quote.crypto_address).toBe(payment.quote.crypto_address);
    expect(store.peekStatus(payment.payment_reference).status).toBe(
      "awaiting_payment",
    );
  });

  it("throws a typed error for an unknown reference", () => {
    expect(() => store.simulate("UNKNOWN", initialTime)).toThrow(
      PaymentScenarioNotFoundError,
    );
  });
});

describe("paymentScenarioConfigurationSchema", () => {
  it.each([
    ["an unknown status", exactState("refunded")],
    ["a negative delay", exactState("paid", -1)],
    [
      "an excessive delay",
      exactState("paid", MAX_SCENARIO_DELAY_MILLISECONDS + 1),
    ],
    ["an unknown field", { ...exactState("paid"), progression_speed: "fast" }],
  ])("rejects %s", (_caseName, input) => {
    expect(paymentScenarioConfigurationSchema.safeParse(input).success).toBe(
      false,
    );
  });
});

describe("paymentScenarioStore development singleton", () => {
  it("replaces an obsolete version after a module reload", async () => {
    const obsoleteStore = {};
    Reflect.set(
      globalThis,
      "__tripleAStablecoinPaymentScenarioStore",
      obsoleteStore,
    );
    Reflect.set(
      globalThis,
      "__tripleAStablecoinPaymentScenarioStoreVersion",
      2,
    );
    vi.resetModules();

    const reloadedModule = await import("./scenario-store");

    expect(reloadedModule.paymentScenarioStore).not.toBe(obsoleteStore);
    expect(reloadedModule.paymentScenarioStore.setQuoteExpiry).toBeTypeOf(
      "function",
    );
  });
});
