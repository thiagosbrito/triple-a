import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ProtocolError } from "../api/contracts/problem";
import { PaymentConnectivityNotice } from "./payment-connectivity-notice";

describe("PaymentConnectivityNotice", () => {
  it("stays absent while status transport is healthy", () => {
    render(
      <PaymentConnectivityNotice
        error={null}
        failureCount={0}
        isError={false}
        isFetching={false}
        onRetry={vi.fn()}
      />,
    );

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("communicates automatic recovery without changing business state", () => {
    render(
      <PaymentConnectivityNotice
        error={null}
        failureCount={1}
        isError={false}
        isFetching={true}
        onRetry={vi.fn()}
      />,
    );

    const status = screen.getByRole("status", {
      name: "Reconnecting to payment status",
    });
    expect(status).toHaveTextContent("Automatic recovery is in progress");
    expect(status).toHaveTextContent("do not send again");
    expect(
      screen.queryByRole("button", { name: "Retry payment status" }),
    ).not.toBeInTheDocument();
  });

  it("offers manual retry after transport retries are exhausted", () => {
    const onRetry = vi.fn();
    render(
      <PaymentConnectivityNotice
        error={new TypeError("offline")}
        failureCount={4}
        isError
        isFetching={false}
        onRetry={onRetry}
      />,
    );

    const status = screen.getByRole("status", {
      name: "Payment status connection interrupted",
    });
    expect(status).toHaveTextContent("does not mean the payment failed");
    expect(status).toHaveTextContent("last confirmed payment state");
    fireEvent.click(
      screen.getByRole("button", { name: "Retry payment status" }),
    );
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("distinguishes an invalid protocol response from connectivity", () => {
    render(
      <PaymentConnectivityNotice
        error={
          new ProtocolError("get_payment", [
            { message: "Unknown status", path: ["status"] },
          ])
        }
        failureCount={1}
        isError
        isFetching={false}
        onRetry={vi.fn()}
      />,
    );

    const status = screen.getByRole("status", {
      name: "Payment update could not be verified",
    });
    expect(status).toHaveTextContent("ignored an unverified response");
    expect(status).not.toHaveTextContent(/failed or expired/iu);
  });
});
