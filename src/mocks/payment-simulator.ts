import {
  paymentStatusUpdateSchema,
  type PaymentStatusUpdate,
} from "@/features/checkout/api/contracts/payment-status";
import {
  PAYMENT_STATUS,
  type PaymentStatus,
} from "@/features/checkout/api/contracts/payment-status-values";
import type { CreatePaymentResponse } from "@/features/checkout/api/contracts/payments";
import {
  positiveDecimalStringSchema,
  type PositiveDecimalString,
} from "@/features/checkout/api/contracts/primitives";
import {
  addDecimalAmounts,
  subtractDecimalAmounts,
} from "@/features/checkout/domain/money";
import { CURRENCIES_FIXTURE } from "@/mocks/fixtures/currencies";

export const MOCK_TRANSACTION_HASH = "9d1f4c8a2be7...";

const DOCUMENTED_USDT_TRON_TOTAL = "163.69";
const DOCUMENTED_UNDERPAID_RECEIVED =
  positiveDecimalStringSchema.parse("120.00");
const DOCUMENTED_UNDERPAID_OUTSTANDING =
  positiveDecimalStringSchema.parse("43.69");
const DOCUMENTED_OVERPAID_RECEIVED =
  positiveDecimalStringSchema.parse("180.00");
const DOCUMENTED_OVERPAID_EXCESS = positiveDecimalStringSchema.parse("16.31");

export class UnavailablePaymentScenarioError extends Error {
  constructor(
    readonly status: PaymentStatus,
    message: string,
  ) {
    super(message);
    this.name = "UnavailablePaymentScenarioError";
  }
}

const assertNever = (value: never): never => {
  throw new Error(`Unhandled payment status: ${String(value)}`);
};

const isDocumentedUsdtTronPayment = (
  payment: CreatePaymentResponse,
): boolean => {
  return (
    payment.quote.crypto_currency === "USDT" &&
    payment.quote.network === "tron" &&
    payment.quote.total_due === DOCUMENTED_USDT_TRON_TOTAL
  );
};

const smallestAssetUnit = (
  payment: CreatePaymentResponse,
  status: typeof PAYMENT_STATUS.underpaid | typeof PAYMENT_STATUS.overpaid,
): PositiveDecimalString => {
  const currency = CURRENCIES_FIXTURE.currencies.find(
    (candidate) => candidate.code === payment.quote.crypto_currency,
  );

  if (!currency || currency.decimals < 1) {
    throw new UnavailablePaymentScenarioError(
      status,
      `No decimal metadata is available for ${payment.quote.crypto_currency}`,
    );
  }

  return positiveDecimalStringSchema.parse(
    `0.${"0".repeat(currency.decimals - 1)}1`,
  );
};

const createUnderpaidAmounts = (
  payment: CreatePaymentResponse,
): {
  amountReceived: PositiveDecimalString;
  amountOutstanding: PositiveDecimalString;
} => {
  if (isDocumentedUsdtTronPayment(payment)) {
    return {
      amountReceived: DOCUMENTED_UNDERPAID_RECEIVED,
      amountOutstanding: DOCUMENTED_UNDERPAID_OUTSTANDING,
    };
  }

  const amountOutstanding = smallestAssetUnit(
    payment,
    PAYMENT_STATUS.underpaid,
  );
  const amountReceived = positiveDecimalStringSchema.safeParse(
    subtractDecimalAmounts(payment.quote.total_due, amountOutstanding),
  );

  if (!amountReceived.success) {
    throw new UnavailablePaymentScenarioError(
      PAYMENT_STATUS.underpaid,
      "The quote total is too small to create a positive underpayment fixture",
    );
  }

  return { amountReceived: amountReceived.data, amountOutstanding };
};

const createOverpaidAmounts = (
  payment: CreatePaymentResponse,
): {
  amountReceived: PositiveDecimalString;
  amountExcess: PositiveDecimalString;
} => {
  if (isDocumentedUsdtTronPayment(payment)) {
    return {
      amountReceived: DOCUMENTED_OVERPAID_RECEIVED,
      amountExcess: DOCUMENTED_OVERPAID_EXCESS,
    };
  }

  const amountExcess = smallestAssetUnit(payment, PAYMENT_STATUS.overpaid);
  const amountReceived = positiveDecimalStringSchema.parse(
    addDecimalAmounts(payment.quote.total_due, amountExcess),
  );

  return { amountReceived, amountExcess };
};

/**
 * The happy path is derived from the issued quote. A one-confirmation method
 * cannot have a positive intermediate confirmation count, so it moves from
 * detected directly to paid instead of emitting an inconsistent status.
 */
export const getHappyPathStatuses = (
  payment: CreatePaymentResponse,
): readonly PaymentStatus[] => {
  const statuses: PaymentStatus[] = [
    PAYMENT_STATUS.awaiting_payment,
    PAYMENT_STATUS.detected,
  ];

  if (payment.quote.required_confirmations > 1) {
    statuses.push(PAYMENT_STATUS.confirming);
  }

  statuses.push(PAYMENT_STATUS.paid);
  return statuses;
};

export const createPaymentStatusUpdate = (
  payment: CreatePaymentResponse,
  status: PaymentStatus,
  now = new Date(),
): PaymentStatusUpdate => {
  const base = { payment_reference: payment.payment_reference };
  const transaction = {
    amount_received: payment.quote.total_due,
    tx_hash: MOCK_TRANSACTION_HASH,
  };
  const timestamp = now.toISOString();
  let update: unknown;

  switch (status) {
    case PAYMENT_STATUS.awaiting_payment:
      update = { ...base, status };
      break;
    case PAYMENT_STATUS.detected:
      update = {
        ...base,
        status,
        confirmations: 0,
        required_confirmations: payment.quote.required_confirmations,
        ...transaction,
        detected_at: timestamp,
      };
      break;
    case PAYMENT_STATUS.confirming:
      if (payment.quote.required_confirmations <= 1) {
        throw new UnavailablePaymentScenarioError(
          status,
          "A one-confirmation quote has no valid confirming state",
        );
      }

      update = {
        ...base,
        status,
        confirmations: payment.quote.required_confirmations - 1,
        required_confirmations: payment.quote.required_confirmations,
        ...transaction,
      };
      break;
    case PAYMENT_STATUS.paid:
      update = {
        ...base,
        status,
        confirmations: payment.quote.required_confirmations,
        required_confirmations: payment.quote.required_confirmations,
        ...transaction,
        settled_at: timestamp,
      };
      break;
    case PAYMENT_STATUS.underpaid: {
      const amounts = createUnderpaidAmounts(payment);
      update = {
        ...base,
        status,
        amount_received: amounts.amountReceived,
        amount_outstanding: amounts.amountOutstanding,
        crypto_address: payment.quote.crypto_address,
        tx_hash: MOCK_TRANSACTION_HASH,
      };
      break;
    }
    case PAYMENT_STATUS.overpaid: {
      const amounts = createOverpaidAmounts(payment);
      update = {
        ...base,
        status,
        amount_received: amounts.amountReceived,
        amount_excess: amounts.amountExcess,
        tx_hash: MOCK_TRANSACTION_HASH,
        settled_at: timestamp,
      };
      break;
    }
    case PAYMENT_STATUS.expired:
      update = { ...base, status, expired_at: timestamp };
      break;
    case PAYMENT_STATUS.failed:
      update = { ...base, status, reason: "settlement_rejected" };
      break;
    default:
      return assertNever(status);
  }

  return paymentStatusUpdateSchema.parse(update);
};
