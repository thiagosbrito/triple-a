import { describe, expect, it } from "vitest";

import { paymentStatusUpdateSchema } from "./payment-status";
import { paymentStatusSchema } from "./payment-status-values";

const paymentReference = "AQH-100306-PMT";
const transactionHash = "9d1f4c8a2be7...";

const documentedStatusUpdates = [
  {
    payment_reference: paymentReference,
    status: "awaiting_payment",
  },
  {
    payment_reference: paymentReference,
    status: "detected",
    confirmations: 0,
    required_confirmations: 1,
    amount_received: "163.69",
    tx_hash: transactionHash,
    detected_at: "2026-08-14T08:44:02.120Z",
  },
  {
    payment_reference: paymentReference,
    status: "confirming",
    confirmations: 2,
    required_confirmations: 3,
    amount_received: "163.69",
    tx_hash: transactionHash,
  },
  {
    payment_reference: paymentReference,
    status: "paid",
    confirmations: 3,
    required_confirmations: 3,
    amount_received: "163.69",
    tx_hash: transactionHash,
    settled_at: "2026-08-14T08:47:31.004Z",
  },
  {
    payment_reference: paymentReference,
    status: "underpaid",
    amount_received: "120.00",
    amount_outstanding: "43.69",
    crypto_address: "TQ5Nn8kLpVv3xJ7wYcR2bF9aH4dM6sGz1e",
    tx_hash: transactionHash,
  },
  {
    payment_reference: paymentReference,
    status: "overpaid",
    amount_received: "180.00",
    amount_excess: "16.31",
    tx_hash: transactionHash,
    settled_at: "2026-08-14T08:47:31.004Z",
  },
  {
    payment_reference: paymentReference,
    status: "expired",
    expired_at: "2026-08-14T08:52:10.842Z",
  },
  {
    payment_reference: paymentReference,
    status: "failed",
    reason: "settlement_rejected",
  },
] as const;

describe("paymentStatusUpdateSchema", () => {
  it.each(documentedStatusUpdates)(
    "validates the documented $status update",
    (update) => {
      expect(paymentStatusUpdateSchema.parse(update)).toEqual(update);
    },
  );

  it.each([
    [
      "detected without detection time",
      {
        payment_reference: paymentReference,
        status: "detected",
        confirmations: 0,
        required_confirmations: 1,
        amount_received: "163.69",
        tx_hash: transactionHash,
      },
    ],
    [
      "confirming without confirmation counts",
      {
        payment_reference: paymentReference,
        status: "confirming",
        amount_received: "163.69",
        tx_hash: transactionHash,
      },
    ],
    [
      "paid without settlement time",
      {
        payment_reference: paymentReference,
        status: "paid",
        confirmations: 3,
        required_confirmations: 3,
        amount_received: "163.69",
        tx_hash: transactionHash,
      },
    ],
    [
      "underpaid without outstanding amount",
      {
        payment_reference: paymentReference,
        status: "underpaid",
        amount_received: "120.00",
        crypto_address: "TQ5Nn8kLpVv3xJ7wYcR2bF9aH4dM6sGz1e",
        tx_hash: transactionHash,
      },
    ],
    [
      "overpaid without excess amount",
      {
        payment_reference: paymentReference,
        status: "overpaid",
        amount_received: "180.00",
        tx_hash: transactionHash,
        settled_at: "2026-08-14T08:47:31.004Z",
      },
    ],
    [
      "expired without expiry time",
      { payment_reference: paymentReference, status: "expired" },
    ],
    [
      "failed without a reason",
      { payment_reference: paymentReference, status: "failed" },
    ],
    [
      "failed with an undocumented reason",
      {
        payment_reference: paymentReference,
        status: "failed",
        reason: "network_error",
      },
    ],
  ])("rejects %s", (_caseName, malformedUpdate) => {
    expect(paymentStatusUpdateSchema.safeParse(malformedUpdate).success).toBe(
      false,
    );
  });

  it("rejects an unknown status", () => {
    expect(
      paymentStatusUpdateSchema.safeParse({
        payment_reference: paymentReference,
        status: "refunded",
      }).success,
    ).toBe(false);
  });

  it("rejects non-zero confirmations for detected", () => {
    expect(
      paymentStatusUpdateSchema.safeParse({
        ...documentedStatusUpdates[1],
        confirmations: 1,
      }).success,
    ).toBe(false);
  });

  it("rejects confirming when the confirmation target has been reached", () => {
    expect(
      paymentStatusUpdateSchema.safeParse({
        ...documentedStatusUpdates[2],
        confirmations: 3,
      }).success,
    ).toBe(false);
  });

  it("rejects paid before the confirmation target has been reached", () => {
    expect(
      paymentStatusUpdateSchema.safeParse({
        ...documentedStatusUpdates[3],
        confirmations: 2,
      }).success,
    ).toBe(false);
  });

  it("rejects numeric monetary fields", () => {
    expect(
      paymentStatusUpdateSchema.safeParse({
        ...documentedStatusUpdates[4],
        amount_outstanding: 43.69,
      }).success,
    ).toBe(false);
  });

  it("rejects fields belonging to a different status variant", () => {
    expect(
      paymentStatusUpdateSchema.safeParse({
        ...documentedStatusUpdates[0],
        settled_at: "2026-08-14T08:47:31.004Z",
      }).success,
    ).toBe(false);
  });
});

describe("paymentStatusSchema", () => {
  it("throws when an unsupported status is provided", () => {
    expect(() => paymentStatusSchema.parse("refunded")).toThrow();
  });
});
