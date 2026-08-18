import {
  QueryClient,
  QueryClientProvider,
  skipToken,
  useQuery,
} from "@tanstack/react-query";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PAYMENT_STATUS } from "../../api/contracts/payment-status-values";
import { checkoutQueryKeys } from "../../api/checkout-query-keys";
import {
  createPaymentRequestSchema,
  createPaymentResponseSchema,
  type CreatePaymentResponse,
} from "../../api/contracts/payments";
import { createMockPayment } from "@/mocks/quote-factory";
import { CHECKOUT_SESSION } from "../../config/checkout-session";
import { IssuedPaymentFlow } from "./issued-payment-flow";

const START = new Date("2026-08-18T12:00:00.000Z");

const paymentExpiringIn = (milliseconds: number): CreatePaymentResponse => {
  const payment = createMockPayment(
    createPaymentRequestSchema.parse({
      order_id: "ORD-88213",
      currency: "USDC",
      network: "polygon",
    }),
    START,
  );

  return createPaymentResponseSchema.parse({
    ...payment,
    quote: {
      ...payment.quote,
      expires_at: new Date(START.getTime() + milliseconds).toISOString(),
    },
  });
};

const renderFlow = (payment: CreatePaymentResponse) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  queryClient.setQueryData(
    checkoutQueryKeys.payment(payment.payment_reference),
    payment,
  );

  const result = render(
    <QueryClientProvider client={queryClient}>
      <IssuedPaymentHarness reference={payment.payment_reference} />
    </QueryClientProvider>,
  );

  return { ...result, queryClient };
};

const IssuedPaymentHarness = ({
  reference,
}: Readonly<{ reference: CreatePaymentResponse["payment_reference"] }>) => {
  const payment = useQuery<CreatePaymentResponse>({
    queryKey: checkoutQueryKeys.payment(reference),
    queryFn: skipToken,
  });

  return payment.data ? (
    <IssuedPaymentFlow
      key={`${payment.data.payment_reference}:${payment.data.quote.expires_at}`}
      payment={payment.data}
      session={CHECKOUT_SESSION}
      assetDecimals={6}
      onChangeMethod={vi.fn()}
    />
  ) : null;
};

const reachDeadline = async (): Promise<void> => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1_000);
  });
};

const flushImmediateRequest = async (): Promise<void> => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
};

