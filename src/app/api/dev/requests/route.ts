import { paymentReferenceSchema } from "@/features/checkout/api/contracts/primitives";
import {
  BAD_REQUEST_PROBLEM_TITLE,
  BAD_REQUEST_PROBLEM_TYPE,
  NOT_FOUND_PROBLEM_TITLE,
  badRequestProblemSchema,
  notFoundProblemSchema,
} from "@/features/checkout/api/contracts/problem";
import {
  paymentRequestMetricsResponseSchema,
  requestInstrumentation,
} from "@/mocks/request-instrumentation";
import { paymentScenarioStore } from "@/mocks/scenario-store";

const INVALID_REFERENCE_DETAIL =
  "A valid payment_reference query parameter is required.";
const PAYMENT_NOT_FOUND_DETAIL = "The requested payment was not found.";

function problemResponse(status: 400 | 404, detail: string): Response {
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
}

function developmentApiIsDisabled(): boolean {
  return process.env.NODE_ENV === "production";
}

function paymentReferenceFrom(request: Request) {
  return paymentReferenceSchema.safeParse(
    new URL(request.url).searchParams.get("payment_reference"),
  );
}

function metricsResponse(paymentReference: string): Response {
  return Response.json(
    paymentRequestMetricsResponseSchema.parse({
      payment_reference: paymentReference,
      metrics: requestInstrumentation.snapshot(paymentReference),
    }),
    { headers: { "Cache-Control": "no-store" } },
  );
}

export function GET(request: Request): Response {
  if (developmentApiIsDisabled()) {
    return problemResponse(404, PAYMENT_NOT_FOUND_DETAIL);
  }

  const paymentReference = paymentReferenceFrom(request);

  if (!paymentReference.success) {
    return problemResponse(400, INVALID_REFERENCE_DETAIL);
  }

  if (!paymentScenarioStore.has(paymentReference.data)) {
    return problemResponse(404, PAYMENT_NOT_FOUND_DETAIL);
  }

  return metricsResponse(paymentReference.data);
}

export function DELETE(request: Request): Response {
  if (developmentApiIsDisabled()) {
    return problemResponse(404, PAYMENT_NOT_FOUND_DETAIL);
  }

  const paymentReference = paymentReferenceFrom(request);

  if (!paymentReference.success) {
    return problemResponse(400, INVALID_REFERENCE_DETAIL);
  }

  if (!paymentScenarioStore.has(paymentReference.data)) {
    return problemResponse(404, PAYMENT_NOT_FOUND_DETAIL);
  }

  requestInstrumentation.reset(paymentReference.data);
  return metricsResponse(paymentReference.data);
}
