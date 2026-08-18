import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  isoTimestampSchema,
  type IsoTimestamp,
} from "../api/contracts/primitives";
import { formatRemainingMilliseconds } from "../domain/quote-expiration";
import { useQuoteCountdown } from "./use-quote-countdown";

const START = new Date("2026-08-18T12:00:00.000Z");

function CountdownProbe({
  expiresAt,
  enabled = true,
}: Readonly<{ expiresAt: IsoTimestamp; enabled?: boolean }>) {
  const countdown = useQuoteCountdown(expiresAt, enabled);

  return (
    <output data-deadline={countdown.isAtDeadline}>
      {formatRemainingMilliseconds(countdown.remainingMilliseconds)}
    </output>
  );
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(START);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useQuoteCountdown", () => {
  it("repaints from the absolute clock rather than decrementing stored time", () => {
    const expiresAt = isoTimestampSchema.parse(
      new Date(START.getTime() + 65_000).toISOString(),
    );
    render(<CountdownProbe expiresAt={expiresAt} />);

    expect(screen.getByText("01:05")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1_000);
    });
    expect(screen.getByText("01:04")).toBeInTheDocument();
  });

  it("recomputes immediately after a background time jump becomes visible", () => {
    const expiresAt = isoTimestampSchema.parse(
      new Date(START.getTime() + 65_000).toISOString(),
    );
    render(<CountdownProbe expiresAt={expiresAt} />);

    act(() => {
      vi.setSystemTime(new Date(START.getTime() + 60_000));
      document.dispatchEvent(new Event("visibilitychange"));
    });

    expect(screen.getByText("00:05")).toBeInTheDocument();
  });

  it("recomputes immediately when the window regains focus", () => {
    const expiresAt = isoTimestampSchema.parse(
      new Date(START.getTime() + 65_000).toISOString(),
    );
    render(<CountdownProbe expiresAt={expiresAt} />);

    act(() => {
      vi.setSystemTime(new Date(START.getTime() + 64_500));
      window.dispatchEvent(new Event("focus"));
    });

    expect(screen.getByText("00:01")).toBeInTheDocument();
  });

  it("stops repainting at zero and removes timer and event listeners", () => {
    const removeWindowListener = vi.spyOn(window, "removeEventListener");
    const removeDocumentListener = vi.spyOn(document, "removeEventListener");
    const expiresAt = isoTimestampSchema.parse(
      new Date(START.getTime() + 1_000).toISOString(),
    );
    const view = render(<CountdownProbe expiresAt={expiresAt} />);

    expect(vi.getTimerCount()).toBe(1);
    act(() => {
      vi.advanceTimersByTime(1_000);
    });
    expect(screen.getByText("00:00")).toHaveAttribute("data-deadline", "true");
    expect(vi.getTimerCount()).toBe(0);

    view.unmount();

    expect(removeWindowListener).toHaveBeenCalledWith(
      "focus",
      expect.any(Function),
    );
    expect(removeDocumentListener).toHaveBeenCalledWith(
      "visibilitychange",
      expect.any(Function),
    );
  });

  it("replaces the scheduled repaint when a complete new quote changes the deadline", () => {
    const firstExpiry = isoTimestampSchema.parse(
      new Date(START.getTime() + 60_000).toISOString(),
    );
    const nextExpiry = isoTimestampSchema.parse(
      new Date(START.getTime() + 180_000).toISOString(),
    );
    const view = render(<CountdownProbe expiresAt={firstExpiry} />);

    expect(screen.getByText("01:00")).toBeInTheDocument();
    expect(vi.getTimerCount()).toBe(1);

    view.rerender(<CountdownProbe expiresAt={nextExpiry} />);

    expect(screen.getByText("03:00")).toBeInTheDocument();
    expect(vi.getTimerCount()).toBe(1);
  });

  it("removes its timer and clock listeners when expiration becomes irrelevant", () => {
    const removeWindowListener = vi.spyOn(window, "removeEventListener");
    const removeDocumentListener = vi.spyOn(document, "removeEventListener");
    const expiresAt = isoTimestampSchema.parse(
      new Date(START.getTime() + 60_000).toISOString(),
    );
    const view = render(<CountdownProbe expiresAt={expiresAt} />);

    expect(vi.getTimerCount()).toBe(1);
    view.rerender(<CountdownProbe expiresAt={expiresAt} enabled={false} />);

    expect(vi.getTimerCount()).toBe(0);
    expect(removeWindowListener).toHaveBeenCalledWith(
      "focus",
      expect.any(Function),
    );
    expect(removeDocumentListener).toHaveBeenCalledWith(
      "visibilitychange",
      expect.any(Function),
    );
  });
});
