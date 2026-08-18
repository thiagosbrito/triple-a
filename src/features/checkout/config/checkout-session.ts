import {
  merchantDetailsSchema,
  orderSummarySchema,
  type MerchantDetails,
  type OrderSummary,
} from "../api/contracts/payments";
import { orderIdSchema, type OrderId } from "../api/contracts/primitives";

export type CheckoutSession = Readonly<{
  orderId: OrderId;
  merchant: MerchantDetails;
  order: OrderSummary;
}>;

/**
 * Input to this hosted checkout page. A real integration would supply this
 * context when the merchant creates or opens the checkout session; the
 * assessment provides one fixed order and no pre-quote session endpoint.
 */
export const CHECKOUT_SESSION: CheckoutSession = Object.freeze({
  orderId: orderIdSchema.parse("ORD-88213"),
  merchant: merchantDetailsSchema.parse({
    name: "Nordwind Audio",
    logo_url: null,
  }),
  order: orderSummarySchema.parse({
    currency: "EUR",
    amount: "149.90",
  }),
});
