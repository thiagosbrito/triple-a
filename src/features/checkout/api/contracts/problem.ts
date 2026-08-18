import { z } from "zod";

import { nonBlankProtocolStringSchema } from "./primitives";

export const PROBLEM_TYPES = [
  "about:blank",
  "https://developers.triple-a.io/errors/quote-not-expired",
] as const;

// The Triple-A URI is an opaque identifier copied from the assessment fixture,
// not a client-side help link. `about:blank` is the standard generic problem
// type for mock request errors that have no supplied application-specific URI.

export type ProblemType = (typeof PROBLEM_TYPES)[number];

export const problemTypeSchema = z.enum(PROBLEM_TYPES);
export const BAD_REQUEST_PROBLEM_TYPE = PROBLEM_TYPES[0];
export const QUOTE_NOT_EXPIRED_PROBLEM_TYPE = PROBLEM_TYPES[1];

export const BAD_REQUEST_PROBLEM_TITLE = "Bad Request";
export const NOT_FOUND_PROBLEM_TITLE = "Not Found";
export const INTERNAL_SERVER_ERROR_PROBLEM_TITLE = "Internal Server Error";
export const CONFLICT_PROBLEM_TITLE = "Conflict";

export const badRequestProblemSchema = z.strictObject({
  type: z.literal(BAD_REQUEST_PROBLEM_TYPE),
  title: z.literal(BAD_REQUEST_PROBLEM_TITLE),
  status: z.literal(400),
  detail: nonBlankProtocolStringSchema,
});

export type BadRequestProblem = z.infer<typeof badRequestProblemSchema>;

export const notFoundProblemSchema = z.strictObject({
  type: z.literal(BAD_REQUEST_PROBLEM_TYPE),
  title: z.literal(NOT_FOUND_PROBLEM_TITLE),
  status: z.literal(404),
  detail: nonBlankProtocolStringSchema,
});

export type NotFoundProblem = z.infer<typeof notFoundProblemSchema>;

export const internalServerErrorProblemSchema = z.strictObject({
  type: z.literal(BAD_REQUEST_PROBLEM_TYPE),
  title: z.literal(INTERNAL_SERVER_ERROR_PROBLEM_TITLE),
  status: z.literal(500),
  detail: nonBlankProtocolStringSchema,
});

export type InternalServerErrorProblem = z.infer<
  typeof internalServerErrorProblemSchema
>;

export const conflictProblemSchema = z.strictObject({
  type: z.literal(BAD_REQUEST_PROBLEM_TYPE),
  title: z.literal(CONFLICT_PROBLEM_TITLE),
  status: z.literal(409),
  detail: nonBlankProtocolStringSchema,
});

export type ConflictProblem = z.infer<typeof conflictProblemSchema>;

export const QUOTE_NOT_EXPIRED_PROBLEM_TITLE = "Quote has not expired";

export const quoteNotExpiredProblemSchema = z.strictObject({
  type: z.literal(QUOTE_NOT_EXPIRED_PROBLEM_TYPE),
  title: z.literal(QUOTE_NOT_EXPIRED_PROBLEM_TITLE),
  status: z.literal(409),
  detail: nonBlankProtocolStringSchema,
});

export type QuoteNotExpiredProblem = z.infer<
  typeof quoteNotExpiredProblemSchema
>;

export const knownApiProblemSchema = z.union([
  badRequestProblemSchema,
  notFoundProblemSchema,
  internalServerErrorProblemSchema,
  conflictProblemSchema,
  quoteNotExpiredProblemSchema,
]);

export type KnownApiProblem = z.infer<typeof knownApiProblemSchema>;

export const API_OPERATIONS = [
  "get_currencies",
  "create_payment",
  "get_payment",
  "requote_payment",
] as const;

export type ApiOperation = (typeof API_OPERATIONS)[number];
export const apiOperationSchema = z.enum(API_OPERATIONS);
export const API_OPERATION = apiOperationSchema.enum;

export const API_ERROR_KINDS = ["api_problem", "protocol_error"] as const;
export type ApiErrorKind = (typeof API_ERROR_KINDS)[number];

export const apiErrorKindSchema = z.enum(API_ERROR_KINDS);
export const API_ERROR_KIND = apiErrorKindSchema.enum;

export class ApiProblemError<
  TProblem extends KnownApiProblem = KnownApiProblem,
> extends Error {
  readonly kind = API_ERROR_KIND.api_problem;

  constructor(
    readonly problem: TProblem,
    options?: ErrorOptions,
  ) {
    super(problem.title, options);
    this.name = "ApiProblemError";
  }
}

export const PROTOCOL_ERROR_CODES = ["invalid_response"] as const;
export type ProtocolErrorCode = (typeof PROTOCOL_ERROR_CODES)[number];
export const protocolErrorCodeSchema = z.enum(PROTOCOL_ERROR_CODES);
export const PROTOCOL_ERROR_CODE = protocolErrorCodeSchema.enum;

export type ProtocolIssue = Readonly<{
  message: string;
  path: readonly PropertyKey[];
}>;

export class ProtocolError extends Error {
  readonly kind = API_ERROR_KIND.protocol_error;
  readonly code = PROTOCOL_ERROR_CODE.invalid_response;

  constructor(
    readonly operation: ApiOperation,
    readonly issues: readonly ProtocolIssue[],
    options?: ErrorOptions,
  ) {
    super(`Invalid response for ${operation}`, options);
    this.name = "ProtocolError";
  }

  static fromZodError(
    operation: ApiOperation,
    error: z.ZodError,
  ): ProtocolError {
    return new ProtocolError(
      operation,
      error.issues.map(({ message, path }) => ({ message, path })),
      { cause: error },
    );
  }
}

export type CheckoutContractError = ApiProblemError | ProtocolError;
