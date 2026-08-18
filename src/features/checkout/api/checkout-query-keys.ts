import type { PaymentReference } from "./contracts/primitives";

export const checkoutQueryKeys = {
  all: ["checkout"] as const,
  currencies: () => [...checkoutQueryKeys.all, "currencies"] as const,
  payments: () => [...checkoutQueryKeys.all, "payments"] as const,
  payment: (reference: PaymentReference) =>
    [...checkoutQueryKeys.payments(), reference] as const,
};
