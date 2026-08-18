import type { CheckoutSession } from "../../config/checkout-session";
import type { PaymentMethodSelection } from "../../domain/payment-method";
import type { useCurrencies } from "../../hooks/use-currencies";
import type { useCreatePayment } from "../../hooks/use-create-payment";
import { PaymentMethodSelector } from "../payment-method/payment-method-selector";
import { IssuedPaymentFlow } from "../payment-status/issued-payment-flow";

type CheckoutPaymentPanelProps = Readonly<{
  session: CheckoutSession;
  currencies: ReturnType<typeof useCurrencies>;
  quote: ReturnType<typeof useCreatePayment>;
  selection: PaymentMethodSelection | null;
  onSelect: (selection: PaymentMethodSelection) => void;
  onChangeMethod: () => void;
}>;

export const CheckoutPaymentPanel = ({
  session,
  currencies,
  quote,
  selection,
  onSelect,
  onChangeMethod,
}: CheckoutPaymentPanelProps) => {
  const selectedCurrency = selection
    ? currencies.data?.currencies.find(
        (currency) => currency.code === selection.currency,
      )
    : undefined;
  const selectedNetwork = selection
    ? selectedCurrency?.networks.find(
        (network) => network.id === selection.network,
      )
    : undefined;

  if (currencies.isPending) {
    return (
      <div role="status" className="rounded-2xl bg-slate-50 p-5">
        <p className="font-medium text-slate-800">Loading payment methods…</p>
        <p className="mt-1 text-sm text-slate-500">
          We are checking the currently supported networks.
        </p>
      </div>
    );
  }

  if (currencies.isError) {
    return (
      <div
        role="alert"
        className="rounded-2xl border border-rose-200 bg-rose-50 p-5"
      >
        <p className="font-semibold text-rose-950">
          Payment methods could not be loaded
        </p>
        <p className="mt-1 text-sm leading-6 text-rose-800">
          No payment has started. Check your connection and try again.
        </p>
        <button
          type="button"
          className="mt-4 min-h-11 rounded-xl bg-rose-950 px-4 py-2 text-sm font-semibold text-white outline-offset-2 hover:bg-rose-900 focus-visible:outline-2 focus-visible:outline-rose-950"
          onClick={() => void currencies.refetch()}
        >
          Try again
        </button>
      </div>
    );
  }

  if (quote.data && selectedCurrency) {
    return (
      <IssuedPaymentFlow
        key={`${quote.data.payment_reference}:${quote.data.quote.expires_at}`}
        payment={quote.data}
        session={session}
        assetDecimals={selectedCurrency.decimals}
        onChangeMethod={onChangeMethod}
      />
    );
  }

  if (quote.data) {
    return (
      <div
        role="alert"
        className="rounded-2xl border border-rose-200 bg-rose-50 p-5"
      >
        <p className="font-semibold text-rose-950">
          These payment instructions cannot be verified
        </p>
        <p className="mt-1 text-sm leading-6 text-rose-800">
          Do not send funds. The issued asset is missing from the validated
          payment-method catalog.
        </p>
        <button
          type="button"
          className="mt-4 min-h-11 rounded-xl bg-rose-950 px-4 py-2 text-sm font-semibold text-white outline-offset-2 hover:bg-rose-900 focus-visible:outline-2 focus-visible:outline-rose-950"
          onClick={onChangeMethod}
        >
          Choose another payment method
        </button>
      </div>
    );
  }

  return (
    <>
      <PaymentMethodSelector
        catalog={currencies.data}
        value={selection}
        onChange={onSelect}
      />

      {selection && selectedNetwork && quote.isPending ? (
        <p
          role="status"
          className="mt-6 rounded-2xl bg-sky-50 px-4 py-3 text-sm font-medium text-sky-950"
        >
          Creating your {selection.currency} quote on {selectedNetwork.name}…
        </p>
      ) : null}

      {selection && selectedCurrency && selectedNetwork && quote.isError ? (
        <div
          role="alert"
          className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-4"
        >
          <p className="font-semibold text-rose-950">
            We could not create this quote
          </p>
          <p className="mt-1 text-sm leading-6 text-rose-800">
            No payment instructions were issued. You can safely try the same
            method again.
          </p>
          <button
            type="button"
            className="mt-3 min-h-11 rounded-xl bg-rose-950 px-4 py-2 text-sm font-semibold text-white outline-offset-2 hover:bg-rose-900 focus-visible:outline-2 focus-visible:outline-rose-950"
            onClick={() =>
              quote.requestQuote(selection, selectedCurrency.decimals)
            }
          >
            Retry quote
          </button>
        </div>
      ) : null}
    </>
  );
};
