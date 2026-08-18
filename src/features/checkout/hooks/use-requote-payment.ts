"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { checkoutApi } from "../api/checkout-api";
import {
  checkoutMutationKeys,
  checkoutQueryKeys,
} from "../api/checkout-query-keys";
import type { PaymentStatusUpdate } from "../api/contracts/payment-status";
import { PAYMENT_STATUS } from "../api/contracts/payment-status-values";
import type { CreatePaymentResponse } from "../api/contracts/payments";
import { ApiProblemError } from "../api/contracts/problem";
import { assertPaymentMatchesCheckout } from "../api/validate-payment";
import { assertPaymentStatusMatchesQuote } from "../api/validate-payment-status";
import type { CheckoutSession } from "../config/checkout-session";

export type ConflictStatusRefresh =
  "idle" | "refreshing" | "succeeded" | "failed";

export function useRequotePayment(
  payment: CreatePaymentResponse,
  session: CheckoutSession,
  assetDecimals: number,
) {
  const queryClient = useQueryClient();
  const [conflictStatusRefresh, setConflictStatusRefresh] =
    useState<ConflictStatusRefresh>("idle");
  const reference = payment.payment_reference;
  const statusKey = checkoutQueryKeys.paymentStatus(reference);

  const mutation = useMutation({
    mutationKey: checkoutMutationKeys.requotePayment(reference),
    mutationFn: async () => {
      const requotedPayment = await checkoutApi.requotePayment(reference, {
        currency: payment.quote.crypto_currency,
        network: payment.quote.network,
      });

      return assertPaymentMatchesCheckout(
        requotedPayment,
        session,
        assetDecimals,
        "requote_payment",
      );
    },
    onMutate: () => {
      setConflictStatusRefresh("idle");
    },
    onSuccess: (requotedPayment) => {
      queryClient.setQueryData<PaymentStatusUpdate>(statusKey, {
        payment_reference: reference,
        status: PAYMENT_STATUS.awaiting_payment,
      });
      queryClient.setQueryData(
        checkoutQueryKeys.payment(reference),
        requotedPayment,
      );
    },
    onError: async (error) => {
      if (!(error instanceof ApiProblemError) || error.problem.status !== 409) {
        return;
      }

      setConflictStatusRefresh("refreshing");

      try {
        const statusResponse = await checkoutApi.getPayment(reference);
        const currentStatus = assertPaymentStatusMatchesQuote(
          statusResponse,
          payment,
          assetDecimals,
        );
        queryClient.setQueryData<PaymentStatusUpdate>(statusKey, currentStatus);
        setConflictStatusRefresh("succeeded");
      } catch {
        setConflictStatusRefresh("failed");
      }
    },
  });

  return {
    ...mutation,
    conflictStatusRefresh,
    isConflict:
      mutation.error instanceof ApiProblemError &&
      mutation.error.problem.status === 409,
  } as const;
}
