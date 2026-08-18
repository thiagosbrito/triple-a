import {
  paymentScenarioControlRequestSchema,
  paymentScenarioControlResponseSchema,
} from "@/features/checkout/api/contracts/development";
import {
  BAD_REQUEST_PROBLEM_TITLE,
  BAD_REQUEST_PROBLEM_TYPE,
  NOT_FOUND_PROBLEM_TITLE,
  badRequestProblemSchema,
  notFoundProblemSchema,
} from "@/features/checkout/api/contracts/problem";
import { paymentReferenceSchema } from "@/features/checkout/api/contracts/primitives";
import { UnavailablePaymentScenarioError } from "@/mocks/payment-simulator";
import {
  PaymentScenarioNotFoundError,
  paymentScenarioStore,
} from "@/mocks/scenario-store";

const INVALID_CONFIGURATION_DETAIL =
  "The request must contain a valid payment reference and scenario configuration.";
const UNAVAILABLE_SCENARIO_DETAIL =
  "The selected status is not compatible with the payment's issued quote.";
const PAYMENT_NOT_FOUND_DETAIL = "The requested payment was not found.";

const problemResponse = (status: 400 | 404, detail: string): Response => {
  const problem =
    status === 400
      ? badRequestProblemSchema.parse({
          type: BAD_REQUEST_PROBLEM_TYPE,
          title: BAD_REQUEST_PROBLEM_TITLE,
          status,
          detail,
        })
      : notFoundProblemSchema.parse({
          type: BAD_REQUEST_PROBLEM_TYPE,
          title: NOT_FOUND_PROBLEM_TITLE,
          status,
          detail,
        });

  return Response.json(problem, {
    status,
    headers: { "Content-Type": "application/problem+json" },
  });
};

const notFound = (): Response => {
  return problemResponse(404, PAYMENT_NOT_FOUND_DETAIL);
};

const configurationResponse = (paymentReference: string): Response => {
  return Response.json(
    paymentScenarioControlResponseSchema.parse({
      payment_reference: paymentReference,
      configuration: paymentScenarioStore.getConfiguration(paymentReference),
    }),
    { headers: { "Cache-Control": "no-store" } },
  );
};

const developmentApiIsDisabled = (): boolean => {
  return process.env.NODE_ENV === "production";
};

export const GET = async (request: Request): Promise<Response> => {
  if (developmentApiIsDisabled()) {
    return notFound();
  }

  const paymentReference = paymentReferenceSchema.safeParse(
    new URL(request.url).searchParams.get("payment_reference"),
  );

  if (!paymentReference.success) {
    return problemResponse(400, INVALID_CONFIGURATION_DETAIL);
  }

  try {
    return configurationResponse(paymentReference.data);
  } catch (error) {
    if (error instanceof PaymentScenarioNotFoundError) {
      return notFound();
    }

    throw error;
  }
};

export const PUT = async (request: Request): Promise<Response> => {
  if (developmentApiIsDisabled()) {
    return notFound();
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return problemResponse(400, INVALID_CONFIGURATION_DETAIL);
  }

  const parsedRequest = paymentScenarioControlRequestSchema.safeParse(body);

  if (!parsedRequest.success) {
    return problemResponse(400, INVALID_CONFIGURATION_DETAIL);
  }

  try {
    paymentScenarioStore.configure(
      parsedRequest.data.payment_reference,
      parsedRequest.data.configuration,
    );
    return configurationResponse(parsedRequest.data.payment_reference);
  } catch (error) {
    if (error instanceof PaymentScenarioNotFoundError) {
      return notFound();
    }

    if (error instanceof UnavailablePaymentScenarioError) {
      return problemResponse(400, UNAVAILABLE_SCENARIO_DETAIL);
    }

    throw error;
  }
};
