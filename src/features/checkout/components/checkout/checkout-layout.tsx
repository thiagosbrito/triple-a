import type { ReactNode } from "react";

import type { CheckoutSession } from "../../config/checkout-session";
import { OrderSummaryCard } from "./order-summary";

type CheckoutLayoutProps = Readonly<{
  session: CheckoutSession;
  locale: string;
  hasIssuedInstructions: boolean;
  developmentToolsOpen: boolean;
  children: ReactNode;
}>;

export const CheckoutLayout = ({
  session,
  locale,
  hasIssuedInstructions,
  developmentToolsOpen,
  children,
}: CheckoutLayoutProps) => (
  <main
    className={`min-h-dvh bg-slate-50 px-4 py-6 text-slate-950 transition-[padding] duration-200 sm:px-6 sm:py-10 lg:px-8 ${developmentToolsOpen ? "xl:pr-[24rem]" : ""}`}
  >
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
        <p className="text-xs font-medium text-slate-500">Stablecoin payment</p>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-10">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_24px_80px_-48px_rgba(15,23,42,0.4)] sm:p-8">
          <p className="text-sm font-semibold text-emerald-700">
            {hasIssuedInstructions ? "Payment instructions" : "Payment method"}
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
          <div className="mt-8 border-t border-slate-100 pt-8">{children}</div>
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
