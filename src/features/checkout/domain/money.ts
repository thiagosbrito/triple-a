import Big from "big.js";

import {
  nonNegativeDecimalStringSchema,
  type NonNegativeDecimalString,
  type PositiveDecimalString,
} from "../api/contracts/primitives";

type DecimalString = NonNegativeDecimalString | PositiveDecimalString;

const StrictBig = Big();
StrictBig.strict = true;
const ZERO = new StrictBig("0");

export const MONEY_ERROR_CODES = [
  "invalid_scale",
  "scale_exceeded",
  "negative_result",
] as const;

export type MoneyErrorCode = (typeof MONEY_ERROR_CODES)[number];

export class MoneyError extends Error {
  readonly code: MoneyErrorCode;

  constructor(code: MoneyErrorCode, message: string) {
    super(message);
    this.name = "MoneyError";
    this.code = code;
  }
}

function assertValidScale(scale: number): void {
  if (!Number.isSafeInteger(scale) || scale < 0) {
    throw new MoneyError(
      "invalid_scale",
      "Decimal scale must be a non-negative safe integer",
    );
  }
}

function fractionDigits(value: DecimalString): number {
  return value.split(".")[1]?.length ?? 0;
}

function parseDecimal(value: DecimalString): Big {
  return new StrictBig(value);
}

function serializeDecimal(value: Big): NonNegativeDecimalString {
  return nonNegativeDecimalStringSchema.parse(value.toFixed());
}

export function assertAmountScale(
  value: DecimalString,
  maximumFractionDigits: number,
): void {
  assertValidScale(maximumFractionDigits);

  const actualFractionDigits = fractionDigits(value);

  if (actualFractionDigits > maximumFractionDigits) {
    throw new MoneyError(
      "scale_exceeded",
      `Amount has ${actualFractionDigits} fraction digits; maximum is ${maximumFractionDigits}`,
    );
  }
}

export function compareDecimalAmounts(
  left: DecimalString,
  right: DecimalString,
): Big.Comparison {
  return parseDecimal(left).cmp(parseDecimal(right));
}

export function addDecimalAmounts(
  left: DecimalString,
  right: DecimalString,
): NonNegativeDecimalString {
  return serializeDecimal(parseDecimal(left).plus(parseDecimal(right)));
}

export function subtractDecimalAmounts(
  minuend: DecimalString,
  subtrahend: DecimalString,
): NonNegativeDecimalString {
  const result = parseDecimal(minuend).minus(parseDecimal(subtrahend));

  if (result.lt(ZERO)) {
    throw new MoneyError(
      "negative_result",
      "A non-negative monetary subtraction cannot produce a negative result",
    );
  }

  return serializeDecimal(result);
}

/**
 * Transfer instructions preserve the server's exact validated representation,
 * including deliberate trailing zeroes. The currency catalog controls the
 * maximum accepted scale.
 */
export function formatTransferAmount(
  value: DecimalString,
  assetDecimals: number,
): string {
  assertAmountScale(value, assetDecimals);
  return value;
}

/**
 * Formats the assessment's EUR order total without converting the decimal
 * string to a binary floating-point number. Intl supplies locale-specific
 * grouping, separators, and currency placement from an exact BigInt integer;
 * the validated two-digit fraction is then preserved as text.
 */
export function formatEuroOrderAmount(
  value: DecimalString,
  locale?: Intl.LocalesArgument,
): string {
  const euroFractionDigits = 2;
  assertAmountScale(value, euroFractionDigits);

  const decimalSeparatorIndex = value.indexOf(".");
  const integerPart =
    decimalSeparatorIndex === -1
      ? value
      : value.slice(0, decimalSeparatorIndex);
  const fractionPart =
    decimalSeparatorIndex === -1 ? "" : value.slice(decimalSeparatorIndex + 1);
  const exactFraction = fractionPart.padEnd(euroFractionDigits, "0");
  const formatter = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: euroFractionDigits,
    maximumFractionDigits: euroFractionDigits,
  });

  return formatter
    .formatToParts(BigInt(integerPart))
    .map((part) => (part.type === "fraction" ? exactFraction : part.value))
    .join("");
}

/**
 * Formats a calculated value without exponent notation or rounding. Insignificant
 * trailing zeroes are removed unless a minimum display scale is requested.
 */
export function formatCalculatedAmount(
  value: DecimalString,
  assetDecimals: number,
  minimumFractionDigits = 0,
): string {
  assertAmountScale(value, assetDecimals);
  assertValidScale(minimumFractionDigits);

  if (minimumFractionDigits > assetDecimals) {
    throw new MoneyError(
      "invalid_scale",
      "Minimum fraction digits cannot exceed the asset decimal scale",
    );
  }

  const decimal = parseDecimal(value);
  const normalized = serializeDecimal(decimal);
  const outputFractionDigits = Math.max(
    minimumFractionDigits,
    fractionDigits(normalized),
  );

  return decimal.toFixed(outputFractionDigits);
}
