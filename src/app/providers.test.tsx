import { useQueryClient } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import { useEffect } from "react";
import { describe, expect, it } from "vitest";

import { AppProviders } from "./providers";

describe("AppProviders", () => {
  it("provides one stable QueryClient across child rerenders", () => {
    const observedClients: ReturnType<typeof useQueryClient>[] = [];

    const QueryClientProbe = ({ label }: Readonly<{ label: string }>) => {
      const queryClient = useQueryClient();

      useEffect(() => {
        observedClients.push(queryClient);
      }, [label, queryClient]);

      return <span>{label}</span>;
    };

    const view = render(
      <AppProviders>
        <QueryClientProbe label="first" />
      </AppProviders>,
    );

    view.rerender(
      <AppProviders>
        <QueryClientProbe label="second" />
      </AppProviders>,
    );

    expect(observedClients).toHaveLength(2);
    expect(observedClients[0]).toBe(observedClients[1]);
  });
});
