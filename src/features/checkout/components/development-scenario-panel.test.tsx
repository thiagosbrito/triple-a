import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { developmentApi } from "../api/development-api";
import { paymentReferenceSchema } from "../api/contracts/primitives";
import {
  DevelopmentScenarioPanel,
  DevelopmentToolsEmptyPanel,
} from "./development-scenario-panel";

const paymentReference = paymentReferenceSchema.parse(
  "pay_01J5EXAMPLE0000000000000000",
);
const defaultScenario = {
  payment_reference: paymentReference,
  configuration: {
    scenario: {
      mode: "exact_state" as const,
      status: "awaiting_payment" as const,
    },
    response_delay_ms: 0,
    failure: { mode: "none" as const },
  },
};
const emptyMetrics = {
  payment_reference: paymentReference,
  metrics: {
    current_in_flight: 0,
    maximum_in_flight: 0,
    total_started: 0,
    total_completed: 0,
  },
};

function renderPanel(onClose = vi.fn()) {
  vi.spyOn(developmentApi, "getScenario").mockResolvedValue(defaultScenario);
  vi.spyOn(developmentApi, "getRequestMetrics").mockResolvedValue(emptyMetrics);
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const result = render(
    <QueryClientProvider client={queryClient}>
      <DevelopmentScenarioPanel
        paymentReference={paymentReference}
        onClose={onClose}
      />
    </QueryClientProvider>,
  );

  return { ...result, queryClient };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("DevelopmentScenarioPanel", () => {
  it("explains how to enable scenarios before a quote exists", () => {
    const onClose = vi.fn();
    render(<DevelopmentToolsEmptyPanel onClose={onClose} />);

    expect(
      screen.getByRole("status", {
        name: "Create a quote to enable scenarios",
      }),
    ).toHaveTextContent("Select a payment method");
    fireEvent.click(
      screen.getByRole("button", { name: "Close development tools" }),
    );
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("is explicitly separate from the shopper UI and exposes every payment state", async () => {
    renderPanel();

    expect(
      screen.getByRole("complementary", {
        name: "Development scenario controls",
      }),
    ).toHaveTextContent("Development only");
    const stateSelect = screen.getByLabelText("Payment state");
    expect(stateSelect).toHaveTextContent("Awaiting payment");
    expect(stateSelect).toHaveTextContent("Detected (0 confirmations)");
    expect(stateSelect).toHaveTextContent("Confirming");
    expect(stateSelect).toHaveTextContent("Paid");
    expect(stateSelect).toHaveTextContent("Underpaid");
    expect(stateSelect).toHaveTextContent("Overpaid");
    expect(stateSelect).toHaveTextContent("Expired");
    expect(stateSelect).toHaveTextContent("Settlement failed");
    expect(
      (await screen.findByText("Peak concurrent")).parentElement,
    ).toHaveTextContent("0");
    expect(screen.getByText(/Expected peak: 1/iu)).toBeInTheDocument();
  });

  it("closes from its labelled dock control", () => {
    const onClose = vi.fn();
    renderPanel(onClose);

    fireEvent.click(
      screen.getByRole("button", { name: "Close development tools" }),
    );

    expect(onClose).toHaveBeenCalledOnce();
  });

  it("applies state, delay, and transport behavior through the development API", async () => {
    const setScenario = vi
      .spyOn(developmentApi, "setScenario")
      .mockImplementation(async (reference, configuration) => ({
        payment_reference: reference,
        configuration,
      }));
    renderPanel();

    fireEvent.change(screen.getByLabelText("Payment state"), {
      target: { value: "detected" },
    });
    fireEvent.change(screen.getByLabelText("Response delay (ms)"), {
      target: { value: "5000" },
    });
    fireEvent.change(screen.getByLabelText("Transport failure"), {
      target: { value: "persistent" },
    });
    fireEvent.change(screen.getByLabelText("Failure kind"), {
      target: { value: "network_disconnect" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Apply scenario" }));

    await waitFor(() =>
      expect(setScenario).toHaveBeenCalledWith(paymentReference, {
        scenario: { mode: "exact_state", status: "detected" },
        response_delay_ms: 5_000,
        failure: { mode: "persistent", kind: "network_disconnect" },
      }),
    );
    expect(
      await screen.findByText(
        /Scenario applied and payment status refreshed/iu,
      ),
    ).toBeInTheDocument();
  });

  it("resets backend request metrics through the dedicated control", async () => {
    const resetRequestMetrics = vi
      .spyOn(developmentApi, "resetRequestMetrics")
      .mockResolvedValue(emptyMetrics);
    renderPanel();

    fireEvent.click(
      screen.getByRole("button", { name: "Reset polling diagnostics" }),
    );

    await waitFor(() =>
      expect(resetRequestMetrics).toHaveBeenCalledWith(paymentReference),
    );
  });
});
