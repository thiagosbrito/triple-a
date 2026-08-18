"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { CheckoutSession } from "../../config/checkout-session";
import type { PaymentMethodSelection } from "../../domain/payment-method";
import { useBrowserLocale } from "../../hooks/use-browser-locale";
import { useCurrencies } from "../../hooks/use-currencies";
import { useCreatePayment } from "../../hooks/use-create-payment";
import { CheckoutLayout } from "./checkout-layout";
import { CheckoutPaymentPanel } from "./checkout-payment-panel";
import {
  DevelopmentScenarioPanel,
  DevelopmentToolsEmptyPanel,
} from "../development/development-scenario-panel";

type CheckoutPageProps = Readonly<{
  session: CheckoutSession;
  showDevelopmentTools?: boolean;
}>;

export const CheckoutPage = ({
  session,
  showDevelopmentTools = false,
}: CheckoutPageProps) => {
  const locale = useBrowserLocale();
  const currencies = useCurrencies();
  const quote = useCreatePayment(session);
  const [selection, setSelection] = useState<PaymentMethodSelection | null>(
    null,
  );
  const [developmentToolsOpen, setDevelopmentToolsOpen] = useState(false);
  const developmentToolsLauncher = useRef<HTMLButtonElement>(null);

  const selectPaymentMethod = (nextSelection: PaymentMethodSelection): void => {
    const currency = currencies.data?.currencies.find(
      (candidate) => candidate.code === nextSelection.currency,
    );

    if (!currency) {
      return;
    }

    setSelection(nextSelection);
    setDevelopmentToolsOpen(false);
    quote.requestQuote(nextSelection, currency.decimals);
  };

  const changePaymentMethod = (): void => {
    setDevelopmentToolsOpen(false);
    quote.reset();
    setSelection(null);
  };

  const closeDevelopmentTools = useCallback((): void => {
    setDevelopmentToolsOpen(false);
    requestAnimationFrame(() => developmentToolsLauncher.current?.focus());
  }, []);

  useEffect(() => {
    if (!showDevelopmentTools) {
      return;
    }

    const handleShortcut = (event: KeyboardEvent): void => {
      const togglesTools =
        (event.metaKey || event.ctrlKey) &&
        event.shiftKey &&
        !event.altKey &&
        event.key.toLowerCase() === "k";

      if (togglesTools) {
        event.preventDefault();
        setDevelopmentToolsOpen((isOpen) => {
          if (isOpen) {
            requestAnimationFrame(() =>
              developmentToolsLauncher.current?.focus(),
            );
          }
          return !isOpen;
        });
        return;
      }

      if (event.key === "Escape" && developmentToolsOpen) {
        event.preventDefault();
        closeDevelopmentTools();
      }
    };

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [closeDevelopmentTools, developmentToolsOpen, showDevelopmentTools]);

  return (
    <>
      <CheckoutLayout
        session={session}
        locale={locale}
        hasIssuedInstructions={Boolean(quote.data)}
        developmentToolsOpen={developmentToolsOpen && showDevelopmentTools}
      >
        <CheckoutPaymentPanel
          session={session}
          currencies={currencies}
          quote={quote}
          selection={selection}
          onSelect={selectPaymentMethod}
          onChangeMethod={changePaymentMethod}
        />
      </CheckoutLayout>

      {showDevelopmentTools && !developmentToolsOpen ? (
        <button
          ref={developmentToolsLauncher}
          type="button"
          aria-controls="development-tools-panel"
          aria-expanded="false"
          className="fixed right-4 bottom-4 z-40 min-h-11 rounded-full border border-violet-300 bg-violet-900 px-4 py-2 text-sm font-semibold text-white shadow-lg outline-offset-2 hover:bg-violet-800 focus-visible:outline-2 focus-visible:outline-violet-950"
          onClick={() => setDevelopmentToolsOpen(true)}
        >
          Dev tools
          <span className="ml-2 hidden text-xs font-normal text-violet-200 sm:inline">
            ⌘/Ctrl ⇧ K
          </span>
        </button>
      ) : null}

      {showDevelopmentTools && quote.data && developmentToolsOpen ? (
        <DevelopmentScenarioPanel
          key={quote.data.payment_reference}
          paymentReference={quote.data.payment_reference}
          onClose={closeDevelopmentTools}
        />
      ) : null}

      {showDevelopmentTools && developmentToolsOpen && !quote.data ? (
        <DevelopmentToolsEmptyPanel onClose={closeDevelopmentTools} />
      ) : null}
    </>
  );
};
