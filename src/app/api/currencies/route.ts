import { CURRENCIES_FIXTURE } from "@/mocks/fixtures/currencies";

export const GET = (): Response => {
  return Response.json(CURRENCIES_FIXTURE, { status: 200 });
};
