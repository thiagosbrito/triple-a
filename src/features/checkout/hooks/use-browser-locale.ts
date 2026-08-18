"use client";

import { useSyncExternalStore } from "react";

const SERVER_FALLBACK_LOCALE = "en-US";

const subscribe = (onLocaleChange: () => void): (() => void) => {
  window.addEventListener("languagechange", onLocaleChange);
  return () => window.removeEventListener("languagechange", onLocaleChange);
};

const getBrowserLocale = (): string => {
  return navigator.language || SERVER_FALLBACK_LOCALE;
};

const getServerLocale = (): string => {
  return SERVER_FALLBACK_LOCALE;
};

/**
 * Uses a deterministic server snapshot to avoid hydration mismatches, then
 * updates to the shopper's browser locale after hydration.
 */
export const useBrowserLocale = (): string => {
  return useSyncExternalStore(subscribe, getBrowserLocale, getServerLocale);
};
