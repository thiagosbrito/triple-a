import { describe, expect, it } from "vitest";

import { PAYMENT_STATUS } from "@/features/checkout/api/contracts/payment-status-values";
import { createPaymentRequestSchema } from "@/features/checkout/api/contracts/payments";
import { createMockPayment } from "@/mocks/quote-factory";

import {
  createPaymentStatusUpdate,
  getHappyPathStatuses,
  MOCK_TRANSACTION_HASH,
  UnavailablePaymentScenarioError,
} from "./payment-simulator";

const now = new Date("2026-08-14T08:44:02.120Z");

function createPayment(currency: string, network: string) {
  return createMockPayment(
    createPaymentRequestSchema.parse({
      order_id: "ORD-88213",
      currency,
      network,
    }),
    now,
  );
}

describe("createPaymentStatusUpdate", () => {
  const multiConfirmationPayment = createPayment("USDT", "ethereum");

  it.each(Object.values(PAYMENT_STATUS))(
    "creates a contract-valid %s state for a compatible quote",
    (status) => {
      const update = createPaymentStatusUpdate(
        multiConfirmationPayment,
        status,
        now,
      );

      expect(update.status).toBe(status);
      expect(update.payment_reference).toBe(
        multiConfirmationPayment.payment_reference,
      );
    },
  );

  it("derives confirmation counts from the issued quote", () => {
    const confirming = createPaymentStatusUpdate(
      multiConfirmationPayment,
      PAYMENT_STATUS.confirming,
      now,
    );
    const paid = createPaymentStatusUpdate(
      multiConfirmationPayment,
      PAYMENT_STATUS.paid,
      now,
    );

    expect(confirming).toMatchObject({
      confirmations: 2,
      required_confirmations: 3,
    });
    expect(paid).toMatchObject({
      confirmations: 3,
      required_confirmations: 3,
    });
  });

  it("rejects confirming for a one-confirmation quote", () => {
    const payment = createPayment("USDT", "tron");

    expect(() =>
      createPaymentStatusUpdate(payment, PAYMENT_STATUS.confirming, now),
    ).toThrow(UnavailablePaymentScenarioError);
  });

  it("preserves the documented USDT/Tron underpayment values", () => {
    const payment = createPayment("USDT", "tron");

    expect(
      createPaymentStatusUpdate(payment, PAYMENT_STATUS.underpaid, now),
    ).toEqual({
      payment_reference: payment.payment_reference,
      status: "underpaid",
      amount_received: "120.00",
      amount_outstanding: "43.69",
      crypto_address: payment.quote.crypto_address,
      tx_hash: MOCK_TRANSACTION_HASH,
    });
  });

  it("preserves the documented USDT/Tron overpayment values", () => {
    const payment = createPayment("USDT", "tron");

    expect(
      createPaymentStatusUpdate(payment, PAYMENT_STATUS.overpaid, now),
    ).toEqual({
      payment_reference: payment.payment_reference,
      status: "overpaid",
      amount_received: "180.00",
      amount_excess: "16.31",
      tx_hash: MOCK_TRANSACTION_HASH,
      settled_at: now.toISOString(),
    });
  });

  it("creates exact generic underpayment and overpayment amounts", () => {
    const payment = createPayment("ETH", "ethereum");
    const underpaid = createPaymentStatusUpdate(
      payment,
      PAYMENT_STATUS.underpaid,
      now,
    );
    const overpaid = createPaymentStatusUpdate(
      payment,
      PAYMENT_STATUS.overpaid,
      now,
    );

    expect(underpaid).toMatchObject({
      amount_received: "3.247029999999999999",
      amount_outstanding: "0.000000000000000001",
    });
    expect(overpaid).toMatchObject({
      amount_received: "3.247030000000000001",
      amount_excess: "0.000000000000000001",
    });
  });
});

describe("getHappyPathStatuses", () => {
  it("includes confirming for multi-confirmation methods", () => {
    expect(getHappyPathStatuses(createPayment("USDC", "polygon"))).toEqual([
      "awaiting_payment",
      "detected",
      "confirming",
      "paid",
    ]);
  });

  it("skips confirming for one-confirmation methods", () => {
    expect(getHappyPathStatuses(createPayment("USDT", "tron"))).toEqual([
      "awaiting_payment",
      "detected",
      "paid",
    ]);
  });
});
