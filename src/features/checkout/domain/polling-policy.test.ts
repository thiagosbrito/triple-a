import { describe, expect, it } from "vitest";

import { PAYMENT_STATUSES } from "./payment-status";
import {
  getPollingIntervalMilliseconds,
  getTransportRetryPolicy,
  POLLING_INTERVAL_MILLISECONDS,
} from "./polling-policy";

describe("polling policy", () => {
  it.each([
    ["awaiting_payment", POLLING_INTERVAL_MILLISECONDS.awaitingPayment],
    ["detected", POLLING_INTERVAL_MILLISECONDS.detected],
    ["confirming", POLLING_INTERVAL_MILLISECONDS.confirming],
    ["underpaid", POLLING_INTERVAL_MILLISECONDS.underpaid],
  ] as const)("continues polling %s at %i ms", (status, expected) => {
    expect(getPollingIntervalMilliseconds(status)).toBe(expected);
  });

  it.each(["paid", "overpaid", "expired", "failed"] as const)(
    "stops polling for terminal status %s",
    (status) => {
      expect(getPollingIntervalMilliseconds(status)).toBe(false);
    },
  );

  it("defines a policy for every payment status", () => {
    expect(PAYMENT_STATUSES.map(getPollingIntervalMilliseconds)).toHaveLength(
      PAYMENT_STATUSES.length,
    );
  });

  it.each([
    [1, { retry: true, delayMilliseconds: 1_000 }],
    [2, { retry: true, delayMilliseconds: 2_000 }],
    [3, { retry: true, delayMilliseconds: 4_000 }],
    [4, { retry: false, delayMilliseconds: null }],
    [100, { retry: false, delayMilliseconds: null }],
  ])(
    "returns bounded retry policy after %i consecutive failures",
    (consecutiveFailures, expected) => {
      expect(getTransportRetryPolicy(consecutiveFailures)).toEqual(expected);
    },
  );

  it.each([0, -1, 1.5, Number.POSITIVE_INFINITY])(
    "rejects invalid failure count %s",
    (consecutiveFailures) => {
      expect(() => getTransportRetryPolicy(consecutiveFailures)).toThrow(
        RangeError,
      );
    },
  );
});
