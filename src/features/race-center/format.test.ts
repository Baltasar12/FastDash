import { describe, expect, it } from "vitest";
import { available } from "@/data/fixtures/f1";
import {
  classificationText,
  fieldText,
  formatDuration,
  formatRaceTime,
  sessionStartText,
} from "./format";
import { sampleRegularEvent } from "@/data/fixtures/f1";

describe("Race Center data presentation", () => {
  it("preserves available zero and distinguishes each missing-data meaning", () => {
    expect(fieldText(available(0))).toBe("0");
    expect(fieldText({ status: "missing" })).toBe("Not reported");
    expect(fieldText({ status: "not-applicable" })).toBe("Not applicable");
    expect(fieldText({ status: "unavailable", reason: "not-covered" })).toBe(
      "Not covered",
    );
    expect(fieldText({ status: "unavailable", reason: "not-published" })).toBe(
      "Not published",
    );
    expect(fieldText({ status: "unavailable", reason: "unknown" })).toBe(
      "Unavailable",
    );
  });

  it.each([
    [5_400_000, "1:30:00"],
    [89_000, "1:29"],
    [88_500, "1:28.5"],
    [87_432, "1:27.432"],
    [59_999.9999, "0:59.9999999"],
    [60_000.0001, "1:00.0000001"],
    [3_599_999.9999, "59:59.9999999"],
    [3_600_000.0001, "1:00:00.0000001"],
    [0.001, "0:00.000001"],
    [1e-7, "0:00.0000000001"],
    [0, "0:00"],
  ] as const)(
    "formats %d ms without inventing fractional precision",
    (input, output) => {
      expect(formatDuration(input)).toBe(output);
    },
  );

  it("keeps elapsed duration, seconds gaps and laps-down units distinct", () => {
    expect(formatRaceTime({ kind: "elapsed", milliseconds: 5_400_000 })).toBe(
      "1:30:00",
    );
    expect(formatRaceTime({ kind: "gap", milliseconds: 2150 })).toBe("+2.15 s");
    expect(formatRaceTime({ kind: "laps-down", laps: 1 })).toBe("+1 lap");
    expect(formatRaceTime({ kind: "laps-down", laps: 2 })).toBe("+2 laps");
  });

  it("uses source non-numeric classifications even without numeric positions", () => {
    expect(
      classificationText({
        position: { status: "not-applicable" },
        text: available("DSQ"),
      }),
    ).toBe("DSQ");
    expect(
      classificationText({
        position: { status: "missing" },
        text: available("No time"),
      }),
    ).toBe("No time");
    expect(
      classificationText({
        position: available(3),
        text: { status: "missing" },
      }),
    ).toBe("3");
  });

  it("retains date-only scheduling without manufacturing midnight or a timezone", () => {
    if (sampleRegularEvent.sessions.status !== "available")
      throw new Error("Expected fixture sessions");
    const session = sampleRegularEvent.sessions.value[0];
    if (!session) throw new Error("Expected fixture practice session");
    expect(sessionStartText(session)).toBe("2099-04-10 · time not reported");
    expect(
      sessionStartText({
        ...session,
        start: available({ precision: "instant", at: "2099-04-12T14:00:00Z" }),
      }),
    ).toBe("2099-04-12T14:00:00Z · UTC");
  });
});
