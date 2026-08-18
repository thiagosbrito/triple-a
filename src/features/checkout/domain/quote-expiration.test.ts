import { describe, expect, it } from "vitest";

import { isoTimestampSchema } from "../api/contracts/primitives";
import {
  formatRemainingMilliseconds,
  getQuoteDeadlineState,
  getRemainingMilliseconds,
} from "./quote-expiration";

const expiresAt = isoTimestampSchema.parse("2026-08-14T08:52:10.842Z");
const expiryEpochMilliseconds = Date.parse(expiresAt);

describe("quote expiration", () => {
  it.each([
    [expiryEpochMilliseconds - 10_000, 10_000],
    [expiryEpochMilliseconds - 1, 1],
    [expiryEpochMilliseconds, 0],
    [expiryEpochMilliseconds + 60_000, 0],
  ])(
    "derives remaining time from the absolute deadline",
    (nowEpochMilliseconds, expected) => {
      expect(getRemainingMilliseconds(expiresAt, nowEpochMilliseconds)).toBe(
        expected,
      );
    },
  );

  it("reflects a background-time jump without relying on timer ticks", () => {
    expect(
      getRemainingMilliseconds(expiresAt, expiryEpochMilliseconds - 60_000),
    ).toBe(60_000);
    expect(
      getRemainingMilliseconds(expiresAt, expiryEpochMilliseconds + 60_000),
    ).toBe(0);
  });

  it.each([
    [0, "00:00"],
    [1, "00:01"],
    [59_001, "01:00"],
    [65_000, "01:05"],
    [3_600_000, "01:00:00"],
  ])(
    "formats %i milliseconds without showing zero early",
    (value, expected) => {
      expect(formatRemainingMilliseconds(value)).toBe(expected);
    },
  );

  it.each([-1, Number.NaN, Number.POSITIVE_INFINITY])(
    "rejects invalid remaining time %s",
    (value) => {
      expect(() => formatRemainingMilliseconds(value)).toThrow(RangeError);
    },
  );

  it("requests exactly one reconciliation before local expiry", () => {
    expect(
      getQuoteDeadlineState(
        "awaiting_payment",
        expiresAt,
        expiryEpochMilliseconds,
        false,
      ),
    ).toBe("reconcile");
    expect(
      getQuoteDeadlineState(
        "awaiting_payment",
        expiresAt,
        expiryEpochMilliseconds,
        true,
      ),
    ).toBe("expired");
  });

  it.each(["detected", "confirming", "underpaid"] as const)(
    "freezes quote expiration for %s",
    (status) => {
      expect(
        getQuoteDeadlineState(
          status,
          expiresAt,
          expiryEpochMilliseconds + 60_000,
          false,
        ),
      ).toBe("frozen");
    },
  );

  it("respects an authoritative expired status", () => {
    expect(
      getQuoteDeadlineState(
        "expired",
        expiresAt,
        expiryEpochMilliseconds - 60_000,
        false,
      ),
    ).toBe("expired");
  });

  it.each(["paid", "overpaid", "failed"] as const)(
    "makes quote expiry irrelevant for %s",
    (status) => {
      expect(
        getQuoteDeadlineState(
          status,
          expiresAt,
          expiryEpochMilliseconds + 60_000,
          false,
        ),
      ).toBe("irrelevant");
    },
  );

  it("rejects a non-finite current time", () => {
    expect(() => getRemainingMilliseconds(expiresAt, Number.NaN)).toThrow(
      RangeError,
    );
  });
});
