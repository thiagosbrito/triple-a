import { CheckoutPage } from "@/features/checkout/components/checkout/checkout-page";
import { CHECKOUT_SESSION } from "@/features/checkout/config/checkout-session";

const Home = () => {
  return (
    <CheckoutPage
      session={CHECKOUT_SESSION}
      showDevelopmentTools={process.env.NODE_ENV === "development"}
    />
  );
};

export default Home;
