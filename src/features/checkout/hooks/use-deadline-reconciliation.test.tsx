import {
  onlineManager,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createPaymentRequestSchema,
  createPaymentResponseSchema,
} from "../api/contracts/payments";
import { checkoutQueryKeys } from "../api/checkout-query-keys";
import type { PaymentStatusUpdate } from "../api/contracts/payment-status";
import { PAYMENT_STATUS } from "../api/contracts/payment-status-values";
import { createPaymentStatusUpdate } from "@/mocks/payment-simulator";
import { createMockPayment } from "@/mocks/quote-factory";
import { useDeadlineReconciliation } from "./use-deadline-reconciliation";

const START = new Date("2026-08-18T12:00:00.000Z");
const payment = createMockPayment(
  createPaymentRequestSchema.parse({
    order_id: "ORD-88213",
    currency: "USDC",
    network: "polygon",
  }),
  START,
);

const wrapper = (queryClient: QueryClient) => {
  const QueryClientTestWrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  QueryClientTestWrapper.displayName = "QueryClientTestWrapper";
  return QueryClientTestWrapper;
};

const queryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

const responseFor = (update: PaymentStatusUpdate): Response => {
  return {
    ok: true,
    status: 200,
    json: () => Promise.resolve(update),
  } as Response;
};

const advance = async (milliseconds: number): Promise<void> => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(milliseconds);
  });
};

const flushResponse = async (): Promise<void> => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(0);
    await Promise.resolve();
    await Promise.resolve();
  });
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(START);
});

