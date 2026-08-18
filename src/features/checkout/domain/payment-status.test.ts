import { describe, expect, expectTypeOf, it } from "vitest";

import {
  getPaymentStatusPolicy,
  isTerminalPaymentStatus,
  PAYMENT_STATUS,
  PAYMENT_STATUSES,
  PAYMENT_STATUS_POLICIES,
  type PaymentStatus,
  type PaymentStatusPolicy,
} from "./payment-status";

const expectedPolicies = [
  [PAYMENT_STATUS.awaiting_payment, false, "continue", "shopper_can_act"],
  [PAYMENT_STATUS.detected, false, "continue", "wait"],
  [PAYMENT_STATUS.confirming, false, "continue", "wait"],
  [PAYMENT_STATUS.paid, true, "stop", "complete"],
  [PAYMENT_STATUS.underpaid, false, "continue", "shopper_can_act"],
  [PAYMENT_STATUS.overpaid, true, "stop", "support_required"],
  [PAYMENT_STATUS.expired, true, "stop", "shopper_can_act"],
  [PAYMENT_STATUS.failed, true, "stop", "support_required"],
] as const satisfies readonly (readonly [
  PaymentStatus,
  boolean,
  PaymentStatusPolicy["polling"],
  PaymentStatusPolicy["actionClass"],
])[];

describe("payment status policy", () => {
  it.each(expectedPolicies)(
    "classifies %s exhaustively",
    (status, isTerminal, polling, actionClass) => {
      const policy = getPaymentStatusPolicy(status);

      expect(policy).toMatchObject({ isTerminal, polling, actionClass });
      expect(isTerminalPaymentStatus(status)).toBe(isTerminal);
    },
  );

  it("contains exactly one policy for every contract status", () => {
    expect(Object.keys(PAYMENT_STATUS_POLICIES)).toEqual(PAYMENT_STATUSES);
    expectTypeOf(PAYMENT_STATUS_POLICIES).toMatchTypeOf<
      Record<PaymentStatus, PaymentStatusPolicy>
    >();
  });

  it("keeps underpaid recoverable and non-terminal", () => {
    expect(getPaymentStatusPolicy(PAYMENT_STATUS.underpaid)).toEqual({
      actionClass: "shopper_can_act",
      isTerminal: false,
      methodChange: "locked",
      polling: "continue",
      quoteExpiration: "frozen",
    });
  });

  it("allows direct method changes only before funds are detected", () => {
    expect(
      PAYMENT_STATUSES.filter(
        (status) => getPaymentStatusPolicy(status).methodChange === "available",
      ),
    ).toEqual([PAYMENT_STATUS.awaiting_payment]);
  });
});
