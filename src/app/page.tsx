import { CheckoutPage } from "@/features/checkout/components/checkout-page";
import { CHECKOUT_SESSION } from "@/features/checkout/config/checkout-session";

export default function Home() {
  return (
    <CheckoutPage
      session={CHECKOUT_SESSION}
      showDevelopmentTools={process.env.NODE_ENV === "development"}
    />
  );
}