const awaitingResponse = (payment: CreatePaymentResponse): Response => {
  return Response.json({
    payment_reference: payment.payment_reference,
    status: PAYMENT_STATUS.awaiting_payment,
  });
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(START);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("IssuedPaymentFlow deadline reconciliation", () => {
  it("locks instructions and freezes the countdown as soon as polling detects funds", async () => {
    const payment = paymentExpiringIn(180_000);
    const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({
        payment_reference: payment.payment_reference,
        status: PAYMENT_STATUS.detected,
        confirmations: 0,
        required_confirmations: 6,
        amount_received: "163.35",
        tx_hash: "0xdetected",
        detected_at: "2026-08-18T12:00:00.000Z",
      }),
    );
    renderFlow(payment);

    await flushImmediateRequest();

    expect(fetcher).toHaveBeenCalledOnce();
    expect(screen.getByText("Payment detected")).toBeVisible();
    expect(screen.queryByRole("timer")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("region", { name: "Send exactly" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Change payment method" }),
    ).not.toBeInTheDocument();
  });

  it("checks awaiting status exactly once before presenting local expiry", async () => {
    const payment = paymentExpiringIn(1_000);
    const fetcher = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(() => Promise.resolve(awaitingResponse(payment)));
    renderFlow(payment);

    expect(screen.getByRole("region", { name: "Send exactly" })).toBeVisible();
    await flushImmediateRequest();
    expect(fetcher).toHaveBeenCalledOnce();
    await reachDeadline();

    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher).toHaveBeenCalledWith(
      `/api/payments/${payment.payment_reference}`,
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(
      screen.queryByRole("region", { name: "Send exactly" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Quote is no longer active")).toBeVisible();

    act(() => {
      window.dispatchEvent(new Event("focus"));
      document.dispatchEvent(new Event("visibilitychange"));
      vi.advanceTimersByTime(10_000);
    });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("atomically replaces expired instructions with a complete new quote", async () => {
    const payment = paymentExpiringIn(1_000);
    const requoted = createPaymentResponseSchema.parse({
      ...createMockPayment(
        createPaymentRequestSchema.parse({
          order_id: "ORD-88213",
          currency: "USDC",
          network: "polygon",
        }),
        new Date(START.getTime() + 1_000),
      ),
      quote: {
        ...payment.quote,
        crypto_amount: "164.00",
        network_fee: "0.10",
        total_due: "164.10",
        crypto_address: "new-polygon-payment-destination",
        expires_at: new Date(
          START.getTime() + 3 * 60 * 1_000 + 1_000,
        ).toISOString(),
      },
    });
    let resolveRequote!: (response: Response) => void;
    const requoteResponse = new Promise<Response>((resolve) => {
      resolveRequote = resolve;
    });
    const fetcher = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(awaitingResponse(payment))
      .mockResolvedValueOnce(awaitingResponse(payment))
      .mockReturnValueOnce(requoteResponse)
      .mockResolvedValueOnce(awaitingResponse(payment));
    const { queryClient } = renderFlow(payment);

    await flushImmediateRequest();
    await reachDeadline();
    fireEvent.click(screen.getByRole("button", { name: "Request new quote" }));

    expect(screen.getByRole("button")).toBeDisabled();
    expect(screen.getByText("Requesting new quote…")).toBeVisible();
    expect(
      screen.queryByRole("region", { name: "Send exactly" }),
    ).not.toBeInTheDocument();

    await act(async () => {
      resolveRequote(Response.json(requoted, { status: 201 }));
      await requoteResponse;
      await Promise.resolve();
      await Promise.resolve();
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(fetcher).toHaveBeenCalledTimes(4);
    expect(fetcher.mock.calls[2]).toEqual([
      `/api/payments/${payment.payment_reference}/requote`,
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ currency: "USDC", network: "polygon" }),
      }),
    ]);
    expect(screen.getByRole("region", { name: "Send exactly" })).toBeVisible();
    expect(screen.getByText("164.10 USDC")).toBeVisible();
    expect(screen.getByText("new-polygon-payment-destination")).toBeVisible();
    expect(screen.getByText("03:00")).toBeVisible();
    expect(
      queryClient.getQueryData(
        checkoutQueryKeys.payment(payment.payment_reference),
      ),
    ).toEqual(requoted);
    expect(
      queryClient.getQueryData(
        checkoutQueryKeys.paymentStatus(payment.payment_reference),
      ),
    ).toEqual({
      payment_reference: payment.payment_reference,
      status: PAYMENT_STATUS.awaiting_payment,
    });
  });

  it("refreshes status after a requote conflict without restoring old instructions", async () => {
    const payment = paymentExpiringIn(1_000);
    const problem = {
      type: "https://developers.triple-a.io/errors/quote-not-expired",
      title: "Quote has not expired",
      status: 409,
      detail: "The current quote is still active on the server.",
    } as const;
    const fetcher = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(awaitingResponse(payment))
      .mockResolvedValueOnce(awaitingResponse(payment))
      .mockResolvedValueOnce(Response.json(problem, { status: 409 }))
      .mockResolvedValueOnce(awaitingResponse(payment));
    renderFlow(payment);

    await flushImmediateRequest();
    await reachDeadline();
    fireEvent.click(screen.getByRole("button", { name: "Request new quote" }));
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(fetcher).toHaveBeenCalledTimes(4);
    expect(screen.getByRole("alert")).toHaveTextContent(
      "No new payment instructions were issued",
    );
    expect(screen.getByRole("alert")).toHaveTextContent(problem.detail);
    expect(screen.getByRole("alert")).toHaveTextContent(
      "We refreshed the payment status",
    );
    expect(
      screen.queryByRole("region", { name: "Send exactly" }),
    ).not.toBeInTheDocument();
  });

  it("lets a detected payment win when a requote conflict refresh finds funds", async () => {
    const payment = paymentExpiringIn(1_000);
    const fetcher = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(awaitingResponse(payment))
      .mockResolvedValueOnce(awaitingResponse(payment))
      .mockResolvedValueOnce(
        Response.json(
          {
            type: "about:blank",
            title: "Conflict",
            status: 409,
            detail: "The payment is already detected.",
          },
          { status: 409 },
        ),
      )
      .mockResolvedValueOnce(
        Response.json({
          payment_reference: payment.payment_reference,
          status: PAYMENT_STATUS.detected,
          confirmations: 0,
          required_confirmations: 6,
          amount_received: "163.35",
          tx_hash: "0xdetected",
          detected_at: "2026-08-18T12:00:01.000Z",
        }),
      );
    renderFlow(payment);

    await flushImmediateRequest();
    await reachDeadline();
    fireEvent.click(screen.getByRole("button", { name: "Request new quote" }));
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(fetcher).toHaveBeenCalledTimes(4);
    expect(screen.getByText("Payment detected")).toBeVisible();
    expect(screen.getByText(/Do not send another payment/u)).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Request new quote" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("Quote is no longer active"),
    ).not.toBeInTheDocument();
  });

  it("hides active instructions while reconciling and never expires detected funds", async () => {
    const payment = paymentExpiringIn(1_000);
    let resolveResponse!: (response: Response) => void;
    const response = new Promise<Response>((resolve) => {
      resolveResponse = resolve;
    });
    const fetcher = vi.spyOn(globalThis, "fetch").mockReturnValue(response);
    renderFlow(payment);

    act(() => {
      vi.advanceTimersByTime(1_000);
    });

    expect(screen.getByText("Checking payment status")).toBeVisible();
    expect(
      screen.queryByRole("region", { name: "Send exactly" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Change payment method" }),
    ).not.toBeInTheDocument();

    await act(async () => {
      resolveResponse(
        Response.json({
          payment_reference: payment.payment_reference,
          status: PAYMENT_STATUS.detected,
          confirmations: 0,
          required_confirmations: 6,
          amount_received: "163.35",
          tx_hash: "0xdetected",
          detected_at: "2026-08-18T12:00:01.000Z",
        }),
      );
      await response;
      await Promise.resolve();
    });

    expect(fetcher).toHaveBeenCalledOnce();
    expect(screen.getByText("Payment detected")).toBeVisible();
    expect(screen.getByText(/zero confirmations/u)).toBeVisible();
    expect(screen.getByText(/Do not send another payment/u)).toBeVisible();
    expect(
      screen.queryByText("Quote is no longer active"),
    ).not.toBeInTheDocument();
  });

  it("keeps transport failure separate from payment expiry", async () => {
    const payment = paymentExpiringIn(1_000);
    const transportError = new TypeError("offline");
    const fetcher = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValue(transportError);
    renderFlow(payment);

    await flushImmediateRequest();
    await reachDeadline();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(6_000);
    });

    expect(fetcher).toHaveBeenCalledTimes(4);
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Payment status could not be confirmed");
    expect(alert).toHaveTextContent("do not assume the quote expired");
    expect(alert).toHaveTextContent(payment.payment_reference);
    expect(
      screen.queryByText("Quote is no longer active"),
    ).not.toBeInTheDocument();
  });
});
