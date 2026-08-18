"use client";

import { useState } from "react";

import type { CheckoutSession } from "../config/checkout-session";
import type { PaymentMethodSelection } from "../domain/payment-method";
import { useBrowserLocale } from "../hooks/use-browser-locale";
import { useCurrencies } from "../hooks/use-currencies";
import { useCreatePayment } from "../hooks/use-create-payment";
import { IssuedPaymentFlow } from "./issued-payment-flow";
import { OrderSummaryCard } from "./order-summary";
import { PaymentMethodSelector } from "./payment-method-selector";

type CheckoutPageProps = Readonly<{
  session: CheckoutSession;
}>;

export function CheckoutPage({ session }: CheckoutPageProps) {
  const locale = useBrowserLocale();
  const currencies = useCurrencies();
  const quote = useCreatePayment(session);
  const [selection, setSelection] = useState<PaymentMethodSelection | null>(
    null,
  );
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
  const hasIssuedInstructions = Boolean(quote.data && selectedCurrency);

  function selectPaymentMethod(nextSelection: PaymentMethodSelection): void {
    const currency = currencies.data?.currencies.find(
      (candidate) => candidate.code === nextSelection.currency,
    );

    if (!currency) {
      return;
    }

    setSelection(nextSelection);
    quote.requestQuote(nextSelection, currency.decimals);
  }

  function changePaymentMethod(): void {
    quote.reset();
    setSelection(null);
  }

  return (
    <main className="min-h-dvh bg-slate-50 px-4 py-6 text-slate-950 sm:px-6 sm:py-10 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="flex size-9 items-center justify-center rounded-xl bg-emerald-500 text-sm font-black text-emerald-950"
            >
              A
            </span>
            <span className="text-sm font-semibold tracking-wide text-slate-800">
              Secure checkout
            </span>
          </div>
          <p className="text-xs font-medium text-slate-500">
            Stablecoin payment
          </p>
        </header>

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-10">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_24px_80px_-48px_rgba(15,23,42,0.4)] sm:p-8">
            <p className="text-sm font-semibold text-emerald-700">
              {hasIssuedInstructions
                ? "Payment instructions"
                : "Payment method"}
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              {hasIssuedInstructions
                ? "Complete your payment"
                : "Choose how to pay"}
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
              {hasIssuedInstructions
                ? "Use the exact amount, network, and destination below. Review every detail in your wallet before sending."
                : "Select a supported stablecoin or cryptocurrency and the network available in your wallet."}
            </p>

            <div className="mt-8 border-t border-slate-100 pt-8">
              {currencies.isPending ? (
                <div role="status" className="rounded-2xl bg-slate-50 p-5">
                  <p className="font-medium text-slate-800">
                    Loading payment methods…
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    We are checking the currently supported networks.
                  </p>
                </div>
              ) : currencies.isError ? (
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
              ) : quote.data && selectedCurrency ? (
                <IssuedPaymentFlow
                  key={`${quote.data.payment_reference}:${quote.data.quote.expires_at}`}
                  payment={quote.data}
                  session={session}
                  assetDecimals={selectedCurrency.decimals}
                  onConfirmChange={changePaymentMethod}
                />
              ) : quote.data ? (
                <div
                  role="alert"
                  className="rounded-2xl border border-rose-200 bg-rose-50 p-5"
                >
                  <p className="font-semibold text-rose-950">
                    These payment instructions cannot be verified
                  </p>
                  <p className="mt-1 text-sm leading-6 text-rose-800">
                    Do not send funds. The issued asset is missing from the
                    validated payment-method catalog.
                  </p>
                  <button
                    type="button"
                    className="mt-4 min-h-11 rounded-xl bg-rose-950 px-4 py-2 text-sm font-semibold text-white outline-offset-2 hover:bg-rose-900 focus-visible:outline-2 focus-visible:outline-rose-950"
                    onClick={changePaymentMethod}
                  >
                    Choose another payment method
                  </button>
                </div>
              ) : (
                <PaymentMethodSelector
                  catalog={currencies.data}
                  value={selection}
                  onChange={selectPaymentMethod}
                />
              )}
            </div>

            {selection && selectedNetwork && quote.isPending ? (
              <p
                role="status"
                className="mt-6 rounded-2xl bg-sky-50 px-4 py-3 text-sm font-medium text-sky-950"
              >
                Creating your {selection.currency} quote on{" "}
                {selectedNetwork.name}…
              </p>
            ) : null}

            {selection &&
            selectedCurrency &&
            selectedNetwork &&
            quote.isError ? (
              <div
                role="alert"
                className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-4"
              >
                <p className="font-semibold text-rose-950">
                  We could not create this quote
                </p>
                <p className="mt-1 text-sm leading-6 text-rose-800">
                  No payment instructions were issued. You can safely try the
                  same method again.
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
          </section>

          <div className="lg:sticky lg:top-8">
            <OrderSummaryCard
              merchant={session.merchant}
              orderId={session.orderId}
              order={session.order}
              locale={locale}
            />
          </div>
        </div>

        <footer className="mt-8 text-center text-xs leading-5 text-slate-500">
          Verify the asset, network, and destination before sending. Blockchain
          transfers cannot be reversed.
        </footer>
      </div>
    </main>
  );
}
