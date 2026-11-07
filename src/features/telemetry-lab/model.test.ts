import { describe, expect, it } from "vitest";
import {
  INITIAL_SELECTION,
  channelValue,
  comparisonState,
  createSyntheticLap,
  selectionReducer,
} from "./model";

describe("telemetry prototype selection", () => {
  it("changes driver and resets only that driver's lap to an available choice", () => {
    const changed = selectionReducer(INITIAL_SELECTION, {
      type: "driver",
      slot: "A",
      value: "mercer",
    });
    expect(changed).toMatchObject({
      driverA: "mercer",
      lapA: 8,
      driverB: "sato",
      lapB: 18,
    });
    expect(createSyntheticLap(changed, "A").durationMs).not.toBe(
      createSyntheticLap(INITIAL_SELECTION, "A").durationMs,
    );
  });

  it("rejects a duplicate driver or a lap unavailable to the selected driver", () => {
    expect(
      selectionReducer(INITIAL_SELECTION, {
        type: "driver",
        slot: "A",
        value: "sato",
      }),
    ).toEqual(INITIAL_SELECTION);
    expect(
      selectionReducer(INITIAL_SELECTION, {
        type: "lap",
        slot: "B",
        value: 12,
      }),
    ).toEqual(INITIAL_SELECTION);
  });

  it("updates the chosen lap's signals and preserves the other comparison slot", () => {
    const changed = selectionReducer(INITIAL_SELECTION, {
      type: "lap",
      slot: "B",
      value: 19,
    });
    expect(createSyntheticLap(changed, "B")).not.toEqual(
      createSyntheticLap(INITIAL_SELECTION, "B"),
    );
    expect(createSyntheticLap(changed, "A")).toEqual(
      createSyntheticLap(INITIAL_SELECTION, "A"),
    );
  });

  it("keeps race unavailable when Ready is selected and resets manual previews on context changes", () => {
    const race = selectionReducer(INITIAL_SELECTION, {
      type: "session",
      value: "race",
    });
    expect(comparisonState(race)).toBe("unavailable");
    expect(
      comparisonState(
        selectionReducer(race, { type: "preview", value: "ready" }),
      ),
    ).toBe("unavailable");
    for (const value of ["loading", "error", "unavailable"] as const) {
      const preview = selectionReducer(INITIAL_SELECTION, {
        type: "preview",
        value,
      });
      expect(comparisonState(preview)).toBe(value);
      expect(
        comparisonState(
          selectionReducer(preview, { type: "event", value: "monza-2023" }),
        ),
      ).toBe("ready");
    }
    expect(selectionReducer(race, { type: "reset" })).toEqual(
      INITIAL_SELECTION,
    );
  });
});

describe("synthetic telemetry integrity", () => {
  it("generates repeatable samples, ordered elapsed timestamps and consistent sector totals", () => {
    const lap = createSyntheticLap(INITIAL_SELECTION, "A");
    expect(lap).toEqual(createSyntheticLap(INITIAL_SELECTION, "A"));
    expect(lap.sectorsMs.reduce((total, sector) => total + sector, 0)).toBe(
      lap.durationMs,
    );
    expect(lap.samples[0]?.elapsedMs).toBe(0);
    expect(lap.samples.at(-1)?.elapsedMs).toBe(lap.durationMs);
    expect(
      lap.samples.every(
        (sample, index) =>
          index === 0 ||
          sample.elapsedMs > (lap.samples[index - 1]?.elapsedMs ?? -1),
      ),
    ).toBe(true);
  });

  it("preserves missing data separately from observed off/zero values", () => {
    const lap = createSyntheticLap(INITIAL_SELECTION, "B");
    expect(lap.samples.some((sample) => sample.speed === null)).toBe(true);
    expect(lap.samples.some((sample) => sample.brake === 0)).toBe(true);
    expect(channelValue(null, "brake")).toBe("Unavailable");
    expect(channelValue(0, "brake")).toBe("Off");
    const practice = createSyntheticLap(
      { ...INITIAL_SELECTION, sessionId: "practice" },
      "B",
    );
    expect(
      practice.samples.filter((sample) => sample.speed === null).length,
    ).toBeGreaterThan(
      lap.samples.filter((sample) => sample.speed === null).length,
    );
  });
});
