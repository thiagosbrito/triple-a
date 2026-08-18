import { describe, expect, it } from "vitest";

import { createPaymentStatusUpdate } from "@/mocks/payment-simulator";
import { createMockPayment } from "@/mocks/quote-factory";
import { createPaymentRequestSchema } from "../api/contracts/payments";
import { PAYMENT_STATUS } from "../api/contracts/payment-status-values";
import {
  getPaymentPollInterval,
  PAYMENT_POLL_INTERVAL_MILLISECONDS,
} from "./payment-polling";

const payment = createMockPayment(
  createPaymentRequestSchema.parse({
    order_id: "ORD-88213",
    currency: "USDC",
    network: "polygon",
  }),
  new Date("2026-08-18T12:00:00.000Z"),
);

describe("getPaymentPollInterval", () => {
  it.each([
    [undefined, PAYMENT_POLL_INTERVAL_MILLISECONDS.awaitingPayment],
    [
      PAYMENT_STATUS.awaiting_payment,
      PAYMENT_POLL_INTERVAL_MILLISECONDS.awaitingPayment,
    ],
    [PAYMENT_STATUS.detected, PAYMENT_POLL_INTERVAL_MILLISECONDS.detected],
    [PAYMENT_STATUS.confirming, PAYMENT_POLL_INTERVAL_MILLISECONDS.confirming],
    [PAYMENT_STATUS.underpaid, PAYMENT_POLL_INTERVAL_MILLISECONDS.underpaid],
    [PAYMENT_STATUS.paid, false],
    [PAYMENT_STATUS.overpaid, false],
    [PAYMENT_STATUS.expired, false],
    [PAYMENT_STATUS.failed, false],
  ] as const)("maps %s to %s", (status, expected) => {
    const update = status
      ? createPaymentStatusUpdate(payment, status, new Date())
      : undefined;

    expect(getPaymentPollInterval(update)).toBe(expected);
  });
});
