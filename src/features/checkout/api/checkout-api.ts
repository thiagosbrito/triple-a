import { z } from "zod";

import {
  currenciesResponseSchema,
  type CurrenciesResponse,
} from "./contracts/currencies";
import { paymentStatusUpdateSchema } from "./contracts/payment-status";
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
  ApiProblemError,
  ProtocolError,
  knownApiProblemSchema,
  type ApiOperation,
} from "./contracts/problem";
import {
  paymentReferenceSchema,
  type PaymentReference,
} from "./contracts/primitives";
import type { PaymentStatusUpdate } from "./contracts/payment-status";

type CheckoutFetch = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

type ApiRequestOptions = Readonly<{
  signal?: AbortSignal;
}>;

type CheckoutApiOptions = Readonly<{
  fetch?: CheckoutFetch;
}>;

export type CheckoutApi = Readonly<{
  getCurrencies(options?: ApiRequestOptions): Promise<CurrenciesResponse>;
  createPayment(
    request: CreatePaymentRequest,
    options?: ApiRequestOptions,
  ): Promise<CreatePaymentResponse>;
  getPayment(
    reference: PaymentReference,
    options?: ApiRequestOptions,
  ): Promise<PaymentStatusUpdate>;
  requotePayment(
    reference: PaymentReference,
    request: RequotePaymentRequest,
    options?: ApiRequestOptions,
  ): Promise<RequotePaymentResponse>;
}>;

type RequestJsonOptions<TResponse> = Readonly<{
  fetch: CheckoutFetch;
  operation: ApiOperation;
  path: string;
  expectedStatus: number;
  responseSchema: z.ZodType<TResponse>;
  init?: RequestInit;
}>;

function invalidJsonError(
  operation: ApiOperation,
  cause: SyntaxError,
): ProtocolError {
  return new ProtocolError(
    operation,
    [{ message: "Response body is not valid JSON", path: [] }],
    { cause },
  );
}

function unexpectedStatusError(
  operation: ApiOperation,
  expectedStatus: number,
  actualStatus: number,
): ProtocolError {
  return new ProtocolError(operation, [
    {
      message: `Expected HTTP ${expectedStatus}, received HTTP ${actualStatus}`,
      path: ["status"],
    },
  ]);
}

async function readResponseJson(
  response: Response,
  operation: ApiOperation,
): Promise<unknown> {
  try {
    return await response.json();
  } catch (error) {
    // A stream/network failure remains a transport error so retry policy can
    // distinguish it from a server payload that violates the protocol.
    if (!(error instanceof SyntaxError)) {
      throw error;
    }

    throw invalidJsonError(operation, error);
  }
}

async function requestJson<TResponse>({
  fetch,
  operation,
  path,
  expectedStatus,
  responseSchema,
  init,
}: RequestJsonOptions<TResponse>): Promise<TResponse> {
  const response = await fetch(path, init);
  const body = await readResponseJson(response, operation);

  if (!response.ok) {
    const parsedProblem = knownApiProblemSchema.safeParse(body);

    if (!parsedProblem.success) {
      throw ProtocolError.fromZodError(operation, parsedProblem.error);
    }

    if (parsedProblem.data.status !== response.status) {
      throw unexpectedStatusError(
        operation,
        parsedProblem.data.status,
        response.status,
      );
    }

    throw new ApiProblemError(parsedProblem.data);
  }

  if (response.status !== expectedStatus) {
    throw unexpectedStatusError(operation, expectedStatus, response.status);
  }

  const parsedResponse = responseSchema.safeParse(body);

  if (!parsedResponse.success) {
    throw ProtocolError.fromZodError(operation, parsedResponse.error);
  }

  return parsedResponse.data;
}

function jsonRequestInit(
  method: "POST",
  body: unknown,
  options?: ApiRequestOptions,
): RequestInit {
  return {
    method,
    headers: {
      Accept: "application/json, application/problem+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    ...(options?.signal ? { signal: options.signal } : {}),
  };
}

function getRequestInit(options?: ApiRequestOptions): RequestInit {
  return {
    headers: { Accept: "application/json, application/problem+json" },
    ...(options?.signal ? { signal: options.signal } : {}),
  };
}

export function createCheckoutApi(
  options: CheckoutApiOptions = {},
): CheckoutApi {
  const fetcher: CheckoutFetch =
    options.fetch ?? ((input, init) => globalThis.fetch(input, init));

  return {
    getCurrencies(requestOptions) {
      return requestJson({
        fetch: fetcher,
        operation: "get_currencies",
        path: "/api/currencies",
        expectedStatus: 200,
        responseSchema: currenciesResponseSchema,
        init: getRequestInit(requestOptions),
      });
    },

    createPayment(request, requestOptions) {
      const body = createPaymentRequestSchema.parse(request);

      return requestJson({
        fetch: fetcher,
        operation: "create_payment",
        path: "/api/payments",
        expectedStatus: 201,
        responseSchema: createPaymentResponseSchema,
        init: jsonRequestInit("POST", body, requestOptions),
      });
    },

    getPayment(reference, requestOptions) {
      const validReference = paymentReferenceSchema.parse(reference);

      return requestJson({
        fetch: fetcher,
        operation: "get_payment",
        path: `/api/payments/${encodeURIComponent(validReference)}`,
        expectedStatus: 200,
        responseSchema: paymentStatusUpdateSchema,
        init: getRequestInit(requestOptions),
      });
    },

    requotePayment(reference, request, requestOptions) {
      const validReference = paymentReferenceSchema.parse(reference);
      const body = requotePaymentRequestSchema.parse(request);

      return requestJson({
        fetch: fetcher,
        operation: "requote_payment",
        path: `/api/payments/${encodeURIComponent(validReference)}/requote`,
        expectedStatus: 201,
        responseSchema: requotePaymentResponseSchema,
        init: jsonRequestInit("POST", body, requestOptions),
      });
    },
  };
}

export const checkoutApi = createCheckoutApi();
