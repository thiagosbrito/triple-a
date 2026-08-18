import type { PaymentReference } from "./contracts/primitives";

export const checkoutQueryKeys = {
  all: ["checkout"] as const,
  currencies: () => [...checkoutQueryKeys.all, "currencies"] as const,
  payments: () => [...checkoutQueryKeys.all, "payments"] as const,
  payment: (reference: PaymentReference) =>
    [...checkoutQueryKeys.payments(), reference] as const,
  paymentStatus: (reference: PaymentReference) =>
    [...checkoutQueryKeys.payment(reference), "status"] as const,
};

export const checkoutMutationKeys = {
  all: [...checkoutQueryKeys.all, "mutations"] as const,
  createPayment: () => [...checkoutMutationKeys.all, "create-payment"] as const,
  requotePayment: (reference: PaymentReference) =>
    [...checkoutMutationKeys.all, "requote-payment", reference] as const,
};
