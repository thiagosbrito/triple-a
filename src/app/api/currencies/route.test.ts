import { describe, expect, it } from "vitest";

import { currenciesResponseSchema } from "@/features/checkout/api/contracts/currencies";
import { CURRENCIES_FIXTURE } from "@/mocks/fixtures/currencies";

import { GET } from "./route";

describe("GET /api/currencies", () => {
  it("returns the validated complete catalog as JSON", async () => {
    const response = GET();
    const body: unknown = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(currenciesResponseSchema.parse(body)).toEqual(CURRENCIES_FIXTURE);
  });
});
