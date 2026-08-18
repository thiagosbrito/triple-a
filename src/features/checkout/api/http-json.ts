import type { z } from "zod";

import {
  ApiProblemError,
  ProtocolError,
  knownApiProblemSchema,
  type ApiOperation,
} from "./contracts/problem";

export type CheckoutFetch = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

export type ApiRequestOptions = Readonly<{ signal?: AbortSignal }>;

type RequestJsonOptions<TResponse> = Readonly<{
  fetch: CheckoutFetch;
  operation: ApiOperation;
  path: string;
  expectedStatus: number;
  responseSchema: z.ZodType<TResponse>;
  init?: RequestInit;
}>;

const unexpectedStatusError = (
  operation: ApiOperation,
  expectedStatus: number,
  actualStatus: number,
): ProtocolError =>
  new ProtocolError(operation, [
    {
      message: `Expected HTTP ${expectedStatus}, received HTTP ${actualStatus}`,
      path: ["status"],
    },
  ]);

const readResponseJson = async (
  response: Response,
  operation: ApiOperation,
): Promise<unknown> => {
  try {
    return await response.json();
  } catch (error) {
    if (!(error instanceof SyntaxError)) {
      throw error;
    }

    throw new ProtocolError(
      operation,
      [{ message: "Response body is not valid JSON", path: [] }],
      { cause: error },
    );
  }
};

export const requestJson = async <TResponse>({
  fetch,
  operation,
  path,
  expectedStatus,
  responseSchema,
  init,
}: RequestJsonOptions<TResponse>): Promise<TResponse> => {
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
};

export const jsonRequestInit = (
  body: unknown,
  options?: ApiRequestOptions,
): RequestInit => ({
  method: "POST",
  headers: {
    Accept: "application/json, application/problem+json",
    "Content-Type": "application/json",
  },
  body: JSON.stringify(body),
  ...(options?.signal ? { signal: options.signal } : {}),
});

export const getRequestInit = (options?: ApiRequestOptions): RequestInit => ({
  headers: { Accept: "application/json, application/problem+json" },
  ...(options?.signal ? { signal: options.signal } : {}),
});
