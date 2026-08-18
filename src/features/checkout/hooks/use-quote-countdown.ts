"use client";

import { useEffect, useState } from "react";

import type { IsoTimestamp } from "../api/contracts/primitives";
import { getRemainingMilliseconds } from "../domain/quote-expiration";

const MAXIMUM_REPAINT_DELAY_MILLISECONDS = 1_000;

const getNextRepaintDelay = (remainingMilliseconds: number): number => {
  const millisecondsToNextSecond =
    remainingMilliseconds % MAXIMUM_REPAINT_DELAY_MILLISECONDS;

  return millisecondsToNextSecond === 0
    ? MAXIMUM_REPAINT_DELAY_MILLISECONDS
    : millisecondsToNextSecond;
};

export const useQuoteCountdown = (expiresAt: IsoTimestamp, enabled = true) => {
  const [nowEpochMilliseconds, setNowEpochMilliseconds] = useState(() =>
    Date.now(),
  );

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let timeout: ReturnType<typeof setTimeout> | undefined;
    let disposed = false;

    const refreshFromClock = (): void => {
      if (disposed) {
        return;
      }

      if (timeout !== undefined) {
        clearTimeout(timeout);
      }

      const now = Date.now();
      setNowEpochMilliseconds(now);
      const remainingMilliseconds = getRemainingMilliseconds(expiresAt, now);

      if (remainingMilliseconds > 0) {
        timeout = setTimeout(
          refreshFromClock,
          getNextRepaintDelay(remainingMilliseconds),
        );
      }
    };

    const refreshWhenVisible = (): void => {
      if (document.visibilityState === "visible") {
        refreshFromClock();
      }
    };

    refreshFromClock();
    window.addEventListener("focus", refreshFromClock);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      disposed = true;
      if (timeout !== undefined) {
        clearTimeout(timeout);
      }
      window.removeEventListener("focus", refreshFromClock);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [enabled, expiresAt]);

  const remainingMilliseconds = getRemainingMilliseconds(
    expiresAt,
    nowEpochMilliseconds,
  );

  return {
    remainingMilliseconds,
    isAtDeadline: remainingMilliseconds === 0,
  } as const;
};
