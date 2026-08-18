import {
  developmentQuoteExpiryRequestSchema,
  developmentQuoteExpiryResponseSchema,
} from "@/features/checkout/api/contracts/development";
import {
  BAD_REQUEST_PROBLEM_TITLE,
  BAD_REQUEST_PROBLEM_TYPE,
  NOT_FOUND_PROBLEM_TITLE,
  badRequestProblemSchema,
  notFoundProblemSchema,
} from "@/features/checkout/api/contracts/problem";
import {
  PaymentScenarioNotFoundError,
  paymentScenarioStore,
} from "@/mocks/scenario-store";

const INVALID_REQUEST_DETAIL =
  "The request must contain a valid payment reference and expiry duration.";
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

  const parsedRequest = developmentQuoteExpiryRequestSchema.safeParse(body);

  if (!parsedRequest.success) {
    return problemResponse(400, INVALID_REQUEST_DETAIL);
  }

  try {
    const payment = paymentScenarioStore.setQuoteExpiry(
      parsedRequest.data.payment_reference,
      parsedRequest.data.expires_in_seconds,
    );

    return Response.json(
      developmentQuoteExpiryResponseSchema.parse({ payment }),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof PaymentScenarioNotFoundError) {
      return problemResponse(404, PAYMENT_NOT_FOUND_DETAIL);
    }

    throw error;
  }
};
