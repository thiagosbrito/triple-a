import { paymentReferenceSchema } from "@/features/checkout/api/contracts/primitives";
import {
  BAD_REQUEST_PROBLEM_TYPE,
  INTERNAL_SERVER_ERROR_PROBLEM_TITLE,
  NOT_FOUND_PROBLEM_TITLE,
  internalServerErrorProblemSchema,
  notFoundProblemSchema,
} from "@/features/checkout/api/contracts/problem";
import {
  PaymentScenarioNotFoundError,
  paymentScenarioStore,
  type PaymentSimulationInstruction,
} from "@/mocks/scenario-store";
import { requestInstrumentation } from "@/mocks/request-instrumentation";

type PaymentRouteContext = {
  params: Promise<{ reference: string }>;
};

const PAYMENT_NOT_FOUND_DETAIL = "The requested payment was not found.";
const SIMULATED_SERVER_ERROR_DETAIL = "A simulated server error occurred.";

const notFound = (): Response => {
  const problem = notFoundProblemSchema.parse({
    type: BAD_REQUEST_PROBLEM_TYPE,
    title: NOT_FOUND_PROBLEM_TITLE,
    status: 404,
    detail: PAYMENT_NOT_FOUND_DETAIL,
  });

  return Response.json(problem, {
    status: problem.status,
    headers: { "Content-Type": "application/problem+json" },
  });
};

const simulatedServerError = (): Response => {
  const problem = internalServerErrorProblemSchema.parse({
    type: BAD_REQUEST_PROBLEM_TYPE,
    title: INTERNAL_SERVER_ERROR_PROBLEM_TITLE,
    status: 500,
    detail: SIMULATED_SERVER_ERROR_DETAIL,
  });

  return Response.json(problem, {
    status: problem.status,
    headers: { "Content-Type": "application/problem+json" },
  });
};

const simulatedNetworkDisconnect = (): Response => {
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.error(new TypeError("Simulated network disconnect"));
    },
  });

  return new Response(body, {
    headers: {
      "Content-Length": "1",
      "Content-Type": "application/json",
    },
  });
};

const waitForConfiguredDelay = async (milliseconds: number): Promise<void> => {
  if (milliseconds === 0) {
    return;
  }

  await new Promise<void>((resolve) => {
    setTimeout(resolve, milliseconds);
  });
};

const respondToInstruction = async (
  instruction: PaymentSimulationInstruction,
): Promise<Response> => {
  await waitForConfiguredDelay(instruction.responseDelayMilliseconds);

  if (instruction.outcome === "response") {
    return Response.json(instruction.update);
  }

  return instruction.failureKind === "http_500"
    ? simulatedServerError()
    : simulatedNetworkDisconnect();
};

export const GET = async (
  _request: Request,
  { params }: PaymentRouteContext,
): Promise<Response> => {
  const { reference } = await params;
  const parsedReference = paymentReferenceSchema.safeParse(reference);

  if (!parsedReference.success) {
    return notFound();
  }

  try {
    const instruction = paymentScenarioStore.simulate(parsedReference.data);
    const completeRequest =
      process.env.NODE_ENV === "production"
        ? () => undefined
        : requestInstrumentation.begin(parsedReference.data);

    try {
      return await respondToInstruction(instruction);
    } finally {
      completeRequest();
    }
  } catch (error) {
    if (error instanceof PaymentScenarioNotFoundError) {
      return notFound();
    }

    throw error;
  }
};
