"use client";

import { useState } from "react";

import type { CheckoutSession } from "../../config/checkout-session";
import type { PaymentMethodSelection } from "../../domain/payment-method";
import { useBrowserLocale } from "../../hooks/use-browser-locale";
import { useCurrencies } from "../../hooks/use-currencies";
import { useCreatePayment } from "../../hooks/use-create-payment";
import { DevelopmentTools } from "../development/development-tools";
import { useDevelopmentToolsController } from "../development/use-development-tools-controller";
import { CheckoutLayout } from "./checkout-layout";
import { CheckoutPaymentPanel } from "./checkout-payment-panel";

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
  const developmentTools = useDevelopmentToolsController(showDevelopmentTools);

  const selectPaymentMethod = (nextSelection: PaymentMethodSelection): void => {
    const currency = currencies.data?.currencies.find(
      (candidate) => candidate.code === nextSelection.currency,
    );

    if (!currency) {
      return;
    }

    setSelection(nextSelection);
    developmentTools.dismiss();
    quote.requestQuote(nextSelection, currency.decimals);
  };

  const changePaymentMethod = (): void => {
    developmentTools.dismiss();
    quote.reset();
    setSelection(null);
  };

  return (
    <>
      <CheckoutLayout
        session={session}
        locale={locale}
        hasIssuedInstructions={Boolean(quote.data)}
        developmentToolsOpen={developmentTools.isOpen}
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

      {showDevelopmentTools ? (
        <DevelopmentTools
          isOpen={developmentTools.isOpen}
          launcherRef={developmentTools.launcherRef}
          paymentReference={quote.data?.payment_reference}
          onOpen={developmentTools.open}
          onClose={developmentTools.close}
        />
      ) : null}
    </>
  );
};
