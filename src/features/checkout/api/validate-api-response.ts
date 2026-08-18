import type { PaymentStatusUpdate } from "./contracts/payment-status";
import type {
  CreatePaymentRequest,
  CreatePaymentResponse,
  RequotePaymentRequest,
  RequotePaymentResponse,
} from "./contracts/payments";
import { ProtocolError } from "./contracts/problem";
import type { PaymentReference } from "./contracts/primitives";

export const assertCreatedPaymentMatchesRequest = (
  response: CreatePaymentResponse,
  request: CreatePaymentRequest,
): CreatePaymentResponse => {
  const issues = [];

  if (response.order_id !== request.order_id) {
    issues.push({
      message: "Payment order does not match the requested order",
      path: ["order_id"],
    });
  }

  if (response.quote.crypto_currency !== request.currency) {
    issues.push({
      message: "Quote currency does not match the requested currency",
      path: ["quote", "crypto_currency"],
    });
  }

  if (response.quote.network !== request.network) {
    issues.push({
      message: "Quote network does not match the requested network",
      path: ["quote", "network"],
    });
  }

  if (issues.length > 0) {
    throw new ProtocolError("create_payment", issues);
  }

  return response;
};

export const assertPaymentStatusMatchesReference = (
  response: PaymentStatusUpdate,
  reference: PaymentReference,
): PaymentStatusUpdate => {
  if (response.payment_reference !== reference) {
    throw new ProtocolError("get_payment", [
      {
        message: "Payment status does not match the requested reference",
        path: ["payment_reference"],
      },
    ]);
  }

  return response;
};

export const assertRequotedPaymentMatchesRequest = (
  response: RequotePaymentResponse,
  reference: PaymentReference,
  request: RequotePaymentRequest,
): RequotePaymentResponse => {
  const issues = [];

  if (response.payment_reference !== reference) {
    issues.push({
      message: "Requote does not match the requested payment reference",
      path: ["payment_reference"],
    });
  }

  if (response.quote.crypto_currency !== request.currency) {
    issues.push({
      message: "Requote currency does not match the requested currency",
      path: ["quote", "crypto_currency"],
    });
  }

  if (response.quote.network !== request.network) {
    issues.push({
      message: "Requote network does not match the requested network",
      path: ["quote", "network"],
    });
  }

  if (issues.length > 0) {
    throw new ProtocolError("requote_payment", issues);
  }

  return response;
};
