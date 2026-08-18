import { describe, expect, expectTypeOf, it } from "vitest";

import { paymentStatusUpdateSchema } from "./payment-status";
import { PAYMENT_STATUS } from "./payment-status-values";
import {
  ApiProblemError,
  API_OPERATION,
  BAD_REQUEST_PROBLEM_TITLE,
  BAD_REQUEST_PROBLEM_TYPE,
  QUOTE_NOT_EXPIRED_PROBLEM_TYPE,
  ProtocolError,
  badRequestProblemSchema,
  quoteNotExpiredProblemSchema,
  type CheckoutContractError,
} from "./problem";

describe("badRequestProblemSchema", () => {
  it("validates a generic RFC problem without inventing a help URI", () => {
    expect(
      badRequestProblemSchema.parse({
        type: BAD_REQUEST_PROBLEM_TYPE,
        title: BAD_REQUEST_PROBLEM_TITLE,
        status: 400,
        detail: "The selected payment method is not available.",
      }),
    ).toEqual({
      type: "about:blank",
      title: "Bad Request",
      status: 400,
      detail: "The selected payment method is not available.",
    });
  });

  it.each([
    ["a custom title", { title: "Unsupported payment method" }],
    ["a mismatched status", { status: 422 }],
    ["a blank detail", { detail: "" }],
    ["an unknown field", { error_code: "unsupported_method" }],
  ])("rejects %s", (_caseName, override) => {
    expect(
      badRequestProblemSchema.safeParse({
        type: BAD_REQUEST_PROBLEM_TYPE,
        title: BAD_REQUEST_PROBLEM_TITLE,
        status: 400,
        detail: "The request is invalid.",
        ...override,
      }).success,
    ).toBe(false);
  });
});

const documentedQuoteNotExpiredProblem = {
  type: "https://developers.triple-a.io/errors/quote-not-expired",
  title: "Quote has not expired",
  status: 409,
  detail: "The current quote is valid until 2026-08-14T08:52:10.842Z.",
};

describe("quoteNotExpiredProblemSchema", () => {
  it("validates the documented application/problem+json body", () => {
    expect(
      quoteNotExpiredProblemSchema.parse(documentedQuoteNotExpiredProblem),
    ).toEqual(documentedQuoteNotExpiredProblem);
  });

  it("keeps occurrence-specific detail opaque and unchanged", () => {
    const problem = quoteNotExpiredProblemSchema.parse({
      ...documentedQuoteNotExpiredProblem,
      detail: "The current quote remains active.",
    });

    expect(problem.detail).toBe("The current quote remains active.");
  });

  it.each([
    [
      "an unknown problem type",
      {
        ...documentedQuoteNotExpiredProblem,
        type: "https://developers.triple-a.io/errors/unknown",
      },
    ],
    [
      "a mismatched title",
      { ...documentedQuoteNotExpiredProblem, title: "Conflict" },
    ],
    [
      "a mismatched status",
      { ...documentedQuoteNotExpiredProblem, status: 400 },
    ],
    ["a string status", { ...documentedQuoteNotExpiredProblem, status: "409" }],
    ["blank detail", { ...documentedQuoteNotExpiredProblem, detail: "" }],
    [
      "an unknown field",
      { ...documentedQuoteNotExpiredProblem, expires_at: "unexpected" },
    ],
  ])("rejects %s", (_caseName, malformedProblem) => {
    expect(
      quoteNotExpiredProblemSchema.safeParse(malformedProblem).success,
    ).toBe(false);
  });

  it("exposes the problem type from the closed vocabulary", () => {
    expect(QUOTE_NOT_EXPIRED_PROBLEM_TYPE).toBe(
      documentedQuoteNotExpiredProblem.type,
    );
  });
});

describe("checkout contract errors", () => {
  it("wraps a known server problem without turning it into a protocol error", () => {
    const problem = quoteNotExpiredProblemSchema.parse(
      documentedQuoteNotExpiredProblem,
    );
    const error = new ApiProblemError(problem);

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ApiProblemError);
    expect(error).not.toBeInstanceOf(ProtocolError);
    expect(error.kind).toBe("api_problem");
    expect(error.problem).toBe(problem);
  });

  it("turns an unknown payment status into a typed protocol error", () => {
    const result = paymentStatusUpdateSchema.safeParse({
      payment_reference: "AQH-100306-PMT",
      status: "refunded",
    });

    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error("Expected the status payload to fail validation");
    }

    const error = ProtocolError.fromZodError(
      API_OPERATION.get_payment,
      result.error,
    );

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ProtocolError);
    expect(error).not.toBeInstanceOf(ApiProblemError);
    expect(error.kind).toBe("protocol_error");
    expect(error.code).toBe("invalid_response");
    expect(error.operation).toBe("get_payment");
    expect(error.issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: ["status"] })]),
    );
    expect(error.cause).toBe(result.error);
  });

  it("keeps the payment failed status as business data, not an exception", () => {
    const failedPayment = paymentStatusUpdateSchema.parse({
      payment_reference: "AQH-100306-PMT",
      status: PAYMENT_STATUS.failed,
      reason: "settlement_rejected",
    });

    expect(failedPayment.status).toBe(PAYMENT_STATUS.failed);
    expect(failedPayment).not.toBeInstanceOf(Error);
  });

  it("exposes a closed application error union", () => {
    expectTypeOf<CheckoutContractError>().toEqualTypeOf<
      ApiProblemError | ProtocolError
    >();
  });
});
