import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { PaymentStatusUpdate } from "../api/contracts/payment-status";
import { PAYMENT_STATUS } from "../api/contracts/payment-status-values";
import { createPaymentRequestSchema } from "../api/contracts/payments";
import { CHECKOUT_SESSION } from "../config/checkout-session";
import { PAYMENT_POLL_INTERVAL_MILLISECONDS } from "../domain/payment-polling";
import { createPaymentStatusUpdate } from "@/mocks/payment-simulator";
import { createMockPayment } from "@/mocks/quote-factory";
import { IssuedPaymentFlow } from "./issued-payment-flow";

const START = new Date("2026-08-18T12:00:00.000Z");
const payment = createMockPayment(
  createPaymentRequestSchema.parse({
    order_id: "ORD-88213",
    currency: "USDC",
    network: "polygon",
  }),
  START,
);

function TestQueryProvider({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider
      client={
        new QueryClient({
          defaultOptions: { queries: { retry: false } },
        })
      }
    >
      {children}
    </QueryClientProvider>
  );
}

function renderFlow(): void {
  render(
    <IssuedPaymentFlow
      payment={payment}
      session={CHECKOUT_SESSION}
      assetDecimals={6}
      onConfirmChange={vi.fn()}
    />,
    { wrapper: TestQueryProvider },
  );
}

function responseFor(update: PaymentStatusUpdate): Promise<Response> {
  return Promise.resolve(Response.json(update));
}

async function flush(milliseconds = 0): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(milliseconds);
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

describe("IssuedPaymentFlow lifecycle integration", () => {
  it.each([
    [PAYMENT_STATUS.detected, "Payment detected"],
    [PAYMENT_STATUS.confirming, "Payment confirming"],
    [PAYMENT_STATUS.paid, "Payment complete"],
    [PAYMENT_STATUS.underpaid, "Additional payment required"],
    [PAYMENT_STATUS.overpaid, "Payment received with an excess amount"],
    [PAYMENT_STATUS.expired, "Quote expired"],
    [PAYMENT_STATUS.failed, "Payment could not be settled"],
  ] as const)(
    "renders authoritative %s through the polling boundary",
    async (status, heading) => {
      const update = createPaymentStatusUpdate(payment, status, START);
      vi.spyOn(globalThis, "fetch").mockImplementation(() =>
        responseFor(update),
      );
      renderFlow();

      await flush();

      expect(screen.getByRole("heading", { name: heading })).toBeVisible();
      expect(screen.queryByRole("timer")).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Change payment method" }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("region", { name: "Send exactly" }),
      ).not.toBeInTheDocument();

      if (status === PAYMENT_STATUS.expired) {
        expect(
          screen.getByRole("button", { name: "Request new quote" }),
        ).toBeVisible();
      } else {
        expect(
          screen.queryByRole("button", { name: "Request new quote" }),
        ).not.toBeInTheDocument();
      }
    },
  );

  it.each([
    [
      PAYMENT_STATUS.awaiting_payment,
      PAYMENT_POLL_INTERVAL_MILLISECONDS.awaitingPayment,
    ],
    [PAYMENT_STATUS.detected, PAYMENT_POLL_INTERVAL_MILLISECONDS.detected],
    [PAYMENT_STATUS.confirming, PAYMENT_POLL_INTERVAL_MILLISECONDS.confirming],
    [PAYMENT_STATUS.underpaid, PAYMENT_POLL_INTERVAL_MILLISECONDS.underpaid],
  ] as const)(
    "continues polling the non-terminal %s state",
    async (status, interval) => {
      const update = createPaymentStatusUpdate(payment, status, START);
      const fetcher = vi
        .spyOn(globalThis, "fetch")
        .mockImplementation(() => responseFor(update));
      renderFlow();

      await flush();
      expect(fetcher).toHaveBeenCalledOnce();
      await flush(interval - 1);
      expect(fetcher).toHaveBeenCalledOnce();
      await flush(1);
      expect(fetcher).toHaveBeenCalledTimes(2);
    },
  );

  it.each([
    PAYMENT_STATUS.paid,
    PAYMENT_STATUS.overpaid,
    PAYMENT_STATUS.expired,
    PAYMENT_STATUS.failed,
  ] as const)("stops polling the terminal %s state", async (status) => {
    const update = createPaymentStatusUpdate(payment, status, START);
    const fetcher = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(() => responseFor(update));
    renderFlow();

    await flush();
    await flush(30_000);

    expect(fetcher).toHaveBeenCalledOnce();
  });
});
