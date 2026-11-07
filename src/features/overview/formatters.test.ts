import { describe, expect, it } from "vitest";
import { available } from "@/data/fixtures/f1";
import { fieldText, raceTimeText, sessionStartText } from "./formatters";

describe("Overview data presentation", () => {
  it("distinguishes an actual zero from missing, unpublished and inapplicable data", () => {
    expect(fieldText(available(0))).toBe("0");
    expect(fieldText({ status: "missing" })).toBe("Not reported");
    expect(fieldText({ status: "unavailable", reason: "not-published" })).toBe(
      "Not published",
    );
    expect(fieldText({ status: "not-applicable" })).toBe("Not applicable");
  });

  it("preserves duration and lap units without inventing additional precision", () => {
    expect(raceTimeText({ kind: "elapsed", milliseconds: 5_400_000 })).toBe(
      "1:30:00",
    );
    expect(raceTimeText({ kind: "elapsed", milliseconds: 90_123.5 })).toBe(
      "1:30.1235",
    );
    expect(raceTimeText({ kind: "gap", milliseconds: 2_150 })).toBe("+2.15 s");
    expect(raceTimeText({ kind: "laps-down", laps: 1 })).toBe("+1 lap");
  });

  it("keeps a date-only session useful without manufacturing a start time", () => {
    expect(sessionStartText({ precision: "date", date: "2099-04-26" })).toMatch(
      /26 Apr 2099.*time not reported/,
    );
    expect(
      sessionStartText({ precision: "instant", at: "2099-04-12T14:00:00Z" }),
    ).toMatch(/12 Apr 2099.*14:00 UTC/);
  });
});
