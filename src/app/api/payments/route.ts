import {
  createPaymentRequestSchema,
  type CreatePaymentRequest,
} from "@/features/checkout/api/contracts/payments";
import {
  BAD_REQUEST_PROBLEM_TITLE,
  BAD_REQUEST_PROBLEM_TYPE,
  badRequestProblemSchema,
} from "@/features/checkout/api/contracts/problem";
import {
  createMockPayment,
  UnsupportedPaymentMethodError,
} from "@/mocks/quote-factory";

const INVALID_REQUEST_DETAIL =
  "The request body must contain a valid order_id, currency, and network.";
const UNAVAILABLE_PAYMENT_METHOD_DETAIL =
  "The selected currency and network combination is not available.";

function badRequest(detail: string): Response {
  const problem = badRequestProblemSchema.parse({
    type: BAD_REQUEST_PROBLEM_TYPE,
    title: BAD_REQUEST_PROBLEM_TITLE,
    status: 400,
    detail,
  });

  return Response.json(problem, {
    status: problem.status,
    headers: { "Content-Type": "application/problem+json" },
  });
}

async function parseRequest(
  request: Request,
): Promise<
  | { success: true; data: CreatePaymentRequest }
  | { success: false; response: Response }
> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return { success: false, response: badRequest(INVALID_REQUEST_DETAIL) };
  }

  const result = createPaymentRequestSchema.safeParse(body);

  if (!result.success) {
    return { success: false, response: badRequest(INVALID_REQUEST_DETAIL) };
  }

  return { success: true, data: result.data };
}

export async function POST(request: Request): Promise<Response> {
  const parsedRequest = await parseRequest(request);

  if (!parsedRequest.success) {
    return parsedRequest.response;
  }

  try {
    return Response.json(createMockPayment(parsedRequest.data), {
      status: 201,
    });
  } catch (error) {
    if (error instanceof UnsupportedPaymentMethodError) {
      return badRequest(UNAVAILABLE_PAYMENT_METHOD_DETAIL);
    }

    throw error;
  }
}
