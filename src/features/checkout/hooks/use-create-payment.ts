"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef } from "react";

import { checkoutApi } from "../api/checkout-api";
import {
  checkoutMutationKeys,
  checkoutQueryKeys,
} from "../api/checkout-query-keys";
import type { CreatePaymentResponse } from "../api/contracts/payments";
import { ProtocolError, type ProtocolIssue } from "../api/contracts/problem";
import type { CheckoutSession } from "../config/checkout-session";
import {
  addDecimalAmounts,
  assertAmountScale,
  compareDecimalAmounts,
  MoneyError,
} from "../domain/money";
import type { PaymentMethodSelection } from "../domain/payment-method";

type PaymentIntent = Readonly<{
  id: number;
  selection: PaymentMethodSelection;
  assetDecimals: number;
  signal: AbortSignal;
}>;

function assertPaymentMatchesSession(
  payment: CreatePaymentResponse,
  session: CheckoutSession,
  assetDecimals: number,
): CreatePaymentResponse {
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
    throw new ProtocolError("create_payment", issues);
  }

  return payment;
}

export function useCreatePayment(session: CheckoutSession) {
  const queryClient = useQueryClient();
  const latestIntentId = useRef(0);
  const activeController = useRef<AbortController | null>(null);

  const mutation = useMutation({
    mutationKey: checkoutMutationKeys.createPayment(),
    mutationFn: async ({ selection, assetDecimals, signal }: PaymentIntent) => {
      const payment = await checkoutApi.createPayment(
        {
          order_id: session.orderId,
          currency: selection.currency,
          network: selection.network,
        },
        { signal },
      );

      return assertPaymentMatchesSession(payment, session, assetDecimals);
    },
    onSuccess: (payment, intent) => {
      if (intent.id !== latestIntentId.current) {
        return;
      }

      queryClient.setQueryData(
        checkoutQueryKeys.payment(payment.payment_reference),
        payment,
      );
    },
  });

  const requestQuote = useCallback(
    (selection: PaymentMethodSelection, assetDecimals: number) => {
      activeController.current?.abort();

      const controller = new AbortController();
      const intentId = latestIntentId.current + 1;
      latestIntentId.current = intentId;
      activeController.current = controller;

      mutation.mutate({
        id: intentId,
        selection,
        assetDecimals,
        signal: controller.signal,
      });
    },
    [mutation],
  );

  const reset = useCallback(() => {
    activeController.current?.abort();
    activeController.current = null;
    latestIntentId.current += 1;
    mutation.reset();
  }, [mutation]);

  useEffect(
    () => () => {
      activeController.current?.abort();
    },
    [],
  );

  return {
    data: mutation.data,
    error: mutation.error,
    isError: mutation.isError,
    isPending: mutation.isPending,
    requestQuote,
    reset,
  } as const;
}
