import { describe, expect, it } from "vitest";

import {
  nonNegativeDecimalStringSchema,
  type NonNegativeDecimalString,
} from "../api/contracts/primitives";
import {
  addDecimalAmounts,
  assertAmountScale,
  compareDecimalAmounts,
  formatCalculatedAmount,
  formatTransferAmount,
  MoneyError,
  subtractDecimalAmounts,
} from "./money";

function amount(value: string): NonNegativeDecimalString {
  return nonNegativeDecimalStringSchema.parse(value);
}

describe("money domain", () => {
  it.each([
    ["0.000001", 6],
    ["163.690000", 6],
    ["0.000000000000000001", 18],
  ])("preserves the exact transfer representation %s", (value, decimals) => {
    expect(formatTransferAmount(amount(value), decimals)).toBe(value);
  });

  it("uses server-provided asset precision instead of a currency switch", () => {
    expect(formatTransferAmount(amount("0.00000001"), 8)).toBe("0.00000001");
  });

  it.each([
    ["0.0000001", 6],
    ["1.0000000000000000001", 18],
  ])("rejects %s when it exceeds scale %i", (value, decimals) => {
    expect(() => assertAmountScale(amount(value), decimals)).toThrowError(
      expect.objectContaining<Partial<MoneyError>>({ code: "scale_exceeded" }),
    );
  });

  it.each([-1, 1.5, Number.MAX_SAFE_INTEGER + 1])(
    "rejects invalid decimal scale %s",
    (decimals) => {
      expect(() => assertAmountScale(amount("1"), decimals)).toThrowError(
        expect.objectContaining<Partial<MoneyError>>({ code: "invalid_scale" }),
      );
    },
  );

  it("compares values without losing precision", () => {
    expect(
      compareDecimalAmounts(
        amount("100000000000000000000.000000000000000001"),
        amount("100000000000000000000.000000000000000000"),
      ),
    ).toBe(1);
  });

  it("adds the amount and network fee exactly", () => {
    expect(addDecimalAmounts(amount("162.69"), amount("1.00"))).toBe("163.69");
  });

  it.each([
    ["163.69", "120.00", "43.69"],
    ["180.00", "163.69", "16.31"],
    ["1.000000000000000001", "1", "0.000000000000000001"],
  ])("subtracts %s - %s exactly", (left, right, expected) => {
    expect(subtractDecimalAmounts(amount(left), amount(right))).toBe(expected);
  });

  it("rejects a negative monetary subtraction result", () => {
    expect(() =>
      subtractDecimalAmounts(amount("1.00"), amount("1.01")),
    ).toThrowError(
      expect.objectContaining<Partial<MoneyError>>({ code: "negative_result" }),
    );
  });

  it.each([
    ["163.690000", 6, 0, "163.69"],
    ["149.9", 2, 2, "149.90"],
    ["0.000000000000000001", 18, 0, "0.000000000000000001"],
    ["1000000000000000000000", 18, 0, "1000000000000000000000"],
  ])(
    "formats %s without rounding or exponent notation",
    (value, decimals, minimumFractionDigits, expected) => {
      expect(
        formatCalculatedAmount(amount(value), decimals, minimumFractionDigits),
      ).toBe(expected);
    },
  );

  it("rejects a minimum display scale above the asset scale", () => {
    expect(() => formatCalculatedAmount(amount("1"), 6, 7)).toThrowError(
      expect.objectContaining<Partial<MoneyError>>({ code: "invalid_scale" }),
    );
  });

  it("rejects primitive numbers even if an unsafe caller bypasses TypeScript", () => {
    expect(() =>
      compareDecimalAmounts(
        0.1 as unknown as NonNegativeDecimalString,
        amount("0.1"),
      ),
    ).toThrow();
  });
});
