"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { developmentApi } from "../../api/development-api";
import {
  checkoutMutationKeys,
  checkoutQueryKeys,
} from "../../api/checkout-query-keys";
import type { PaymentScenarioConfiguration } from "../../api/contracts/development";
import type { PaymentReference } from "../../api/contracts/primitives";
import { DevelopmentQuoteExpiryControl } from "./development-quote-expiry-control";
import { DevelopmentRequestDiagnostics } from "./development-request-diagnostics";
import { DevelopmentScenarioForm } from "./development-scenario-form";
import { DevelopmentToolsShell } from "./development-tools-shell";

export { DevelopmentToolsEmptyPanel } from "./development-tools-shell";

export const DevelopmentScenarioPanel = ({
  paymentReference,
  onClose,
}: Readonly<{
  paymentReference: PaymentReference;
  onClose: () => void;
}>) => {
  const queryClient = useQueryClient();
  const scenario = useQuery({
    queryKey: checkoutQueryKeys.developmentScenario(paymentReference),
    queryFn: () => developmentApi.getScenario(paymentReference),
    retry: false,
    staleTime: Number.POSITIVE_INFINITY,
  });
  const metrics = useQuery({
    queryKey: checkoutQueryKeys.developmentRequestMetrics(paymentReference),
    queryFn: () => developmentApi.getRequestMetrics(paymentReference),
    refetchInterval: 1_000,
    retry: false,
  });
  const updateScenario = useMutation({
    mutationKey: checkoutMutationKeys.setDevelopmentScenario(paymentReference),
    mutationFn: (configuration: PaymentScenarioConfiguration) =>
      developmentApi.setScenario(paymentReference, configuration),
    onSuccess: async (response) => {
      queryClient.setQueryData(
        checkoutQueryKeys.developmentScenario(paymentReference),
        response,
      );
      await queryClient.refetchQueries({
        queryKey: checkoutQueryKeys.paymentStatus(paymentReference),
        exact: true,
        type: "active",
      });
    },
  });
  const updateQuoteExpiry = useMutation({
    mutationKey:
      checkoutMutationKeys.setDevelopmentQuoteExpiry(paymentReference),
    mutationFn: (expiresInSeconds: number) =>
      developmentApi.setQuoteExpiry(paymentReference, expiresInSeconds),
    onSuccess: (response) => {
      queryClient.setQueryData(
        checkoutQueryKeys.payment(paymentReference),
        response.payment,
      );
    },
  });
  const resetMetrics = useMutation({
    mutationKey:
      checkoutMutationKeys.resetDevelopmentRequestMetrics(paymentReference),
    mutationFn: () => developmentApi.resetRequestMetrics(paymentReference),
    onSuccess: (response) => {
      queryClient.setQueryData(
        checkoutQueryKeys.developmentRequestMetrics(paymentReference),
        response,
      );
    },
  });

  return (
    <DevelopmentToolsShell
      paymentReference={paymentReference}
      onClose={onClose}
    >
      {scenario.isError ? (
        <p role="alert" className="mb-4 text-sm font-medium text-rose-800">
          Scenario controls could not read the development API.
        </p>
      ) : null}

      <DevelopmentScenarioForm
        isPending={updateScenario.isPending}
        isSuccess={updateScenario.isSuccess}
        isError={updateScenario.isError}
        onApply={(configuration) => updateScenario.mutate(configuration)}
      />
      <DevelopmentQuoteExpiryControl
        isPending={updateQuoteExpiry.isPending}
        isSuccess={updateQuoteExpiry.isSuccess}
        isError={updateQuoteExpiry.isError}
        onApply={(expiresInSeconds) =>
          updateQuoteExpiry.mutate(expiresInSeconds)
        }
      />
      <DevelopmentRequestDiagnostics
        metrics={metrics.data}
        isResetPending={resetMetrics.isPending}
        onReset={() => resetMetrics.mutate()}
      />
    </DevelopmentToolsShell>
  );
};
