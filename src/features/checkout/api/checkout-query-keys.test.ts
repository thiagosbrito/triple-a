import { describe, expect, it } from "vitest";

import { paymentReferenceSchema } from "./contracts/primitives";
import { checkoutQueryKeys } from "./checkout-query-keys";

describe("checkout query keys", () => {
  it("keeps catalog and payment caches under one feature namespace", () => {
    const reference = paymentReferenceSchema.parse("AQH-100306-PMT");

    expect(checkoutQueryKeys.all).toEqual(["checkout"]);
    expect(checkoutQueryKeys.currencies()).toEqual(["checkout", "currencies"]);
    expect(checkoutQueryKeys.payments()).toEqual(["checkout", "payments"]);
    expect(checkoutQueryKeys.payment(reference)).toEqual([
      "checkout",
      "payments",
      "AQH-100306-PMT",
    ]);
  });

  it("gives different payment references different cache identities", () => {
    const first = paymentReferenceSchema.parse("AQH-100306-PMT");
    const second = paymentReferenceSchema.parse("AQH-100307-PMT");

    expect(checkoutQueryKeys.payment(first)).not.toEqual(
      checkoutQueryKeys.payment(second),
    );
  });
});
