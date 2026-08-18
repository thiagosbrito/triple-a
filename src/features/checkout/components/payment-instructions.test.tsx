import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { paymentQuoteSchema } from "../api/contracts/payments";
import { PaymentInstructions } from "./payment-instructions";

describe("PaymentInstructions", () => {
  it("keeps exact quote amounts, asset, network, fee, and address together", () => {
    const quote = paymentQuoteSchema.parse({
      crypto_currency: "USDC",
      network: "polygon",
      network_name: "Polygon",
      exchange_rate: "0.9182",
      crypto_amount: "163.25",
      network_fee: "0.10",
      total_due: "163.35",
      crypto_address: "mock-usdc-polygon-destination",
      required_confirmations: 6,
      expires_at: "2026-08-18T12:00:00.000Z",
    });

    render(
      <PaymentInstructions
        quote={quote}
        assetDecimals={6}
        countdown={{
          remainingMilliseconds: 120_000,
          isAtDeadline: false,
        }}
      />,
    );

    const instructions = screen.getByRole("region", {
      name: "Send exactly",
    });
    expect(instructions).toHaveTextContent("163.35 USDC");
    expect(
      within(instructions).getByText("Payment amount").parentElement,
    ).toHaveTextContent("163.25 USDC");
    expect(
      within(instructions).getByText("Network fee").parentElement,
    ).toHaveTextContent("0.10 USDC");
    expect(
      within(instructions).getByText("mock-usdc-polygon-destination"),
    ).toBeVisible();
    const qr = within(instructions).getByRole("img", {
      name: "USDC destination address QR code for Polygon",
    });
    expect(qr).toHaveAttribute(
      "data-payment-qr-payload",
      within(instructions).getByText("mock-usdc-polygon-destination")
        .textContent,
    );
    expect(
      screen.getByRole("complementary", { name: "Use only Polygon" }),
    ).toHaveTextContent(
      "Send only USDC on Polygon to the address below. A different asset or network may permanently lose your funds.",
    );
  });

  it("preserves an eighteen-decimal transfer representation without exponent notation", () => {
    const exactAmount = "0.000000000000000001";
    const quote = paymentQuoteSchema.parse({
      crypto_currency: "ETH",
      network: "ethereum",
      network_name: "Ethereum",
      exchange_rate: "3187.45",
      crypto_amount: exactAmount,
      network_fee: "0",
      total_due: exactAmount,
      crypto_address: "mock-eth-destination",
      required_confirmations: 3,
      expires_at: "2026-08-18T12:00:00.000Z",
    });

    render(
      <PaymentInstructions
        quote={quote}
        assetDecimals={18}
        countdown={{
          remainingMilliseconds: 120_000,
          isAtDeadline: false,
        }}
      />,
    );

    const instructions = screen.getByRole("region", {
      name: "Send exactly",
    });
    expect(instructions).toHaveTextContent(`${exactAmount} ETH`);
    expect(instructions.textContent).not.toMatch(/\de[+-]\d/iu);
  });
});
