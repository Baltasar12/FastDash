import { describe, expect, it } from "vitest";
import { parseRaceCenterSelection } from "./selection";

describe("Race Center URL selection", () => {
  it("accepts a main-race, qualifying or reported sprint-kind selection", () => {
    expect(
      parseRaceCenterSelection({
        season: "2099",
        round: "2",
        session: "sprint-qualifying",
      }),
    ).toEqual({ season: 2099, round: 2, session: "sprint-qualifying" });
    expect(parseRaceCenterSelection({})).toEqual({});
  });

  it.each([
    { season: "2099.5" },
    { season: "1949" },
    { season: "1e3" },
    { round: "0" },
    { round: "-1" },
    { round: "NaN" },
    { season: ["2098", "2099"] },
    { session: "sprint-shootout" },
    { session: ["race", "qualifying"] },
  ])("rejects invalid or ambiguous query values: %o", (params) => {
    expect(parseRaceCenterSelection(params).invalid).toBe(true);
  });

  it("ignores unrelated host-page query parameters", () => {
    expect(
      parseRaceCenterSelection({
        scenario: "stale",
        host: "preview",
        season: "2099",
      }),
    ).toEqual({ season: 2099 });
  });
});
