import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  expiredUpdateSchema,
  failedUpdateSchema,
  overpaidUpdateSchema,
  paidUpdateSchema,
  underpaidUpdateSchema,
} from "../api/contracts/payment-status";
import { PAYMENT_STATUS } from "../api/contracts/payment-status-values";
import { createPaymentRequestSchema } from "../api/contracts/payments";
import { createPaymentStatusUpdate } from "@/mocks/payment-simulator";
import { createMockPayment } from "@/mocks/quote-factory";
import { PaymentOutcomeStatus } from "./payment-outcome-status";

const payment = createMockPayment(
  createPaymentRequestSchema.parse({
    order_id: "ORD-88213",
    currency: "USDC",
    network: "polygon",
  }),
  new Date("2026-08-18T12:00:00.000Z"),
);

describe("PaymentOutcomeStatus", () => {
  it("presents settled payment completion with exact received value", () => {
    const update = paidUpdateSchema.parse(
      createPaymentStatusUpdate(payment, PAYMENT_STATUS.paid),
    );
    render(
      <PaymentOutcomeStatus
        payment={payment}
        update={update}
        assetDecimals={6}
      />,
    );

    const status = screen.getByRole("status", { name: "Payment complete" });
    const region = screen.getByRole("region", { name: "Payment complete" });
    expect(status).toHaveTextContent("settled successfully");
    expect(region).toHaveTextContent("163.35 USDC");
    expect(region).toHaveTextContent("6 of 6");
    expect(region).toHaveTextContent("No further payment is required");
    expect(region).toHaveTextContent(payment.payment_reference);
  });

  it("instructs an underpaid shopper to send only the exact outstanding amount", () => {
    const update = underpaidUpdateSchema.parse(
      createPaymentStatusUpdate(payment, PAYMENT_STATUS.underpaid),
    );
    render(
      <PaymentOutcomeStatus
        payment={payment}
        update={update}
        assetDecimals={6}
      />,
    );

    const region = screen.getByRole("region", {
      name: "Additional payment required",
    });
    expect(region).toHaveTextContent("163.349999 USDC");
    expect(region).toHaveTextContent("0.000001 USDC");
    expect(region).toHaveTextContent(
      "Send only 0.000001 USDC on Polygon to the same address",
    );
    expect(region).toHaveTextContent("This page will continue checking");
    expect(region).toHaveTextContent(payment.quote.crypto_address);
    expect(
      within(region).getByRole("img", {
        name: "USDC destination address QR code for Polygon",
      }),
    ).toHaveAttribute("data-payment-qr-payload", payment.quote.crypto_address);
  });

  it("reports overpayment factually without promising a refund", () => {
    const update = overpaidUpdateSchema.parse(
      createPaymentStatusUpdate(payment, PAYMENT_STATUS.overpaid),
    );
    render(
      <PaymentOutcomeStatus
        payment={payment}
        update={update}
        assetDecimals={6}
      />,
    );

    const region = screen.getByRole("region", {
      name: "Payment received with an excess amount",
    });
    expect(region).toHaveTextContent("163.350001 USDC");
    expect(region).toHaveTextContent("0.000001 USDC");
    expect(region).toHaveTextContent("Do not send more");
    expect(region).toHaveTextContent(
      "cannot promise whether, when, or how the excess will be refunded",
    );
    expect(region).not.toHaveTextContent(/automatic refund/iu);
  });

  it("keeps expired instructions inactive and directs the shopper to requote", () => {
    const update = expiredUpdateSchema.parse(
      createPaymentStatusUpdate(payment, PAYMENT_STATUS.expired),
    );
    render(
      <PaymentOutcomeStatus
        payment={payment}
        update={update}
        assetDecimals={6}
      />,
    );

    const region = screen.getByRole("region", { name: "Quote expired" });
    expect(region).toHaveTextContent(
      "Do not use the previous amount, address, or QR code",
    );
    expect(region).toHaveTextContent("Request a complete new quote");
    expect(region).not.toHaveTextContent(payment.quote.crypto_address);
  });

  it("does not tell a shopper to repeat a failed settlement", () => {
    const update = failedUpdateSchema.parse(
      createPaymentStatusUpdate(payment, PAYMENT_STATUS.failed),
    );
    render(
      <PaymentOutcomeStatus
        payment={payment}
        update={update}
        assetDecimals={6}
      />,
    );

    const region = screen.getByRole("region", {
      name: "Payment could not be settled",
    });
    expect(region).toHaveTextContent("rejected settlement");
    expect(region).toHaveTextContent("Do not repeat the full payment");
    expect(region).toHaveTextContent("contact payment support");
    expect(region).not.toHaveTextContent(/try again|send again/iu);
  });
});
