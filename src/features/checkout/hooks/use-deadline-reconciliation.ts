"use client";

import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";

import { checkoutApi } from "../api/checkout-api";
import { checkoutQueryKeys } from "../api/checkout-query-keys";
import { assertPaymentStatusMatchesQuote } from "../api/validate-payment-status";
import type { PaymentStatusUpdate } from "../api/contracts/payment-status";
import { PAYMENT_STATUS } from "../api/contracts/payment-status-values";
import type { CreatePaymentResponse } from "../api/contracts/payments";
import { getPaymentPollInterval } from "../domain/payment-polling";
import {
  getPaymentStatusRetryDelay,
  shouldRetryPaymentStatus,
} from "../domain/payment-status-retry";
import { useQuoteCountdown } from "./use-quote-countdown";

export type DeadlineReconciliationPhase =
  | "active"
  | "reconciling"
  | "locally_expired"
  | "authoritative_status"
  | "unavailable";

type ReconciliationState = Readonly<{
  phase: DeadlineReconciliationPhase;
  statusUpdate?: PaymentStatusUpdate;
}>;

export const useDeadlineReconciliation = (
  payment: CreatePaymentResponse,
  assetDecimals: number,
) => {
  const [reconciliation, setReconciliation] = useState<ReconciliationState>({
    phase: "active",
  });
  const attemptedAtDeadline = useRef(false);
  const generation = useRef(0);
  const statusQuery = useQuery({
    queryKey: checkoutQueryKeys.paymentStatus(payment.payment_reference),
    queryFn: async ({ signal }) => {
      const update = await checkoutApi.getPayment(payment.payment_reference, {
        signal,
      });
      return assertPaymentStatusMatchesQuote(update, payment, assetDecimals);
    },
    refetchInterval: (query) =>
      reconciliation.phase === "locally_expired"
        ? false
        : getPaymentPollInterval(query.state.data),
    // Payment-status reconciliation must settle into an explicit transport
    // error while offline. The default `online` mode pauses indefinitely and
    // would leave expired instructions stuck in a "checking" state.
    networkMode: "always",
    retry: shouldRetryPaymentStatus,
    retryDelay: getPaymentStatusRetryDelay,
  });
  const countdown = useQuoteCountdown(
    payment.quote.expires_at,
    !statusQuery.data ||
      statusQuery.data.status === PAYMENT_STATUS.awaiting_payment,
  );
  const refetchPaymentStatus = statusQuery.refetch;

  useEffect(
    () => () => {
      generation.current += 1;
    },
    [],
  );

  const reconcilePaymentStatus = useCallback(async (): Promise<void> => {
    const currentGeneration = generation.current + 1;
    generation.current = currentGeneration;
    setReconciliation({ phase: "reconciling" });

    try {
      const result = await refetchPaymentStatus({ cancelRefetch: false });

      if (generation.current !== currentGeneration) {
        return;
      }

      if (result.isError || !result.data) {
        setReconciliation({ phase: "unavailable" });
        return;
      }

      if (result.data.status === PAYMENT_STATUS.awaiting_payment) {
        setReconciliation({ phase: "locally_expired" });
        return;
      }

      setReconciliation({
        phase: "authoritative_status",
        statusUpdate: result.data,
      });
    } catch {
      if (generation.current === currentGeneration) {
        setReconciliation({ phase: "unavailable" });
      }
    }
  }, [refetchPaymentStatus]);

  useEffect(() => {
    if (!countdown.isAtDeadline || attemptedAtDeadline.current) {
      return;
    }

    attemptedAtDeadline.current = true;
    void reconcilePaymentStatus();
  }, [countdown.isAtDeadline, reconcilePaymentStatus]);

  const phase =
    statusQuery.data &&
    statusQuery.data.status !== PAYMENT_STATUS.awaiting_payment
      ? "authoritative_status"
      : countdown.isAtDeadline && reconciliation.phase === "active"
        ? "reconciling"
        : reconciliation.phase;
  const statusUpdate =
    phase === "authoritative_status"
      ? (statusQuery.data ?? reconciliation.statusUpdate)
      : reconciliation.statusUpdate;

  return {
    ...countdown,
    phase,
    statusUpdate,
    reconcilePaymentStatus,
    transport: {
      error: statusQuery.error,
      failureCount: statusQuery.failureCount,
      isError: statusQuery.isError,
      isFetching: statusQuery.isFetching,
      refetch: statusQuery.refetch,
    },
  } as const;
};
