import type { IsoTimestamp } from "../api/contracts/primitives";
import { formatRemainingMilliseconds } from "../domain/quote-expiration";

type QuoteCountdownProps = Readonly<{
  expiresAt: IsoTimestamp;
  remainingMilliseconds: number;
  isAtDeadline: boolean;
}>;

export function QuoteCountdown({
  expiresAt,
  remainingMilliseconds,
  isAtDeadline,
}: QuoteCountdownProps) {
  return (
    <div
      role="timer"
      aria-live="off"
      aria-labelledby="quote-countdown-label"
      className={`mt-5 flex items-center justify-between gap-4 rounded-2xl border px-4 py-3 ${
        isAtDeadline
          ? "border-amber-300 bg-amber-50 text-amber-950"
          : "border-sky-200 bg-sky-50 text-sky-950"
      }`}
    >
      <div>
        <p id="quote-countdown-label" className="text-sm font-semibold">
          {isAtDeadline ? "Quote deadline reached" : "Quote expires in"}
        </p>
        <p className="mt-1 text-xs leading-5">
          {isAtDeadline
            ? "Do not send while we confirm the latest payment status."
            : "Finish the transfer before this quote reaches zero."}
        </p>
      </div>
      <time
        dateTime={expiresAt}
        className="shrink-0 font-mono text-2xl font-semibold tabular-nums"
      >
        {formatRemainingMilliseconds(remainingMilliseconds)}
      </time>
    </div>
  );
}
