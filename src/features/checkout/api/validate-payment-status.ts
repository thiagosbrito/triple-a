import type { PaymentStatusUpdate } from "./contracts/payment-status";
import { PAYMENT_STATUS } from "./contracts/payment-status-values";
import type { CreatePaymentResponse } from "./contracts/payments";
import type {
  NonNegativeDecimalString,
  PositiveDecimalString,
} from "./contracts/primitives";
import { ProtocolError, type ProtocolIssue } from "./contracts/problem";
import { assertAmountScale, MoneyError } from "../domain/money";

type DecimalString = NonNegativeDecimalString | PositiveDecimalString;

export function assertPaymentStatusMatchesQuote(
  update: PaymentStatusUpdate,
  payment: CreatePaymentResponse,
  assetDecimals: number,
): PaymentStatusUpdate {
  const issues: ProtocolIssue[] = [];

  function validateAmount(field: string, value: DecimalString): void {
    try {
      assertAmountScale(value, assetDecimals);
    } catch (error) {
      if (!(error instanceof MoneyError)) {
        throw error;
      }

      issues.push({
        message: `Payment ${field} exceeds the issued asset precision`,
        path: [field],
      });
    }
  }

  switch (update.status) {
    case PAYMENT_STATUS.awaiting_payment:
    case PAYMENT_STATUS.expired:
    case PAYMENT_STATUS.failed:
      break;
    case PAYMENT_STATUS.detected:
    case PAYMENT_STATUS.confirming:
    case PAYMENT_STATUS.paid:
      validateAmount("amount_received", update.amount_received);
      if (
        update.required_confirmations !== payment.quote.required_confirmations
      ) {
        issues.push({
          message:
            "Payment confirmation target does not match the issued quote",
          path: ["required_confirmations"],
        });
      }
      break;
    case PAYMENT_STATUS.underpaid:
      validateAmount("amount_received", update.amount_received);
      validateAmount("amount_outstanding", update.amount_outstanding);
      if (update.crypto_address !== payment.quote.crypto_address) {
        issues.push({
          message:
            "Outstanding payment address does not match the issued quote",
          path: ["crypto_address"],
        });
      }
      break;
    case PAYMENT_STATUS.overpaid:
      validateAmount("amount_received", update.amount_received);
      validateAmount("amount_excess", update.amount_excess);
      break;
  }

  if (issues.length > 0) {
    throw new ProtocolError("get_payment", issues);
  }

  return update;
}
