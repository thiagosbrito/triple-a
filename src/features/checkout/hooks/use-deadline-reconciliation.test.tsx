import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
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

function wrapper(queryClient: QueryClient) {
  return function TestQueryProvider({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

function queryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
}

function responseFor(update: PaymentStatusUpdate): Response {
  return {
    ok: true,
    status: 200,
    json: () => Promise.resolve(update),
  } as Response;
}

async function advance(milliseconds: number): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(milliseconds);
  });
}

async function flushResponse(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(0);
    await Promise.resolve();
    await Promise.resolve();
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(START);
});

afterEach(() => {
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
