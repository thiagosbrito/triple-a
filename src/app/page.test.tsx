import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { checkoutQueryKeys } from "@/features/checkout/api/checkout-query-keys";
import {
  createPaymentRequestSchema,
  type CreatePaymentResponse,
} from "@/features/checkout/api/contracts/payments";
import { paymentReferenceSchema } from "@/features/checkout/api/contracts/primitives";
import { CURRENCIES_FIXTURE } from "@/mocks/fixtures/currencies";
import { createMockPayment } from "@/mocks/quote-factory";

import Home from "./page";

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const view = render(
    <QueryClientProvider client={queryClient}>
      <Home />
    </QueryClientProvider>,
  );

  return { ...view, queryClient };
}

function mockSuccessfulCheckoutApi() {
  return vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
    if (String(input) === "/api/currencies") {
      return Promise.resolve(Response.json(CURRENCIES_FIXTURE));
    }

    if (String(input) === "/api/payments") {
      const request = createPaymentRequestSchema.parse(
        JSON.parse(String(init?.body)),
      );
      return Promise.resolve(
        Response.json(createMockPayment(request), { status: 201 }),
      );
    }

    return Promise.reject(new Error(`Unexpected request: ${String(input)}`));
  });
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });

  return { promise, resolve };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("hosted checkout page", () => {
  it("shows the localized order and every API-provided payment method", async () => {
    vi.spyOn(window.navigator, "language", "get").mockReturnValue("de-DE");
    const fetcher = mockSuccessfulCheckoutApi();

    renderPage();

    expect(
      screen.getByRole("heading", { level: 1, name: "Choose how to pay" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Nordwind Audio")).toBeInTheDocument();
    expect(screen.getByText("ORD-88213")).toBeInTheDocument();
    expect(screen.getByText(/149,90\s€/u)).toBeInTheDocument();

    expect(await screen.findAllByRole("radio")).toHaveLength(6);
    expect(
      screen.getByRole("radio", { name: "USDT on Tron (TRC-20)" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("radio", { name: "USDT on Ethereum (ERC-20)" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("radio", { name: "USDC on Polygon" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("radio", { name: "USDC on Solana" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("radio", { name: "ETH on Ethereum" }),
    ).toBeInTheDocument();
    expect(fetcher).toHaveBeenCalledWith(
      "/api/currencies",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it("creates a quote from keyboard selection and fixes the issued method", async () => {
    mockSuccessfulCheckoutApi();
    const user = userEvent.setup();

    renderPage();

    const polygon = await screen.findByRole("radio", {
      name: "USDC on Polygon",
    });
    polygon.focus();
    await user.keyboard("[Space]");

    expect(polygon).toBeChecked();
    expect(
      await screen.findByRole("status", { name: "Quote created" }),
    ).toHaveTextContent("USDC on Polygon is now fixed for this quote.");
    expect(polygon).toBeDisabled();
  });

  it("recovers from a catalog failure without implying a payment failed", async () => {
    const fetcher = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        Response.json(
          {
            type: "about:blank",
            title: "Internal Server Error",
            status: 500,
            detail: "A simulated server error occurred.",
          },
          { status: 500 },
        ),
      )
      .mockResolvedValueOnce(Response.json(CURRENCIES_FIXTURE));
    const user = userEvent.setup();

    renderPage();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Payment methods could not be loaded");
    expect(alert).toHaveTextContent("No payment has started");
    expect(alert).not.toHaveTextContent(/payment failed/i);

    await user.click(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findAllByRole("radio")).toHaveLength(6);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("ignores an obsolete quote response after a newer selection succeeds", async () => {
    const firstResponse = deferred<Response>();
    const latestResponse = deferred<Response>();
    const requestSignals: AbortSignal[] = [];
    const fetcher = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation((input, init) => {
        if (String(input) === "/api/currencies") {
          return Promise.resolve(Response.json(CURRENCIES_FIXTURE));
        }

        const request = createPaymentRequestSchema.parse(
          JSON.parse(String(init?.body)),
        );
        if (init?.signal) {
          requestSignals.push(init.signal);
        }

        return request.currency === "USDT" && request.network === "tron"
          ? firstResponse.promise
          : latestResponse.promise;
      });
    const user = userEvent.setup();
    const { queryClient } = renderPage();

    const tron = await screen.findByRole("radio", {
      name: "USDT on Tron (TRC-20)",
    });
    const polygon = screen.getByRole("radio", { name: "USDC on Polygon" });

    await user.click(tron);
    await user.click(polygon);

    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(requestSignals).toHaveLength(2);
    expect(requestSignals[0]?.aborted).toBe(true);
    expect(requestSignals[1]?.aborted).toBe(false);

    const latestPayment: CreatePaymentResponse = {
      ...createMockPayment(
        createPaymentRequestSchema.parse({
          order_id: "ORD-88213",
          currency: "USDC",
          network: "polygon",
        }),
      ),
      payment_reference: paymentReferenceSchema.parse("AQH-LATEST-PMT"),
    };
    await act(async () => {
      latestResponse.resolve(Response.json(latestPayment, { status: 201 }));
      await latestResponse.promise;
    });

    expect(
      await screen.findByRole("status", { name: "Quote created" }),
    ).toHaveTextContent("USDC on Polygon is now fixed for this quote.");

    const obsoletePayment: CreatePaymentResponse = {
      ...createMockPayment(
        createPaymentRequestSchema.parse({
          order_id: "ORD-88213",
          currency: "USDT",
          network: "tron",
        }),
      ),
      payment_reference: paymentReferenceSchema.parse("AQH-OBSOLETE-PMT"),
    };
    await act(async () => {
      firstResponse.resolve(Response.json(obsoletePayment, { status: 201 }));
      await firstResponse.promise;
    });

    await waitFor(() => {
      const obsoleteMutation = queryClient
        .getMutationCache()
        .getAll()
        .find(
          (candidate) =>
            (candidate.state.variables as { id?: number } | undefined)?.id ===
            1,
        );
      expect(obsoleteMutation?.state.status).toBe("success");
    });

    expect(
      queryClient.getQueryData(
        checkoutQueryKeys.payment(obsoletePayment.payment_reference),
      ),
    ).toBeUndefined();
    expect(
      queryClient.getQueryData(
        checkoutQueryKeys.payment(latestPayment.payment_reference),
      ),
    ).toEqual(latestPayment);
    expect(
      screen.getByRole("status", { name: "Quote created" }),
    ).toHaveTextContent("USDC on Polygon");
  });
});
