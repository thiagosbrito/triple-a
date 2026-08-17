import { describe, expectTypeOf, it } from "vitest";

import type { CurrencyCode, NetworkId } from "./payment-method";
import type {
  PaymentFailureReason,
  PaymentStatus,
} from "./payment-status-values";
import type {
  CryptoAddress,
  NonNegativeDecimalString,
  OrderId,
  PaymentReference,
  TransactionHash,
} from "./primitives";

describe("contract type conventions", () => {
  it("derives closed vocabularies from their readonly tuples", () => {
    expectTypeOf<PaymentStatus>().toEqualTypeOf<
      | "awaiting_payment"
      | "detected"
      | "confirming"
      | "paid"
      | "underpaid"
      | "overpaid"
      | "expired"
      | "failed"
    >();
    expectTypeOf<PaymentFailureReason>().toEqualTypeOf<"settlement_rejected">();
  });

  it("keeps structurally identical safety identifiers distinct", () => {
    expectTypeOf<CurrencyCode>().not.toEqualTypeOf<string>();
    expectTypeOf<NetworkId>().not.toEqualTypeOf<string>();
    expectTypeOf<CurrencyCode>().not.toEqualTypeOf<NetworkId>();
    expectTypeOf<OrderId>().not.toEqualTypeOf<PaymentReference>();
    expectTypeOf<CryptoAddress>().not.toEqualTypeOf<TransactionHash>();
    expectTypeOf<NonNegativeDecimalString>().not.toEqualTypeOf<string>();
  });
});
