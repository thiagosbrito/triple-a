import type { CheckoutSession } from "../config/checkout-session";
import {
  addDecimalAmounts,
  assertAmountScale,
  compareDecimalAmounts,
  MoneyError,
} from "../domain/money";
import type { CreatePaymentResponse } from "./contracts/payments";
import {
  ProtocolError,
  type ApiOperation,
  type ProtocolIssue,
} from "./contracts/problem";

export const assertPaymentMatchesCheckout = (
  payment: CreatePaymentResponse,
  session: CheckoutSession,
  assetDecimals: number,
  operation: Extract<ApiOperation, "create_payment" | "requote_payment">,
): CreatePaymentResponse => {
  const issues: ProtocolIssue[] = [];

  if (payment.order_id !== session.orderId) {
    issues.push({
      message: "Payment order does not match the checkout session",
      path: ["order_id"],
    });
  }

  if (payment.merchant.name !== session.merchant.name) {
    issues.push({
      message: "Payment merchant does not match the checkout session",
      path: ["merchant", "name"],
    });
  }

  if (payment.merchant.logo_url !== session.merchant.logo_url) {
    issues.push({
      message: "Payment merchant logo does not match the checkout session",
      path: ["merchant", "logo_url"],
    });
  }

  if (
    payment.order.currency !== session.order.currency ||
    payment.order.amount !== session.order.amount
  ) {
    issues.push({
      message: "Payment total does not match the checkout session",
      path: ["order"],
    });
  }

  const transferAmounts = [
    ["crypto_amount", payment.quote.crypto_amount],
    ["network_fee", payment.quote.network_fee],
    ["total_due", payment.quote.total_due],
  ] as const;

  for (const [field, amount] of transferAmounts) {
    try {
      assertAmountScale(amount, assetDecimals);
    } catch (error) {
      if (!(error instanceof MoneyError)) {
        throw error;
      }

      issues.push({
        message: `Quote ${field} exceeds the selected asset precision`,
        path: ["quote", field],
      });
    }
  }

  if (
    compareDecimalAmounts(
      addDecimalAmounts(payment.quote.crypto_amount, payment.quote.network_fee),
      payment.quote.total_due,
    ) !== 0
  ) {
    issues.push({
      message: "Quote total due does not equal payment amount plus network fee",
      path: ["quote", "total_due"],
    });
  }

  if (issues.length > 0) {
    throw new ProtocolError(operation, issues);
  }

  return payment;
};
