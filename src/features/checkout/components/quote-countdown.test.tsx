import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { isoTimestampSchema } from "../api/contracts/primitives";
import { QuoteCountdown } from "./quote-countdown";

const expiresAt = isoTimestampSchema.parse("2026-08-18T12:03:00.000Z");

describe("QuoteCountdown", () => {
  it("shows a non-live absolute countdown and does not announce every tick", () => {
    render(
      <QuoteCountdown
        expiresAt={expiresAt}
        remainingMilliseconds={180_000}
        isAtDeadline={false}
      />,
    );

    const timer = screen.getByRole("timer", { name: "Quote expires in" });
    expect(timer).toHaveAttribute("aria-live", "off");
    expect(timer).toHaveTextContent("03:00");
    expect(screen.getByText("03:00")).toHaveAttribute("datetime", expiresAt);
  });

  it("uses neutral reconciliation copy rather than declaring local expiry", () => {
    render(
      <QuoteCountdown
        expiresAt={expiresAt}
        remainingMilliseconds={0}
        isAtDeadline
      />,
    );

    const timer = screen.getByRole("timer", {
      name: "Quote deadline reached",
    });
    expect(timer).toHaveTextContent("00:00");
    expect(timer).toHaveTextContent(
      "Do not send while we confirm the latest payment status.",
    );
    expect(timer).not.toHaveTextContent("expired");
  });
});
