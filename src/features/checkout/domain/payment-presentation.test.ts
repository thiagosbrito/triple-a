import { describe, expect, expectTypeOf, it } from "vitest";

import {
  getPaymentPresentation,
  PAYMENT_PRESENTATIONS,
  PAYMENT_SAFETY_GUIDANCE,
  type PaymentPresentation,
} from "./payment-presentation";
import {
  PAYMENT_STATUS,
  PAYMENT_STATUSES,
  type PaymentStatus,
} from "./payment-status";

describe("payment presentation", () => {
  it("provides inline guidance for the irreversible transfer steps", () => {
    expect(PAYMENT_SAFETY_GUIDANCE.map(({ id }) => id)).toEqual([
      "match_method",
      "verify_instruction",
      "send_once",
      "wait_after_detection",
    ]);
    expect(PAYMENT_SAFETY_GUIDANCE[0].instruction).toMatch(
      /asset and network/i,
    );
    expect(PAYMENT_SAFETY_GUIDANCE[1].instruction).toMatch(/amount.*address/i);
    expect(PAYMENT_SAFETY_GUIDANCE[3].instruction).toMatch(
      /do not send again/i,
    );
  });

  it("defines a non-empty presentation for every status", () => {
    expect(Object.keys(PAYMENT_PRESENTATIONS)).toEqual(PAYMENT_STATUSES);
    expectTypeOf(PAYMENT_PRESENTATIONS).toMatchTypeOf<
      Record<PaymentStatus, PaymentPresentation>
    >();

    PAYMENT_STATUSES.forEach((status) => {
      const presentation = getPaymentPresentation(status);

      expect(presentation.heading).not.toHaveLength(0);
      expect(presentation.summary).not.toHaveLength(0);
      expect(presentation.safetyInstruction).not.toHaveLength(0);
    });
  });

  it("tells the shopper not to resend after detection", () => {
    expect(
      getPaymentPresentation(PAYMENT_STATUS.detected).safetyInstruction,
    ).toMatch(/do not send another payment/i);
    expect(
      getPaymentPresentation(PAYMENT_STATUS.confirming).safetyInstruction,
    ).toMatch(/do not send another payment/i);
  });

  it("instructs an underpaid shopper to send only the outstanding amount", () => {
    const presentation = getPaymentPresentation(PAYMENT_STATUS.underpaid);

    expect(presentation.category).toBe("action_required");
    expect(presentation.safetyInstruction).toMatch(
      /only the outstanding amount/i,
    );
  });

  it("does not promise an overpayment refund", () => {
    const presentation = getPaymentPresentation(PAYMENT_STATUS.overpaid);
    const shopperCopy = [
      presentation.heading,
      presentation.summary,
      presentation.safetyInstruction,
    ].join(" ");

    expect(presentation.primaryAction).toBe("contact_support");
    expect(shopperCopy).not.toMatch(
      /automatic refund|will refund|refund within/i,
    );
  });

  it("does not tell a shopper to repeat a failed payment", () => {
    const presentation = getPaymentPresentation(PAYMENT_STATUS.failed);

    expect(presentation.primaryAction).toBe("contact_support");
    expect(presentation.safetyInstruction).toMatch(
      /do not send another payment/i,
    );
  });

  it("deactivates expired instructions and offers requote", () => {
    const presentation = getPaymentPresentation(PAYMENT_STATUS.expired);

    expect(presentation.primaryAction).toBe("request_new_quote");
    expect(presentation.safetyInstruction).toMatch(/do not use/i);
  });
});
