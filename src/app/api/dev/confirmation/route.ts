import {
  developmentConfirmationRequestSchema,
  developmentConfirmationResponseSchema,
} from "@/features/checkout/api/contracts/development";
import {
  BAD_REQUEST_PROBLEM_TITLE,
  BAD_REQUEST_PROBLEM_TYPE,
  CONFLICT_PROBLEM_TITLE,
  NOT_FOUND_PROBLEM_TITLE,
  badRequestProblemSchema,
  conflictProblemSchema,
  notFoundProblemSchema,
} from "@/features/checkout/api/contracts/problem";
import {
  PaymentConfirmationUnavailableError,
  PaymentScenarioNotFoundError,
  paymentScenarioStore,
} from "@/mocks/scenario-store";

const INVALID_REQUEST_DETAIL =
  "The request must contain a valid payment reference.";
const PAYMENT_NOT_FOUND_DETAIL = "The requested payment was not found.";
const CONFIRMATION_UNAVAILABLE_DETAIL =
  "The payment is not currently waiting for another network confirmation.";

const problemResponse = (status: 400 | 404 | 409, detail: string): Response => {
  const problem =
    status === 400
      ? badRequestProblemSchema.parse({
          type: BAD_REQUEST_PROBLEM_TYPE,
          title: BAD_REQUEST_PROBLEM_TITLE,
          status,
          detail,
        })
      : status === 404
        ? notFoundProblemSchema.parse({
            type: BAD_REQUEST_PROBLEM_TYPE,
            title: NOT_FOUND_PROBLEM_TITLE,
            status,
            detail,
          })
        : conflictProblemSchema.parse({
            type: BAD_REQUEST_PROBLEM_TYPE,
            title: CONFLICT_PROBLEM_TITLE,
            status,
            detail,
          });

  return Response.json(problem, {
    status,
    headers: { "Content-Type": "application/problem+json" },
  });
};

export const POST = async (request: Request): Promise<Response> => {
  if (process.env.NODE_ENV === "production") {
    return problemResponse(404, PAYMENT_NOT_FOUND_DETAIL);
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return problemResponse(400, INVALID_REQUEST_DETAIL);
  }

  const parsedRequest = developmentConfirmationRequestSchema.safeParse(body);

  if (!parsedRequest.success) {
    return problemResponse(400, INVALID_REQUEST_DETAIL);
  }

  try {
    const paymentReference = parsedRequest.data.payment_reference;
    const update = paymentScenarioStore.advanceConfirmation(paymentReference);

    return Response.json(
      developmentConfirmationResponseSchema.parse({
        payment_reference: paymentReference,
        configuration: paymentScenarioStore.getConfiguration(paymentReference),
        update,
      }),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof PaymentScenarioNotFoundError) {
      return problemResponse(404, PAYMENT_NOT_FOUND_DETAIL);
    }

    if (error instanceof PaymentConfirmationUnavailableError) {
      return problemResponse(409, CONFIRMATION_UNAVAILABLE_DETAIL);
    }

    throw error;
  }
};
