import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { createPaymentRequestSchema } from "../../api/contracts/payments";
import {
  confirmingUpdateSchema,
  detectedUpdateSchema,
} from "../../api/contracts/payment-status";
import { PAYMENT_STATUS } from "../../api/contracts/payment-status-values";
import { createPaymentStatusUpdate } from "@/mocks/payment-simulator";
import { createMockPayment } from "@/mocks/quote-factory";
import { PaymentProgressStatus } from "./payment-progress-status";

const payment = createMockPayment(
  createPaymentRequestSchema.parse({
    order_id: "ORD-88213",
    currency: "USDC",
    network: "polygon",
  }),
  new Date("2026-08-18T12:00:00.000Z"),
);

describe("PaymentProgressStatus", () => {
  it("explains zero-confirmation detection without offering another transfer", () => {
    const update = detectedUpdateSchema.parse(
      createPaymentStatusUpdate(
        payment,
        PAYMENT_STATUS.detected,
        new Date("2026-08-18T12:00:10.000Z"),
      ),
    );
    render(
      <PaymentProgressStatus
        payment={payment}
        update={update}
        assetDecimals={6}
      />,
    );

    const status = screen.getByRole("status", { name: "Payment detected" });
    expect(status).toHaveTextContent("found with zero confirmations");
    expect(status).toHaveTextContent("0 of 6");
    expect(status).toHaveTextContent("163.35 USDC");
    expect(status).toHaveTextContent("USDC on Polygon");
    expect(status).toHaveTextContent("Do not send another payment");
    expect(status).toHaveTextContent(payment.payment_reference);
    expect(screen.getByRole("progressbar")).toHaveAttribute("value", "0");
  });

  it("shows current and required confirmation progress", () => {
    const update = confirmingUpdateSchema.parse(
      createPaymentStatusUpdate(
        payment,
        PAYMENT_STATUS.confirming,
        new Date("2026-08-18T12:00:20.000Z"),
      ),
    );
    render(
      <PaymentProgressStatus
        payment={payment}
        update={update}
        assetDecimals={6}
      />,
    );

    const status = screen.getByRole("status", { name: "Payment confirming" });
    expect(status).toHaveTextContent("5 of 6");
    expect(status).toHaveTextContent(
      "Do not send another payment while network confirmations are in progress",
    );
    expect(screen.getByRole("progressbar")).toHaveAttribute("value", "5");
    expect(screen.getByRole("progressbar")).toHaveAttribute("max", "6");
  });
});
