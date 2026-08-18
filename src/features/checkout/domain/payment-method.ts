import type { CurrenciesResponse } from "../api/contracts/currencies";
import type { CurrencyCode, NetworkId } from "../api/contracts/payment-method";

export interface PaymentMethodSelection {
  currency: CurrencyCode;
  network: NetworkId;
}

/**
 * Validates compatibility against the latest server-provided catalog. A
 * network is only valid when it belongs to the selected currency, even if the
 * same network identifier appears elsewhere in the catalog.
 */
export const isPaymentMethodSupported = (
  catalog: CurrenciesResponse,
  selection: PaymentMethodSelection,
): boolean => {
  return catalog.currencies.some(
    (currency) =>
      currency.code === selection.currency &&
      currency.networks.some((network) => network.id === selection.network),
  );
};
