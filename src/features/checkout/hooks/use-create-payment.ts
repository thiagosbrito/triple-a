"use client";

import {
  skipToken,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";

import { checkoutApi } from "../api/checkout-api";
import {
  checkoutMutationKeys,
  checkoutQueryKeys,
} from "../api/checkout-query-keys";
import type { CreatePaymentResponse } from "../api/contracts/payments";
import type { PaymentReference } from "../api/contracts/primitives";
import { assertPaymentMatchesCheckout } from "../api/validate-payment";
import type { CheckoutSession } from "../config/checkout-session";
import type { PaymentMethodSelection } from "../domain/payment-method";

type PaymentIntent = Readonly<{
  id: number;
  selection: PaymentMethodSelection;
  assetDecimals: number;
  signal: AbortSignal;
}>;

export function useCreatePayment(session: CheckoutSession) {
  const queryClient = useQueryClient();
  const [activeReference, setActiveReference] =
    useState<PaymentReference | null>(null);
  const latestIntentId = useRef(0);
  const activeController = useRef<AbortController | null>(null);
  const activePayment = useQuery<CreatePaymentResponse>({
    queryKey: activeReference
      ? checkoutQueryKeys.payment(activeReference)
      : [...checkoutQueryKeys.payments(), "inactive"],
    queryFn: skipToken,
  });

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

      return assertPaymentMatchesCheckout(
        payment,
        session,
        assetDecimals,
        "create_payment",
      );
    },
    onSuccess: (payment, intent) => {
      if (intent.id !== latestIntentId.current) {
        return;
      }

      queryClient.setQueryData(
        checkoutQueryKeys.payment(payment.payment_reference),
        payment,
      );
      setActiveReference(payment.payment_reference);
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
    setActiveReference(null);
    mutation.reset();
  }, [mutation]);

  useEffect(
    () => () => {
      activeController.current?.abort();
    },
    [],
  );

  return {
    data: activePayment.data,
    error: mutation.error,
    isError: mutation.isError,
    isPending: mutation.isPending,
    requestQuote,
    reset,
  } as const;
}
