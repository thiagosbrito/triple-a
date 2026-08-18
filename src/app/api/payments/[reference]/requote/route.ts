import { PAYMENT_STATUS } from "@/features/checkout/api/contracts/payment-status-values";
import {
  createPaymentResponseSchema,
  requotePaymentRequestSchema,
  type RequotePaymentRequest,
} from "@/features/checkout/api/contracts/payments";
import { paymentReferenceSchema } from "@/features/checkout/api/contracts/primitives";
import {
  BAD_REQUEST_PROBLEM_TITLE,
  BAD_REQUEST_PROBLEM_TYPE,
  CONFLICT_PROBLEM_TITLE,
  NOT_FOUND_PROBLEM_TITLE,
  QUOTE_NOT_EXPIRED_PROBLEM_TITLE,
  QUOTE_NOT_EXPIRED_PROBLEM_TYPE,
  badRequestProblemSchema,
  conflictProblemSchema,
  notFoundProblemSchema,
  quoteNotExpiredProblemSchema,
} from "@/features/checkout/api/contracts/problem";
import {
  createMockPayment,
  UnsupportedPaymentMethodError,
} from "@/mocks/quote-factory";
import {
  PaymentScenarioNotFoundError,
  paymentScenarioStore,
} from "@/mocks/scenario-store";

type RequoteRouteContext = {
  params: Promise<{ reference: string }>;
};

const INVALID_REQUEST_DETAIL =
  "The request body must contain a valid currency and network.";
const UNAVAILABLE_PAYMENT_METHOD_DETAIL =
  "The selected currency and network combination is not available.";
const PAYMENT_NOT_FOUND_DETAIL = "The requested payment was not found.";
const UNSAFE_REQUOTE_DETAIL =
  "This payment can no longer be requoted in its current state.";

const problemResponse = (problem: {
  type: "about:blank" | typeof QUOTE_NOT_EXPIRED_PROBLEM_TYPE;
  title: string;
  status: 400 | 404 | 409;
  detail: string;
}): Response => {
  return Response.json(problem, {
    status: problem.status,
    headers: { "Content-Type": "application/problem+json" },
  });
};

const badRequest = (detail: string): Response => {
  return problemResponse(
    badRequestProblemSchema.parse({
      type: BAD_REQUEST_PROBLEM_TYPE,
      title: BAD_REQUEST_PROBLEM_TITLE,
      status: 400,
      detail,
    }),
  );
};

const notFound = (): Response => {
  return problemResponse(
    notFoundProblemSchema.parse({
      type: BAD_REQUEST_PROBLEM_TYPE,
      title: NOT_FOUND_PROBLEM_TITLE,
      status: 404,
      detail: PAYMENT_NOT_FOUND_DETAIL,
    }),
  );
};

const earlyRequoteConflict = (expiresAt: string): Response => {
  return problemResponse(
    quoteNotExpiredProblemSchema.parse({
      type: QUOTE_NOT_EXPIRED_PROBLEM_TYPE,
      title: QUOTE_NOT_EXPIRED_PROBLEM_TITLE,
      status: 409,
      detail: `The current quote is valid until ${expiresAt}.`,
    }),
  );
};

const unsafeRequoteConflict = (): Response => {
  return problemResponse(
    conflictProblemSchema.parse({
      type: BAD_REQUEST_PROBLEM_TYPE,
      title: CONFLICT_PROBLEM_TITLE,
      status: 409,
      detail: UNSAFE_REQUOTE_DETAIL,
    }),
  );
};

const parseRequest = async (
  request: Request,
): Promise<RequotePaymentRequest | Response> => {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return badRequest(INVALID_REQUEST_DETAIL);
  }

  const parsedBody = requotePaymentRequestSchema.safeParse(body);
  return parsedBody.success
    ? parsedBody.data
    : badRequest(INVALID_REQUEST_DETAIL);
};

export const POST = async (
  request: Request,
  { params }: RequoteRouteContext,
): Promise<Response> => {
  const { reference } = await params;
  const parsedReference = paymentReferenceSchema.safeParse(reference);

  if (!parsedReference.success) {
    return notFound();
  }

  const parsedRequest = await parseRequest(request);

  if (parsedRequest instanceof Response) {
    return parsedRequest;
  }

  try {
    const existingPayment = paymentScenarioStore.getPayment(
      parsedReference.data,
    );
    const currentStatus = paymentScenarioStore.peekStatus(parsedReference.data);
    const now = new Date();
    const replacement = createMockPayment(
      {
        order_id: existingPayment.order_id,
        currency: parsedRequest.currency,
        network: parsedRequest.network,
      },
      now,
    );
    const awaitingAfterDeadline =
      currentStatus.status === PAYMENT_STATUS.awaiting_payment &&
      now.getTime() >= new Date(existingPayment.quote.expires_at).getTime();

    if (
      currentStatus.status !== PAYMENT_STATUS.expired &&
      !awaitingAfterDeadline
    ) {
      return currentStatus.status === PAYMENT_STATUS.awaiting_payment
        ? earlyRequoteConflict(existingPayment.quote.expires_at)
        : unsafeRequoteConflict();
    }

    const requotedPayment = createPaymentResponseSchema.parse({
      ...replacement,
      payment_reference: existingPayment.payment_reference,
    });
    paymentScenarioStore.registerPayment(requotedPayment, now);

    return Response.json(requotedPayment, { status: 201 });
  } catch (error) {
    if (error instanceof PaymentScenarioNotFoundError) {
      return notFound();
    }

    if (error instanceof UnsupportedPaymentMethodError) {
      return badRequest(UNAVAILABLE_PAYMENT_METHOD_DETAIL);
    }

    throw error;
  }
};
