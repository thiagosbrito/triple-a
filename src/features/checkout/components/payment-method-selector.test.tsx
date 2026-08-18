import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CURRENCIES_FIXTURE } from "@/mocks/fixtures/currencies";

import { PaymentMethodSelector } from "./payment-method-selector";

describe("PaymentMethodSelector", () => {
  it("uses level-two headings for currency groups below the page heading", () => {
    render(
      <PaymentMethodSelector
        catalog={CURRENCIES_FIXTURE}
        value={null}
        onChange={vi.fn()}
      />,
    );

    for (const name of ["USDT", "USDC", "ETH"]) {
      expect(
        screen.getByRole("heading", { level: 2, name }),
      ).toBeInTheDocument();
    }
  });
});
