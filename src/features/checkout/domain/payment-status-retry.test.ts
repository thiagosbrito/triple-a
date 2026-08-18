import { describe, expect, it } from "vitest";

import {
  ApiProblemError,
  ProtocolError,
  internalServerErrorProblemSchema,
  quoteNotExpiredProblemSchema,
} from "../api/contracts/problem";
import {
  getPaymentStatusRetryDelay,
  isRetryablePaymentStatusError,
  PAYMENT_STATUS_RETRY_DELAYS_MILLISECONDS,
  shouldRetryPaymentStatus,
} from "./payment-status-retry";

describe("payment status retry policy", () => {
  it("retries transport and validated server failures only", () => {
    const serverError = new ApiProblemError(
      internalServerErrorProblemSchema.parse({
        type: "about:blank",
        title: "Internal Server Error",
        status: 500,
        detail: "Temporary mock failure.",
      }),
    );
    const conflict = new ApiProblemError(
      quoteNotExpiredProblemSchema.parse({
        type: "https://developers.triple-a.io/errors/quote-not-expired",
        title: "Quote has not expired",
        status: 409,
        detail: "The quote remains active.",
      }),
    );

    expect(isRetryablePaymentStatusError(new TypeError("offline"))).toBe(true);
    expect(isRetryablePaymentStatusError(serverError)).toBe(true);
    expect(isRetryablePaymentStatusError(conflict)).toBe(false);
    expect(
      isRetryablePaymentStatusError(
        new ProtocolError("get_payment", [
          { message: "Unknown status", path: ["status"] },
        ]),
      ),
    ).toBe(false);
    expect(isRetryablePaymentStatusError(new Error("unexpected"))).toBe(false);
  });

  it("allows exactly three immediate retries", () => {
    const error = new TypeError("offline");

    expect(shouldRetryPaymentStatus(0, error)).toBe(true);
    expect(shouldRetryPaymentStatus(1, error)).toBe(true);
    expect(shouldRetryPaymentStatus(2, error)).toBe(true);
    expect(shouldRetryPaymentStatus(3, error)).toBe(false);
  });

  it("uses the named one, two, and four second delays", () => {
    expect(PAYMENT_STATUS_RETRY_DELAYS_MILLISECONDS).toEqual([
      1_000, 2_000, 4_000,
    ]);
    expect(getPaymentStatusRetryDelay(0)).toBe(1_000);
    expect(getPaymentStatusRetryDelay(1)).toBe(2_000);
    expect(getPaymentStatusRetryDelay(2)).toBe(4_000);
    expect(getPaymentStatusRetryDelay(10)).toBe(4_000);
  });
});
