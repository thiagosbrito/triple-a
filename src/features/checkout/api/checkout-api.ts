import {
  currenciesResponseSchema,
  type CurrenciesResponse,
} from "./contracts/currencies";
import {
  paymentStatusUpdateSchema,
  type PaymentStatusUpdate,
} from "./contracts/payment-status";
import {
  createPaymentRequestSchema,
  createPaymentResponseSchema,
  requotePaymentRequestSchema,
  requotePaymentResponseSchema,
  type CreatePaymentRequest,
  type CreatePaymentResponse,
  type RequotePaymentRequest,
  type RequotePaymentResponse,
} from "./contracts/payments";
import {
  paymentReferenceSchema,
  type PaymentReference,
} from "./contracts/primitives";
import {
  getRequestInit,
  jsonRequestInit,
  requestJson,
  type ApiRequestOptions,
  type CheckoutFetch,
} from "./http-json";
import {
  assertCreatedPaymentMatchesRequest,
  assertPaymentStatusMatchesReference,
  assertRequotedPaymentMatchesRequest,
} from "./validate-api-response";

type CheckoutApiOptions = Readonly<{ fetch?: CheckoutFetch }>;

export type CheckoutApi = Readonly<{
  getCurrencies: (options?: ApiRequestOptions) => Promise<CurrenciesResponse>;
  createPayment: (
    request: CreatePaymentRequest,
    options?: ApiRequestOptions,
  ) => Promise<CreatePaymentResponse>;
  getPayment: (
    reference: PaymentReference,
    options?: ApiRequestOptions,
  ) => Promise<PaymentStatusUpdate>;
  requotePayment: (
    reference: PaymentReference,
    request: RequotePaymentRequest,
    options?: ApiRequestOptions,
  ) => Promise<RequotePaymentResponse>;
}>;

export const createCheckoutApi = (
  options: CheckoutApiOptions = {},
): CheckoutApi => {
  const fetcher: CheckoutFetch =
    options.fetch ?? ((input, init) => globalThis.fetch(input, init));

  return {
    getCurrencies: (requestOptions) =>
      requestJson({
        fetch: fetcher,
        operation: "get_currencies",
        path: "/api/currencies",
        expectedStatus: 200,
        responseSchema: currenciesResponseSchema,
        init: getRequestInit(requestOptions),
      }),

    createPayment: async (request, requestOptions) => {
      const body = createPaymentRequestSchema.parse(request);
      const response = await requestJson({
        fetch: fetcher,
        operation: "create_payment",
        path: "/api/payments",
        expectedStatus: 201,
        responseSchema: createPaymentResponseSchema,
        init: jsonRequestInit(body, requestOptions),
      });

      return assertCreatedPaymentMatchesRequest(response, body);
    },

    getPayment: async (reference, requestOptions) => {
      const validReference = paymentReferenceSchema.parse(reference);
      const response = await requestJson({
        fetch: fetcher,
        operation: "get_payment",
        path: `/api/payments/${encodeURIComponent(validReference)}`,
        expectedStatus: 200,
        responseSchema: paymentStatusUpdateSchema,
        init: getRequestInit(requestOptions),
      });

      return assertPaymentStatusMatchesReference(response, validReference);
    },

    requotePayment: async (reference, request, requestOptions) => {
      const validReference = paymentReferenceSchema.parse(reference);
      const body = requotePaymentRequestSchema.parse(request);
      const response = await requestJson({
        fetch: fetcher,
        operation: "requote_payment",
        path: `/api/payments/${encodeURIComponent(validReference)}/requote`,
        expectedStatus: 201,
        responseSchema: requotePaymentResponseSchema,
        init: jsonRequestInit(body, requestOptions),
      });

      return assertRequotedPaymentMatchesRequest(
        response,
        validReference,
        body,
      );
    },
  };
};

export const checkoutApi = createCheckoutApi();
