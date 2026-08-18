import { describe, expect, it } from "vitest";

import { createPaymentStatusUpdate } from "@/mocks/payment-simulator";
import { createMockPayment } from "@/mocks/quote-factory";
import { createPaymentRequestSchema } from "./contracts/payments";
import { paymentStatusUpdateSchema } from "./contracts/payment-status";
import { PAYMENT_STATUS } from "./contracts/payment-status-values";
import { ProtocolError } from "./contracts/problem";
import { assertPaymentStatusMatchesQuote } from "./validate-payment-status";

const payment = createMockPayment(
  createPaymentRequestSchema.parse({
    order_id: "ORD-88213",
    currency: "USDC",
    network: "polygon",
  }),
  new Date("2026-08-18T12:00:00.000Z"),
);

describe("assertPaymentStatusMatchesQuote", () => {
  it.each(Object.values(PAYMENT_STATUS))(
    "accepts a coherent %s update",
    (status) => {
      const update = createPaymentStatusUpdate(payment, status, new Date());
      expect(assertPaymentStatusMatchesQuote(update, payment, 6)).toBe(update);
    },
  );

  it("rejects status money beyond the catalog precision", () => {
    const update = paymentStatusUpdateSchema.parse({
      ...createPaymentStatusUpdate(payment, PAYMENT_STATUS.underpaid),
      amount_outstanding: "0.0000001",
    });

    expect(() =>
      assertPaymentStatusMatchesQuote(update, payment, 6),
    ).toThrowError(ProtocolError);
  });

  it("rejects an underpayment destination that differs from the issued quote", () => {
    const update = paymentStatusUpdateSchema.parse({
      ...createPaymentStatusUpdate(payment, PAYMENT_STATUS.underpaid),
      crypto_address: "different-destination",
    });

    expect(() =>
      assertPaymentStatusMatchesQuote(update, payment, 6),
    ).toThrowError(ProtocolError);
  });

  it("rejects confirmation requirements that differ from the issued quote", () => {
    const update = paymentStatusUpdateSchema.parse({
      ...createPaymentStatusUpdate(payment, PAYMENT_STATUS.detected),
      required_confirmations: 12,
    });

    expect(() =>
      assertPaymentStatusMatchesQuote(update, payment, 6),
    ).toThrowError(ProtocolError);
  });
});