afterEach(() => {
  onlineManager.setOnline(true);
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("useDeadlineReconciliation polling", () => {
  it("uses status-specific intervals and stops after a terminal status", async () => {
    const updates = [
      PAYMENT_STATUS.awaiting_payment,
      PAYMENT_STATUS.detected,
      PAYMENT_STATUS.confirming,
      PAYMENT_STATUS.paid,
    ].map((status) => createPaymentStatusUpdate(payment, status, START));
    const fetcher = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(() =>
        Promise.resolve(responseFor(updates.shift() ?? updates[0]!)),
      );
    const client = queryClient();
    renderHook(() => useDeadlineReconciliation(payment, 6), {
      wrapper: wrapper(client),
    });

    await advance(0);
    expect(fetcher).toHaveBeenCalledOnce();

    await advance(2_999);
    expect(fetcher).toHaveBeenCalledOnce();
    await advance(1);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(
      client.getQueryData<PaymentStatusUpdate>(
        checkoutQueryKeys.paymentStatus(payment.payment_reference),
      )?.status,
    ).toBe(PAYMENT_STATUS.detected);

    await advance(1_499);
    expect(fetcher).toHaveBeenCalledTimes(2);
    await advance(1);
    expect(fetcher).toHaveBeenCalledTimes(3);
    await flushResponse();
    expect(
      client.getQueryData<PaymentStatusUpdate>(
        checkoutQueryKeys.paymentStatus(payment.payment_reference),
      )?.status,
    ).toBe(PAYMENT_STATUS.confirming);

    await advance(2_000);
    expect(fetcher).toHaveBeenCalledTimes(4);
    await flushResponse();
    expect(
      client.getQueryData<PaymentStatusUpdate>(
        checkoutQueryKeys.paymentStatus(payment.payment_reference),
      )?.status,
    ).toBe(PAYMENT_STATUS.paid);

    await advance(30_000);
    expect(fetcher).toHaveBeenCalledTimes(4);
  });

  it("never starts another poll while the current request is unresolved", async () => {
    let resolveResponse!: (response: Response) => void;
    const pendingResponse = new Promise<Response>((resolve) => {
      resolveResponse = resolve;
    });
    const fetcher = vi
      .spyOn(globalThis, "fetch")
      .mockReturnValue(pendingResponse);
    renderHook(() => useDeadlineReconciliation(payment, 6), {
      wrapper: wrapper(queryClient()),
    });

    await advance(30_000);
    expect(fetcher).toHaveBeenCalledOnce();

    await act(async () => {
      resolveResponse(
        responseFor(
          createPaymentStatusUpdate(
            payment,
            PAYMENT_STATUS.awaiting_payment,
            START,
          ),
        ),
      );
      await pendingResponse;
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(fetcher).toHaveBeenCalledOnce();

    await advance(3_000);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("preserves detected funds through retries and recovers on a later poll", async () => {
    const detected = createPaymentStatusUpdate(
      payment,
      PAYMENT_STATUS.detected,
      START,
    );
    const confirming = createPaymentStatusUpdate(
      payment,
      PAYMENT_STATUS.confirming,
      START,
    );
    let requestCount = 0;
    const fetcher = vi.spyOn(globalThis, "fetch").mockImplementation(() => {
      requestCount += 1;

      if (requestCount === 1) {
        return Promise.resolve(responseFor(detected));
      }

      if (requestCount <= 5) {
        return Promise.reject(new TypeError("offline"));
      }

      return Promise.resolve(responseFor(confirming));
    });
    const client = queryClient();
    renderHook(() => useDeadlineReconciliation(payment, 6), {
      wrapper: wrapper(client),
    });
    const statusKey = checkoutQueryKeys.paymentStatus(
      payment.payment_reference,
    );

    await advance(0);
    expect(client.getQueryData<PaymentStatusUpdate>(statusKey)?.status).toBe(
      PAYMENT_STATUS.detected,
    );

    await advance(1_500);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(client.getQueryData<PaymentStatusUpdate>(statusKey)?.status).toBe(
      PAYMENT_STATUS.detected,
    );

    await advance(1_000);
    await advance(2_000);
    await advance(4_000);
    expect(fetcher).toHaveBeenCalledTimes(5);
    expect(client.getQueryState(statusKey)?.status).toBe("error");
    expect(client.getQueryData<PaymentStatusUpdate>(statusKey)?.status).toBe(
      PAYMENT_STATUS.detected,
    );

    await advance(1_500);
    await flushResponse();
    expect(fetcher).toHaveBeenCalledTimes(6);
    expect(client.getQueryData<PaymentStatusUpdate>(statusKey)?.status).toBe(
      PAYMENT_STATUS.confirming,
    );
  });

  it("settles offline deadline reconciliation and supports a manual retry", async () => {
    const expiringPayment = createPaymentResponseSchema.parse({
      ...payment,
      quote: {
        ...payment.quote,
        expires_at: new Date(START.getTime() + 1_000).toISOString(),
      },
    });
    const awaitingPayment = createPaymentStatusUpdate(
      expiringPayment,
      PAYMENT_STATUS.awaiting_payment,
      START,
    );
    let isOffline = false;
    const fetcher = vi.spyOn(globalThis, "fetch").mockImplementation(() => {
      return isOffline
        ? Promise.reject(new TypeError("offline"))
        : Promise.resolve(responseFor(awaitingPayment));
    });
    const { result } = renderHook(
      () => useDeadlineReconciliation(expiringPayment, 6),
      { wrapper: wrapper(queryClient()) },
    );

    await advance(0);
    expect(fetcher).toHaveBeenCalledOnce();

    isOffline = true;
    onlineManager.setOnline(false);
    await advance(1_000);
    expect(result.current.phase).toBe("reconciling");

    await advance(7_000);
    await flushResponse();
    expect(fetcher).toHaveBeenCalledTimes(5);
    expect(result.current.phase).toBe("unavailable");

    isOffline = false;
    await act(async () => {
      await result.current.reconcilePaymentStatus();
    });
    expect(result.current.phase).toBe("locally_expired");
  });

  it("aborts the obsolete request when the payment reference changes", async () => {
    const signals: AbortSignal[] = [];
    const fetcher = vi.spyOn(globalThis, "fetch").mockImplementation(
      (_input, init) =>
        new Promise<Response>(() => {
          if (init?.signal) {
            signals.push(init.signal);
          }
        }),
    );
    const nextPayment = createPaymentResponseSchema.parse({
      ...payment,
      payment_reference: "AQH-100307-PMT",
    });
    const { rerender, unmount } = renderHook(
      ({ currentPayment }) => useDeadlineReconciliation(currentPayment, 6),
      {
        initialProps: { currentPayment: payment },
        wrapper: wrapper(queryClient()),
      },
    );

    await advance(0);
    expect(fetcher).toHaveBeenCalledOnce();
    expect(signals[0]?.aborted).toBe(false);

    rerender({ currentPayment: nextPayment });
    await advance(0);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(signals[0]?.aborted).toBe(true);
    expect(fetcher.mock.calls[1]?.[0]).toBe("/api/payments/AQH-100307-PMT");

    unmount();
    expect(signals[1]?.aborted).toBe(true);
  });
});
