import type { PaymentReference } from "./contracts/primitives";

export const checkoutQueryKeys = {
  all: ["checkout"] as const,
  currencies: () => [...checkoutQueryKeys.all, "currencies"] as const,
  payments: () => [...checkoutQueryKeys.all, "payments"] as const,
  payment: (reference: PaymentReference) =>
    [...checkoutQueryKeys.payments(), reference] as const,
  paymentStatus: (reference: PaymentReference) =>
    [...checkoutQueryKeys.payment(reference), "status"] as const,
  development: (reference: PaymentReference) =>
    [...checkoutQueryKeys.payment(reference), "development"] as const,
  developmentScenario: (reference: PaymentReference) =>
    [...checkoutQueryKeys.development(reference), "scenario"] as const,
  developmentRequestMetrics: (reference: PaymentReference) =>
    [...checkoutQueryKeys.development(reference), "request-metrics"] as const,
};

export const checkoutMutationKeys = {
  all: [...checkoutQueryKeys.all, "mutations"] as const,
  createPayment: () => [...checkoutMutationKeys.all, "create-payment"] as const,
  requotePayment: (reference: PaymentReference) =>
    [...checkoutMutationKeys.all, "requote-payment", reference] as const,
  setDevelopmentScenario: (reference: PaymentReference) =>
    [
      ...checkoutMutationKeys.all,
      "set-development-scenario",
      reference,
    ] as const,
  setDevelopmentQuoteExpiry: (reference: PaymentReference) =>
    [
      ...checkoutMutationKeys.all,
      "set-development-quote-expiry",
      reference,
    ] as const,
  advanceDevelopmentConfirmation: (reference: PaymentReference) =>
    [
      ...checkoutMutationKeys.all,
      "advance-development-confirmation",
      reference,
    ] as const,
  resetDevelopmentRequestMetrics: (reference: PaymentReference) =>
    [
      ...checkoutMutationKeys.all,
      "reset-development-request-metrics",
      reference,
    ] as const,
};
