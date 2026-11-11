import { describe, expect, it } from "vitest";
import { createSessionId } from "@/types/f1-identifiers";
import {
  createTelemetryEntryId,
  createTelemetryLapId,
} from "@/types/telemetry-identifiers";
import {
  compareTelemetryLaps,
  enforceTelemetryPayloadBudget,
  normalizeTelemetrySamples,
  telemetrySerializedBytes,
} from "@/types/telemetry-validation";
import type {
  LapTelemetryRequest,
  TelemetryResult,
} from "@/types/telemetry-provider";
import {
  SYNTHETIC_TELEMETRY_LABEL,
  syntheticComparisonRequest,
  syntheticCompleteLap,
  syntheticDrivers,
  syntheticEntries,
  syntheticEvent,
  syntheticGapLap,
  syntheticInvalidBoundaryLap,
  syntheticMissingBoundaryLap,
  syntheticOtherCadenceLap,
  syntheticQualifyingSessionId,
  syntheticRaceSessionId,
  syntheticTelemetrySource,
  syntheticTimestamp,
  syntheticTimestampAnomalies,
} from "./fixtures";
import { createSyntheticTelemetryProvider } from "./fixture-provider";
import type { SyntheticTelemetryScenario } from "./fixture-provider";

const lapRequest: LapTelemetryRequest = {
  sessionId: syntheticComparisonRequest.sessionId,
  ...syntheticComparisonRequest.selections[0],
  channels: syntheticComparisonRequest.channels,
  window: syntheticComparisonRequest.window,
  maxSamplesPerLap: 600,
  alignment: "lap-elapsed-time",
};
function requireSuccess<T>(result: TelemetryResult<T>): T {
  expect(result.status).toBe("success");
  if (result.status !== "success") throw new Error("Expected fixture success.");
  return result.data;
}
describe("synthetic telemetry provider conformance", () => {
  it("discovers explicitly synthetic historical race and qualifying contexts", async () => {
    const provider = createSyntheticTelemetryProvider();
    const result = await provider.discover({ season: 2024 });
    const events = requireSuccess(result);
    expect(events).toEqual([syntheticEvent]);
    expect(events[0]?.sessions.map((session) => session.kind)).toEqual([
      "race",
      "qualifying",
    ]);
    expect(syntheticTelemetrySource.kind).toBe("synthetic");
    expect(syntheticTelemetrySource.name).toContain(SYNTHETIC_TELEMETRY_LABEL);
    expect(result).toMatchObject({
      version: 1,
      metadata: { source: { kind: "synthetic" }, finality: "unknown" },
    });
    expect(await provider.discover({ season: 2022 })).toMatchObject({
      status: "unavailable",
      reason: "before-coverage",
    });
    expect(await provider.discover({ season: 2025 })).toMatchObject({
      status: "unavailable",
      reason: "not-covered",
    });
  });
  it.each([syntheticRaceSessionId, syntheticQualifyingSessionId])(
    "resolves entries and multiple owned laps for %s",
    async (sessionId) => {
      const provider = createSyntheticTelemetryProvider();
      const entries = requireSuccess(await provider.getEntries({ sessionId }));
      expect(entries).toHaveLength(2);
      expect(entries[0]?.driver.id).not.toBe(entries[1]?.driver.id);
      for (const entry of entries) {
        const laps = requireSuccess(
          await provider.getLaps({ sessionId, entryId: entry.id }),
        );
        expect(laps.map((lap) => lap.lapNumber)).toEqual([10, 11]);
        expect(
          laps.every(
            (lap) => lap.entryId === entry.id && lap.sessionId === sessionId,
          ),
        ).toBe(true);
        const request = {
          ...lapRequest,
          sessionId,
          entryId: entry.id,
          lapId: createTelemetryLapId(entry.id, 11),
        };
        expect(
          requireSuccess(await provider.getLapTelemetry(request)).samples
            .length,
        ).toBeGreaterThan(0);
      }
    },
  );
  it("compares different cadences and keeps a scalar delta separate from distance", async () => {
    const result = await createSyntheticTelemetryProvider().compare(
      syntheticComparisonRequest,
    );
    const data = requireSuccess(result);
    expect(data.laps[0].samples.length).not.toBe(data.laps[1].samples.length);
    expect(data.lapDifferenceMilliseconds).toEqual({
      status: "available",
      value: 1200,
    });
    expect(data.alignment).toMatchObject({
      status: "available",
      method: "lap-elapsed-time",
      equalTrackPosition: false,
    });
    expect(data.continuousDistanceDelta).toEqual({
      status: "unavailable",
      reason: "validated-distance-alignment-required",
    });
    expect(enforceTelemetryPayloadBudget(result)).toBe(true);
    expect(telemetrySerializedBytes(result)).toBeLessThan(512 * 1024);
    expect(
      data.laps.every((lap) =>
        lap.samples.every((sample) => sample.origin === "synthetic"),
      ),
    ).toBe(true);
  });
  it("retains real zero, neutral, and brake-off independently of absent channels", async () => {
    const data = requireSuccess(
      await createSyntheticTelemetryProvider().getLapTelemetry(lapRequest),
    );
    expect(data.samples[0]?.values).toMatchObject({
      speed: { status: "available", value: 0 },
      gear: { status: "available", value: 0 },
      throttle: { status: "available", value: 0 },
    });
    expect(
      data.samples.some(
        (sample) =>
          sample.values.brake.status === "available" &&
          sample.values.brake.value === false,
      ),
    ).toBe(true);
    const partial = requireSuccess(
      await createSyntheticTelemetryProvider(
        "partial-channels",
      ).getLapTelemetry(lapRequest),
    );
    expect(partial.lap.coverage.channels.gear).toBe("unavailable");
    expect(
      partial.samples.every(
        (sample) => sample.values.gear.status === "missing",
      ),
    ).toBe(true);
    expect(partial.quality.warnings).toContain("unavailable-channel");
    expect(partial.quality.completeness).toBe("partial");
  });
  it("projects allowlisted channels and bounded windows without manufacturing samples", async () => {
    const result = await createSyntheticTelemetryProvider().getLapTelemetry({
      ...lapRequest,
      channels: ["speed"],
      window: { fromMilliseconds: 2000, toMilliseconds: 5000 },
    });
    const data = requireSuccess(result);
    expect(data.samples.map((sample) => sample.elapsedMilliseconds)).toEqual([
      2000, 3000, 4000, 5000,
    ]);
    expect(
      data.samples.every(
        (sample) =>
          sample.values.throttle.status === "missing" &&
          sample.values.throttle.reason === "not-requested",
      ),
    ).toBe(true);
    expect(data.quality.boundaryCoverage).toBe("partial");
    expect(data.quality.interpolation).toBe("none");
    expect(result).toMatchObject({ metadata: { completeness: "partial" } });
    expect(data.reduction).toMatchObject({ algorithm: "none", outputCount: 4 });
  });
  it("clips gaps to the requested window and channels", async () => {
    const data = requireSuccess(
      await createSyntheticTelemetryProvider("gaps").getLapTelemetry({
        ...lapRequest,
        channels: ["speed"],
        window: { fromMilliseconds: 2500, toMilliseconds: 6000 },
      }),
    );
    expect(data.quality.missingIntervals).toEqual([
      {
        startMilliseconds: 3000,
        endMilliseconds: 6000,
        channels: ["speed"],
        reason: "not-recorded",
      },
    ]);
    expect(data.quality.warnings).toContain("missing-interval");
    expect(data.quality.coverageFraction.status).toBe("missing");
    expect(data.quality.completeness).toBe("partial");
  });
  it("preserves gaps and degrades comparison alignment", async () => {
    const data = requireSuccess(
      await createSyntheticTelemetryProvider("gaps").compare(
        syntheticComparisonRequest,
      ),
    );
    expect(data.alignment.status).toBe("degraded");
    expect(
      data.laps.every((lap) => lap.quality.missingIntervals.length === 1),
    ).toBe(true);
    expect(syntheticGapLap.samples).toHaveLength(9);
  });
  it("exposes deterministic duplicate and source ordering diagnostics", async () => {
    const data = requireSuccess(
      await createSyntheticTelemetryProvider(
        "duplicate-timestamps",
      ).getLapTelemetry(lapRequest),
    );
    expect(data.quality.rejectedSamples).toEqual([
      { sourceIndex: 2, reason: "duplicate-timestamp" },
    ]);
    expect(data.quality.warnings).toEqual(
      expect.arrayContaining([
        "out-of-order",
        "duplicate-timestamp",
        "rejected-samples",
      ]),
    );
    expect(
      data.samples.slice(0, 2).map((sample) => sample.sourceIndex),
    ).toEqual([1, 0]);
    expect(data.samples[1]?.values.speed).toEqual({
      status: "available",
      value: 125,
    });
    expect(data.reduction.inputCount).toBe(data.reduction.outputCount + 1);
  });
  it("normalizes diagnostic invalid inputs offline and retains valid channels", () => {
    const result = normalizeTelemetrySamples(
      syntheticTimestampAnomalies.inputs,
      syntheticTimestamp(0),
      { fromMilliseconds: 0, toMilliseconds: 3000 },
    );
    expect(result.rejectedSamples).toEqual(
      expect.arrayContaining([
        { sourceIndex: 2, reason: "duplicate-timestamp" },
        { sourceIndex: 3, reason: "missing-timestamp" },
        { sourceIndex: 4, reason: "invalid-value", channel: "speed" },
      ]),
    );
    expect(result.samples.at(-1)?.values.speed).toEqual({
      status: "missing",
      reason: "invalid",
    });
    expect(result.samples.at(-1)?.values.brake).toEqual({
      status: "available",
      value: false,
    });
    expect(syntheticTimestampAnomalies.source.kind).toBe("synthetic");
  });
  it("keeps missing-boundary unavailable for elapsed-window retrieval", async () => {
    const scenario = "missing-boundary";
    const provider = createSyntheticTelemetryProvider(scenario);
    expect(await provider.getLapTelemetry(lapRequest)).toMatchObject({
      status: "unavailable",
      reason: "missing-boundary",
    });
    expect(await provider.compare(syntheticComparisonRequest)).toMatchObject({
      status: "unavailable",
      reason: "missing-boundary",
    });
  });
  it("retains usable bounded samples when only the end boundary is invalid", async () => {
    const provider = createSyntheticTelemetryProvider("invalid-boundary");
    const lap = requireSuccess(await provider.getLapTelemetry(lapRequest));
    expect(lap.samples.length).toBeGreaterThan(0);
    expect(lap.quality.completeness).toBe("partial");
    expect(lap.quality.coverageFraction.status).toBe("missing");
    expect(lap.quality.coverageMethod).toBe("unknown");
    const comparison = requireSuccess(
      await provider.compare(syntheticComparisonRequest),
    );
    expect(comparison.laps.every((series) => series.samples.length > 0)).toBe(
      true,
    );
    expect(comparison.alignment).toEqual({
      status: "unavailable",
      method: "none",
      reason: "invalid-boundary",
    });
  });
  it("retains independent raw timestamp samples when direct boundary fixtures lack alignment", () => {
    expect(
      syntheticMissingBoundaryLap.samples.every(
        (sample) => sample.elapsedMilliseconds === null,
      ),
    ).toBe(true);
    expect(
      compareTelemetryLaps(
        syntheticMissingBoundaryLap,
        syntheticOtherCadenceLap,
      ).alignment,
    ).toMatchObject({ status: "unavailable", reason: "missing-boundary" });
    expect(
      compareTelemetryLaps(
        syntheticInvalidBoundaryLap,
        syntheticOtherCadenceLap,
      ).alignment,
    ).toMatchObject({ status: "unavailable", reason: "invalid-boundary" });
    expect(
      compareTelemetryLaps(syntheticCompleteLap, syntheticOtherCadenceLap)
        .continuousDistanceDelta.status,
    ).toBe("unavailable");
  });
  it.each([
    ["ambiguous-driver", "mapping-ambiguous"],
    ["unmapped-driver", "mapping-unmapped"],
  ] as const)(
    "does not join %s using racing numbers",
    async (scenario, reason) => {
      const provider = createSyntheticTelemetryProvider(scenario);
      const entries = requireSuccess(
        await provider.getEntries({ sessionId: syntheticRaceSessionId }),
      );
      expect(
        entries.every((entry) => entry.mapping.status !== "verified"),
      ).toBe(true);
      expect(
        await provider.getLaps({
          sessionId: syntheticRaceSessionId,
          entryId: entries[0]?.id ?? lapRequest.entryId,
        }),
      ).toMatchObject({ status: "unavailable", reason });
      expect(await provider.compare(syntheticComparisonRequest)).toMatchObject({
        status: "unavailable",
        reason,
      });
    },
  );
  it("exposes ambiguous session mapping without selecting a provider key", async () => {
    const provider = createSyntheticTelemetryProvider("ambiguous-session");
    const events = requireSuccess(await provider.discover({ season: 2024 }));
    expect(
      events[0]?.sessions.every(
        (session) => session.mapping.status === "ambiguous",
      ),
    ).toBe(true);
    expect(
      await provider.getEntries({ sessionId: syntheticRaceSessionId }),
    ).toMatchObject({ status: "unavailable", reason: "mapping-ambiguous" });
  });
  it.each([
    ["timeout", "timeout"],
    ["rate-limited", "rate-limited"],
    ["upstream-error", "temporarily-unavailable"],
  ] as const)(
    "returns sanitized %s with fixed metadata",
    async (scenario, code) => {
      const provider = createSyntheticTelemetryProvider(scenario);
      const result = await provider.compare(syntheticComparisonRequest);
      expect(result).toMatchObject({
        status: "error",
        error: { code, retryable: true },
        metadata: {
          source: { kind: "synthetic" },
          attemptedAt: "2024-03-03T00:00:00Z",
        },
      });
      if (scenario === "rate-limited")
        expect(result).toMatchObject({
          error: { retryAt: "2024-03-03T00:01:00Z" },
        });
      expect(
        await provider.compare({
          ...syntheticComparisonRequest,
          maxSamplesPerLap: 0,
        }),
      ).toMatchObject({ status: "error", error: { code: "invalid-request" } });
    },
  );
  it("distinguishes confirmed empty, unavailable membership and invalid requests", async () => {
    expect(
      await createSyntheticTelemetryProvider("empty").compare(
        syntheticComparisonRequest,
      ),
    ).toMatchObject({ status: "empty", reason: "no-entries" });
    const provider = createSyntheticTelemetryProvider();
    const unknownEntry = createTelemetryEntryId(
      syntheticRaceSessionId,
      "driver:synthetic-unknown",
    );
    expect(
      await provider.getLaps({
        sessionId: syntheticRaceSessionId,
        entryId: unknownEntry,
      }),
    ).toMatchObject({ status: "unavailable", reason: "unknown-entry" });
    const emptyProvider = createSyntheticTelemetryProvider("empty");
    expect(
      await emptyProvider.getLapTelemetry({
        ...lapRequest,
        entryId: unknownEntry,
        lapId: createTelemetryLapId(unknownEntry, 10),
      }),
    ).toMatchObject({ status: "unavailable", reason: "unknown-entry" });
    expect(
      await emptyProvider.getLapTelemetry({
        ...lapRequest,
        lapId: createTelemetryLapId(lapRequest.entryId, 99),
      }),
    ).toMatchObject({ status: "unavailable", reason: "unknown-lap" });
    expect(
      await emptyProvider.compare({
        ...syntheticComparisonRequest,
        selections: [
          syntheticComparisonRequest.selections[0],
          {
            entryId: unknownEntry,
            lapId: createTelemetryLapId(unknownEntry, 10),
          },
        ],
      }),
    ).toMatchObject({ status: "unavailable", reason: "unknown-entry" });
    expect(
      await provider.getLapTelemetry({
        ...lapRequest,
        lapId: createTelemetryLapId(lapRequest.entryId, 99),
      }),
    ).toMatchObject({ status: "unavailable", reason: "unknown-lap" });
    expect(
      await provider.getEntries({
        sessionId: createSessionId(syntheticEvent.id, "practice-1"),
      }),
    ).toMatchObject({ status: "unavailable", reason: "unknown-session" });
    expect(
      await provider.getLaps({
        sessionId: syntheticQualifyingSessionId,
        entryId: lapRequest.entryId,
      }),
    ).toMatchObject({ status: "error", error: { code: "invalid-request" } });
    expect(
      await provider.compare({
        ...syntheticComparisonRequest,
        selections: [
          syntheticComparisonRequest.selections[0],
          syntheticComparisonRequest.selections[0],
        ],
      }),
    ).toMatchObject({ status: "error", error: { code: "invalid-request" } });
  });
  it("rejects insufficient display budgets instead of truncating transitions", async () => {
    expect(
      await createSyntheticTelemetryProvider().compare({
        ...syntheticComparisonRequest,
        maxSamplesPerLap: 2,
      }),
    ).toMatchObject({ status: "unavailable", reason: "budget-exceeded" });
  });
  it("is deterministic and keeps stable driver identity across session entries", async () => {
    const a = await createSyntheticTelemetryProvider().compare(
      syntheticComparisonRequest,
    );
    const b = await createSyntheticTelemetryProvider().compare(
      syntheticComparisonRequest,
    );
    expect(a).toEqual(b);
    const raceEntries = syntheticEntries(syntheticRaceSessionId);
    const qualifyingEntries = syntheticEntries(syntheticQualifyingSessionId);
    expect(raceEntries[0].driver.id).toBe(qualifyingEntries[0].driver.id);
    expect(raceEntries[0].id).not.toBe(qualifyingEntries[0].id);
    expect(raceEntries[0].driver).toEqual(syntheticDrivers[0]);
  });
  it.each([
    "complete",
    "gaps",
    "partial-channels",
    "duplicate-timestamps",
    "missing-boundary",
    "invalid-boundary",
    "ambiguous-driver",
    "ambiguous-session",
    "unmapped-driver",
    "timeout",
    "rate-limited",
    "upstream-error",
    "empty",
  ] satisfies readonly SyntheticTelemetryScenario[])(
    "serializes the %s provider outcome within budget",
    async (scenario) => {
      const result = await createSyntheticTelemetryProvider(scenario).compare(
        syntheticComparisonRequest,
      );
      expect(enforceTelemetryPayloadBudget(result)).toBe(true);
      expect(JSON.parse(JSON.stringify(result))).toEqual(result);
    },
  );
});

