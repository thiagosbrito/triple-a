import { beforeEach, describe, expect, it } from "vitest";

import { RequestInstrumentation } from "./request-instrumentation";

const reference = "AQH-100306-PMT";

describe("RequestInstrumentation", () => {
  let instrumentation: RequestInstrumentation;

  beforeEach(() => {
    instrumentation = new RequestInstrumentation();
  });

  it("records current, maximum, started, and completed requests", () => {
    const completeFirst = instrumentation.begin(reference);
    const completeSecond = instrumentation.begin(reference);

    expect(instrumentation.snapshot(reference)).toEqual({
      current_in_flight: 2,
      maximum_in_flight: 2,
      total_started: 2,
      total_completed: 0,
    });

    completeFirst();
    completeSecond();

    expect(instrumentation.snapshot(reference)).toEqual({
      current_in_flight: 0,
      maximum_in_flight: 2,
      total_started: 2,
      total_completed: 2,
    });
  });

  it("makes completion handles idempotent", () => {
    const complete = instrumentation.begin(reference);
    complete();
    complete();

    expect(instrumentation.snapshot(reference)).toMatchObject({
      current_in_flight: 0,
      total_started: 1,
      total_completed: 1,
    });
  });

  it("keeps references independent", () => {
    instrumentation.begin(reference);
    instrumentation.begin("ANOTHER-PAYMENT");

    expect(instrumentation.snapshot(reference).current_in_flight).toBe(1);
    expect(instrumentation.snapshot("ANOTHER-PAYMENT").current_in_flight).toBe(
      1,
    );
  });

  it("resets one reference without corrupting an active completion handle", () => {
    const complete = instrumentation.begin(reference);
    instrumentation.reset(reference);
    complete();

    expect(instrumentation.snapshot(reference)).toEqual({
      current_in_flight: 0,
      maximum_in_flight: 0,
      total_started: 0,
      total_completed: 0,
    });
  });
});
