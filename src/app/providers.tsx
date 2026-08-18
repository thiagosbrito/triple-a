"use client";

import {
  environmentManager,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import type { ReactNode } from "react";

let browserQueryClient: QueryClient | undefined;

export function createCheckoutQueryClient(): QueryClient {
  return new QueryClient();
}

function getQueryClient(): QueryClient {
  if (environmentManager.isServer()) {
    return createCheckoutQueryClient();
  }

  browserQueryClient ??= createCheckoutQueryClient();
  return browserQueryClient;
}

export function AppProviders({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <QueryClientProvider client={getQueryClient()}>
      {children}
    </QueryClientProvider>
  );
}