describe("empty fixture membership and payload independence", () => {
  it("keeps known empty outcomes with the minimum valid display budget", async () => {
    const provider = createSyntheticTelemetryProvider("empty");
    expect(
      await provider.getLapTelemetry({ ...lapRequest, maxSamplesPerLap: 2 }),
    ).toMatchObject({ status: "empty", reason: "no-entries" });
    expect(
      await provider.compare({
        ...syntheticComparisonRequest,
        maxSamplesPerLap: 2,
      }),
    ).toMatchObject({ status: "empty", reason: "no-entries" });
    const second = syntheticComparisonRequest.selections[1];
    expect(
      await provider.compare({
        ...syntheticComparisonRequest,
        maxSamplesPerLap: 2,
        selections: [
          syntheticComparisonRequest.selections[0],
          { ...second, lapId: createTelemetryLapId(second.entryId, 99) },
        ],
      }),
    ).toMatchObject({ status: "unavailable", reason: "unknown-lap" });
    const unknown = createTelemetryEntryId(
      syntheticRaceSessionId,
      "driver:synthetic-unknown",
    );
    expect(
      await provider.compare({
        ...syntheticComparisonRequest,
        maxSamplesPerLap: 2,
        selections: [
          syntheticComparisonRequest.selections[0],
          { entryId: unknown, lapId: createTelemetryLapId(unknown, 10) },
        ],
      }),
    ).toMatchObject({ status: "unavailable", reason: "unknown-entry" });
  });
});
