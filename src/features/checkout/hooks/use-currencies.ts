"use client";

import { useQuery } from "@tanstack/react-query";

import { checkoutApi } from "../api/checkout-api";
import { checkoutQueryKeys } from "../api/checkout-query-keys";

const CURRENCY_CATALOG_STALE_TIME_MILLISECONDS = 5 * 60 * 1_000;

export function useCurrencies() {
  return useQuery({
    queryKey: checkoutQueryKeys.currencies(),
    queryFn: ({ signal }) => checkoutApi.getCurrencies({ signal }),
    staleTime: CURRENCY_CATALOG_STALE_TIME_MILLISECONDS,
    retry: false,
  });
}
