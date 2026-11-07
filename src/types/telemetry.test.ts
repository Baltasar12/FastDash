import { Buffer } from "node:buffer";
import { describe, expect, expectTypeOf, it } from "vitest";
import type { DriverId } from "@/types/f1";
import { createEventId, createSessionId } from "@/types/f1-identifiers";
import type {
  ChannelValues,
  IdentityMapping,
  LapTelemetry,
  OpenF1EntryReference,
  SourceTimestamp,
  TelemetrySample,
} from "@/types/telemetry";
import { TELEMETRY_CHANNELS } from "@/types/telemetry";
import type {
  LapTelemetryRequest,
  TelemetryComparisonRequest,
  TelemetryResult,
} from "@/types/telemetry-provider";
import {
  createTelemetryEntryId,
  createTelemetryLapId,
  resolveTelemetryMapping,
  validateTelemetryEntryId,
  validateTelemetryLapId,
  validateTelemetrySessionId,
} from "@/types/telemetry-identifiers";
import {
  TELEMETRY_LIMITS,
  compareTelemetryLaps,
  enforceTelemetryPayloadBudget,
  normalizeBrakeSignal,
  normalizeNumericChannel,
  normalizeTelemetrySamples,
  parseTelemetryTimestamp,
  reportedSeconds,
  telemetryMappingIssue,
  telemetryOffsetMilliseconds,
  telemetrySerializedBytes,
} from "@/types/telemetry-validation";
import type { TelemetrySampleInput } from "@/types/telemetry-validation";
import { validateTelemetryRequest } from "@/types/telemetry-validation";

const sessionId = createSessionId(createEventId(2024, 1), "race");
const entryA = createTelemetryEntryId(sessionId, "driver:synthetic:alpha");
const entryB = createTelemetryEntryId(sessionId, "driver:synthetic:beta");
const lapA = createTelemetryLapId(entryA, 1);
const lapB = createTelemetryLapId(entryB, 2);
const request: LapTelemetryRequest = {
  sessionId,
  entryId: entryA,
  lapId: lapA,
  channels: TELEMETRY_CHANNELS,
  window: { fromMilliseconds: 0, toMilliseconds: 600_000 },
  maxSamplesPerLap: 600,
  alignment: "lap-elapsed-time",
};
const comparisonRequest: TelemetryComparisonRequest = {
  sessionId,
  channels: TELEMETRY_CHANNELS,
  window: request.window,
  maxSamplesPerLap: 600,
  alignment: "lap-elapsed-time",
  selections: [
    { entryId: entryA, lapId: lapA },
    { entryId: entryB, lapId: lapB },
  ],
};
function timestamp(original: string): SourceTimestamp {
  const result = parseTelemetryTimestamp(original);
  if (!result) throw new Error("Invalid test timestamp.");
  return result;
}
const origin = timestamp("2024-03-02T12:00:00.000000Z");
function input(at: unknown, speed: unknown = 0): TelemetrySampleInput {
  return {
    timestamp: at,
    origin: "synthetic",
    values: { speed, throttle: 0, brake: false, gear: 0 },
  };
}
function samples(): readonly TelemetrySample[] {
  return normalizeTelemetrySamples(
    [
      input("2024-03-02T12:00:00.000000Z"),
      input("2024-03-02T12:00:01.000000Z", 200),
      input("2024-03-02T12:00:02.000000Z", 300),
    ],
    origin,
    request.window,
  ).samples;
}
function series(slot: "A" | "B", seconds: number): LapTelemetry {
  const entryId = slot === "A" ? entryA : entryB;
  return {
    lap: {
      id: createTelemetryLapId(entryId, 1),
      sessionId,
      entryId,
      lapNumber: 1,
      qualifyingStage: { status: "not-applicable" },
      duration: {
        status: "available",
        value: reportedSeconds(seconds, 0.001, "synthetic"),
      },
      sectors: [],
      start: {
        timestamp: { status: "available", value: origin },
        method: "synthetic",
        uncertaintyMilliseconds: { status: "available", value: 0 },
      },
      end: {
        timestamp: {
          status: "available",
          value: timestamp("2024-03-02T12:01:30.000000Z"),
        },
        method: "synthetic",
        uncertaintyMilliseconds: { status: "available", value: 0 },
      },
      pitOut: { status: "missing" },
      pitIn: { status: "missing" },
      validity: "valid",
      coverage: {
        status: "available",
        channels: {
          speed: "available",
          throttle: "available",
          brake: "available",
          gear: "available",
        },
      },
    },
    channels: {
      speed: {
        unit: "km/h",
        semantics: "speed",
        resolution: { status: "missing" },
        measurementAccuracy: { status: "missing" },
      },
      throttle: {
        unit: "percent",
        semantics: "maximum-engine-power-percent",
        resolution: { status: "missing" },
        measurementAccuracy: { status: "missing" },
      },
      brake: {
        unit: "boolean",
        semantics: "brake-engaged",
        resolution: { status: "not-applicable" },
        measurementAccuracy: { status: "missing" },
      },
      gear: {
        unit: "integer",
        semantics: "gear-neutral-zero",
        resolution: { status: "available", value: 1 },
        measurementAccuracy: { status: "missing" },
      },
    },
    samples: samples(),
    quality: {
      completeness: "complete",
      sourceFinality: "unknown",
      boundaryCoverage: "complete",
      missingIntervals: [],
      rejectedSamples: [],
      warnings: [],
      timestampUncertaintyMilliseconds: { status: "available", value: 0 },
      observedCadenceMilliseconds: { status: "available", value: 1000 },
      maximumGapMilliseconds: { status: "available", value: 1000 },
      coverageFraction: { status: "missing" },
      coverageMethod: "unknown",
      interpolation: "none",
    },
    reduction: {
      algorithm: "none",
      inputCount: 3,
      outputCount: 3,
      budget: 600,
      retained: [],
    },
  };
}

describe("telemetry identity and result contracts", () => {
  it("keeps global person identity separate from session participation and positive lap identity", () => {
    const qualifying = createSessionId(createEventId(2024, 1), "qualifying");
    expect(
      createTelemetryEntryId(qualifying, "driver:synthetic:alpha"),
    ).not.toBe(entryA);
    expect(validateTelemetrySessionId(sessionId)).toBe(sessionId);
    expect(validateTelemetryEntryId(entryA, sessionId)).toBe(entryA);
    expect(validateTelemetryLapId(lapA, entryA)).toBe(lapA);
    expect(() => validateTelemetryEntryId(entryA, qualifying)).toThrow();
    expect(() => validateTelemetryLapId(lapA, entryB)).toThrow();
    for (const number of [
      0,
      -1,
      0.5,
      NaN,
      Infinity,
      Number.MAX_SAFE_INTEGER + 1,
    ]) {
      expect(() => createTelemetryLapId(entryA, number)).toThrow();
    }
    for (const forged of [
      "f1:2024:01:race",
      "f1:2024:1:latest",
      "9158",
      "f1:1949:1:race",
    ]) {
      expect(() => validateTelemetrySessionId(forged)).toThrow();
    }
    expect(() =>
      validateTelemetryEntryId(sessionId + ":entry:44", sessionId),
    ).toThrow();
    expect(() =>
      validateTelemetryEntryId(
        sessionId + ":entry:driver%3asynthetic%3aalpha",
        sessionId,
      ),
    ).toThrow();
    expect(() =>
      validateTelemetryEntryId(sessionId + ":entry:%", sessionId),
    ).toThrow();
    expect(() => validateTelemetryLapId(entryA + ":lap:01", entryA)).toThrow();
  });

  it("resolves only verified mappings and exposes ambiguous versus absent mappings independently", () => {
    const reference: OpenF1EntryReference = {
      provider: "openf1",
      meetingKey: 9001,
      sessionKey: 9002,
      driverNumber: 44,
    };
    const provenance = {
      revision: "synthetic-v1",
      method: "synthetic",
      evidence: ["invented"],
    } as const;
    const verified: IdentityMapping<DriverId, OpenF1EntryReference> = {
      status: "verified",
      canonicalId: "driver:synthetic:alpha",
      reference,
      provenance,
    };
    const ambiguous: IdentityMapping<DriverId, OpenF1EntryReference> = {
      status: "ambiguous",
      candidates: ["driver:synthetic:alpha", "driver:synthetic:beta"],
      reference,
      provenance,
    };
    const unmapped: IdentityMapping<DriverId, OpenF1EntryReference> = {
      status: "unmapped",
      reference,
      provenance,
    };
    expect(resolveTelemetryMapping(verified)).toEqual({
      status: "available",
      value: "driver:synthetic:alpha",
    });
    expect(resolveTelemetryMapping(ambiguous).status).toBe("missing");
    expect(resolveTelemetryMapping(unmapped).status).toBe("missing");
    expect(telemetryMappingIssue(verified)).toBeNull();
    expect(telemetryMappingIssue(ambiguous)).toBe("mapping-ambiguous");
    expect(telemetryMappingIssue(unmapped)).toBe("mapping-unmapped");
  });

  it("retains readonly samples and supports exhaustive consumer narrowing", () => {
    expectTypeOf<TelemetrySample["values"]>().toEqualTypeOf<
      Readonly<ChannelValues>
    >();
    expectTypeOf<LapTelemetry["samples"]>().toEqualTypeOf<
      readonly TelemetrySample[]
    >();
    function narrow(result: TelemetryResult<number>): string {
      switch (result.status) {
        case "success":
          return String(result.data);
        case "empty":
          return result.reason;
        case "unavailable":
          return result.reason;
        case "error":
          return result.error.code;
        default:
          expectTypeOf(result).toBeNever();
          return "unreachable";
      }
    }
    expectTypeOf(narrow).returns.toBeString();
  });
});

describe("telemetry request bounds", () => {
  it("accepts bounded operations, including pre-2023 discovery for an unavailable result", () => {
    expect(validateTelemetryRequest("discover", { season: 2022 })).toEqual([]);
    expect(validateTelemetryRequest("entries", { sessionId })).toEqual([]);
    expect(
      validateTelemetryRequest("laps", { sessionId, entryId: entryA }),
    ).toEqual([]);
    expect(validateTelemetryRequest("telemetry", request)).toEqual([]);
    expect(validateTelemetryRequest("compare", comparisonRequest)).toEqual([]);
  });
  it("rejects unknown fields, inherited inputs and unbounded or provider-owned selectors", () => {
    for (const invalid of [null, [], "latest", new Date(0)]) {
      expect(validateTelemetryRequest("discover", invalid)).not.toEqual([]);
    }
    expect(
      validateTelemetryRequest("discover", {
        season: 2024,
        url: "https://example.invalid",
      }),
    ).toContain("invalid-fields");
    expect(
      validateTelemetryRequest("discover", Object.create({ season: 2024 })),
    ).not.toEqual([]);
    expect(
      validateTelemetryRequest("entries", { sessionId: "latest" }),
    ).toContain("invalid-identity");
    expect(
      validateTelemetryRequest("telemetry", { ...request, entryId: entryB }),
    ).toContain("invalid-identity");
    expect(
      validateTelemetryRequest("compare", {
        ...comparisonRequest,
        selections: [
          comparisonRequest.selections[0],
          comparisonRequest.selections[0],
        ],
      }),
    ).toContain("distinct-entries-required");
    expect(
      validateTelemetryRequest("compare", {
        ...comparisonRequest,
        selections: [
          ...comparisonRequest.selections,
          comparisonRequest.selections[0],
        ],
      }),
    ).toContain("invalid-identity");
  });
  it.each([
    { channels: [] },
    { channels: ["speed", "speed"] },
    { channels: ["location"] },
    { channels: ["speed", "throttle", "brake", "gear", "rpm"] },
  ])("rejects channel selection %j", ({ channels }) => {
    expect(
      validateTelemetryRequest("telemetry", { ...request, channels }),
    ).toContain("invalid-channels");
  });
  it.each([1, 601, 2.5, NaN, Infinity])(
    "rejects sample budget %s",
    (maxSamplesPerLap) => {
      expect(
        validateTelemetryRequest("telemetry", { ...request, maxSamplesPerLap }),
      ).toContain("invalid-sample-budget");
    },
  );
  it.each([
    { fromMilliseconds: -1, toMilliseconds: 100 },
    { fromMilliseconds: 10, toMilliseconds: 10 },
    { fromMilliseconds: 10, toMilliseconds: 9 },
    { fromMilliseconds: 0, toMilliseconds: 600001 },
    { fromMilliseconds: 0, toMilliseconds: Infinity },
    { fromMilliseconds: NaN, toMilliseconds: 100 },
  ])("rejects invalid elapsed window %j", (window) => {
    expect(
      validateTelemetryRequest("telemetry", { ...request, window }),
    ).toContain("invalid-window");
  });
  it("requires elapsed-time alignment and exact window field set", () => {
    expect(
      validateTelemetryRequest("telemetry", {
        ...request,
        alignment: "track-distance",
      }),
    ).toContain("unsupported-alignment");
    expect(
      validateTelemetryRequest("telemetry", {
        ...request,
        window: { ...request.window, date: "2024" },
      }),
    ).toContain("invalid-window");
  });
});

describe("timestamps, units and missing values", () => {
  it("preserves source timestamp precision independently from submillisecond offsets", () => {
    const source = timestamp("2024-03-02T12:00:00.123456789+00:00");
    expect(source).toEqual({
      original: "2024-03-02T12:00:00.123456789+00:00",
      fractionalSecondDigits: 9,
    });
    expect(
      telemetryOffsetMilliseconds(
        source,
        timestamp("2024-03-02T12:00:00.123456000Z"),
      ),
    ).toBeCloseTo(0.000789, 9);
    expect(
      telemetryOffsetMilliseconds(origin, timestamp("2024-03-02T12:00:01Z")),
    ).toBe(-1000);
    expect(() =>
      telemetryOffsetMilliseconds(
        { ...source, fractionalSecondDigits: 3 },
        origin,
      ),
    ).toThrow();
  });
  it.each([
    null,
    undefined,
    "",
    "2024-02-30T00:00:00Z",
    "2023-02-29T00:00:00Z",
    "2024-03-02",
    "2024-03-02T12:00:00",
    "2024-03-02T12:00:00+01:00",
    "2024-03-02T12:00:00.1234567890Z",
    "2024-03-02T24:00:00Z",
  ])("rejects absent or invalid source timestamp %s", (value) => {
    expect(parseTelemetryTimestamp(value)).toBeNull();
  });
  it("converts reported seconds while retaining genuine resolution and unknown precision", () => {
    expect(reportedSeconds(91.743, 0.001)).toEqual({
      milliseconds: 91743,
      sourceSeconds: 91.743,
      resolutionMilliseconds: { status: "available", value: 1 },
      origin: "reported",
    });
    expect(reportedSeconds(2, null).resolutionMilliseconds).toEqual({
      status: "missing",
    });
    for (const value of [NaN, Infinity, -1, Number.MAX_VALUE])
      expect(() => reportedSeconds(value, 0.001)).toThrow();
    for (const resolution of [0, -1, NaN, Infinity])
      expect(() => reportedSeconds(1, resolution)).toThrow();
  });
  it("preserves recorded zero, neutral and brake off without filling missing data", () => {
    expect(normalizeNumericChannel("speed", 0)).toEqual({
      status: "available",
      value: 0,
    });
    expect(normalizeNumericChannel("throttle", 0)).toEqual({
      status: "available",
      value: 0,
    });
    expect(normalizeNumericChannel("gear", 0)).toEqual({
      status: "available",
      value: 0,
    });
    expect(normalizeBrakeSignal(0)).toEqual({
      status: "available",
      value: false,
    });
    expect(normalizeBrakeSignal(100)).toEqual({
      status: "available",
      value: true,
    });
    expect(normalizeBrakeSignal(null)).toEqual({
      status: "missing",
      reason: "source-missing",
    });
    expect(normalizeNumericChannel("speed", undefined)).toEqual({
      status: "missing",
      reason: "source-missing",
    });
  });
  it("rejects non-finite, out-of-range and coercible values", () => {
    for (const value of [NaN, Infinity, -Infinity, -1, "0", true]) {
      expect(normalizeNumericChannel("speed", value)).toEqual({
        status: "missing",
        reason: "invalid",
      });
    }
    expect(normalizeNumericChannel("throttle", 101).status).toBe("missing");
    expect(normalizeNumericChannel("gear", 1.5).status).toBe("missing");
    expect(normalizeNumericChannel("gear", 9).status).toBe("missing");
    for (const value of [1, 50, "100", NaN])
      expect(normalizeBrakeSignal(value)).toEqual({
        status: "missing",
        reason: "invalid",
      });
  });
});

describe("sample normalization integrity", () => {
  it("sorts different cadences, retains source order and rejects exact-instant duplicates without merging values", () => {
    const normalized = normalizeTelemetrySamples(
      [
        input("2024-03-02T12:00:01.000000Z", 210),
        input("2024-03-02T12:00:00.000000Z", 0),
        input("2024-03-02T12:00:01+00:00", 999),
        input("2024-03-02T12:00:01.300001Z", 220),
      ],
      origin,
      request.window,
    );
    expect(normalized.samples.map((row) => row.sourceIndex)).toEqual([1, 0, 3]);
    expect(normalized.samples.map((row) => row.elapsedMilliseconds)).toEqual([
      0, 1000, 1300.001,
    ]);
    expect(normalized.samples[1]?.values.speed).toEqual({
      status: "available",
      value: 210,
    });
    expect(normalized.rejectedSamples).toContainEqual({
      sourceIndex: 2,
      reason: "duplicate-timestamp",
    });
    expect(normalized.warnings).toEqual(
      expect.arrayContaining([
        "out-of-order",
        "duplicate-timestamp",
        "rejected-samples",
      ]),
    );
  });
  it("quarantines missing timestamps and invalid channel values while retaining other recorded channels", () => {
    const normalized = normalizeTelemetrySamples(
      [
        input(null),
        input("bad"),
        {
          timestamp: "2024-03-02T12:00:01Z",
          origin: "synthetic",
          values: { speed: Infinity, throttle: 0, brake: false, gear: null },
        },
      ],
      origin,
      request.window,
    );
    expect(normalized.samples).toHaveLength(1);
    expect(normalized.samples[0]?.values).toEqual({
      speed: { status: "missing", reason: "invalid" },
      throttle: { status: "available", value: 0 },
      brake: { status: "available", value: false },
      gear: { status: "missing", reason: "source-missing" },
    });
    expect(normalized.rejectedSamples).toEqual([
      { sourceIndex: 0, reason: "missing-timestamp" },
      { sourceIndex: 1, reason: "invalid-timestamp" },
      { sourceIndex: 2, reason: "invalid-value", channel: "speed" },
    ]);
  });
  it("keeps inclusive window endpoints, rejects outside rows and never invents a missing origin", () => {
    const data = [
      input("2024-03-02T12:00:00Z"),
      input("2024-03-02T12:00:01Z"),
      input("2024-03-02T12:00:02Z"),
    ];
    const normalized = normalizeTelemetrySamples(data, origin, {
      fromMilliseconds: 0,
      toMilliseconds: 1000,
    });
    expect(normalized.samples.map((row) => row.elapsedMilliseconds)).toEqual([
      0, 1000,
    ]);
    expect(normalized.rejectedSamples).toContainEqual({
      sourceIndex: 2,
      reason: "outside-window",
    });
    expect(
      normalizeTelemetrySamples(data, null, request.window).samples.every(
        (row) => row.elapsedMilliseconds === null,
      ),
    ).toBe(true);
    expect(() =>
      normalizeTelemetrySamples(
        Array.from(
          { length: TELEMETRY_LIMITS.sourceSamplesPerLap + 1 },
          () => data[0] ?? input(null),
        ),
        origin,
        request.window,
      ),
    ).toThrow("Source sample budget");
  });
});

describe("comparison meaning and payload bounds", () => {
  it("computes signed whole-lap B minus A without enabling continuous distance delta", () => {
    const result = compareTelemetryLaps(series("A", 90), series("B", 91));
    expect(result.lapDifferenceMilliseconds).toEqual({
      status: "available",
      value: 1000,
    });
    expect(
      compareTelemetryLaps(series("A", 91), series("B", 90))
        .lapDifferenceMilliseconds,
    ).toEqual({ status: "available", value: -1000 });
    expect(result.alignment).toMatchObject({
      status: "available",
      method: "lap-elapsed-time",
      equalTrackPosition: false,
    });
    expect(result.continuousDistanceDelta).toEqual({
      status: "unavailable",
      reason: "validated-distance-alignment-required",
    });
    expect(() =>
      compareTelemetryLaps(series("A", 90), series("A", 91)),
    ).toThrow();
  });
  it("separates missing/invalid boundaries and degraded origins from scalar timing", () => {
    const a = series("A", 90);
    const b = series("B", 91);
    const missing: LapTelemetry = {
      ...a,
      lap: {
        ...a.lap,
        start: {
          ...a.lap.start,
          timestamp: { status: "missing", reason: "source-missing" },
        },
      },
    };
    expect(compareTelemetryLaps(missing, b).alignment).toEqual({
      status: "unavailable",
      method: "none",
      reason: "missing-boundary",
    });
    expect(
      compareTelemetryLaps(missing, b).lapDifferenceMilliseconds.status,
    ).toBe("available");
    const invalid: LapTelemetry = {
      ...a,
      lap: {
        ...a.lap,
        end: {
          ...a.lap.end,
          timestamp: { status: "available", value: origin },
        },
      },
    };
    expect(compareTelemetryLaps(invalid, b).alignment).toEqual({
      status: "unavailable",
      method: "none",
      reason: "invalid-boundary",
    });
    const approximate: LapTelemetry = {
      ...a,
      lap: {
        ...a.lap,
        start: { ...a.lap.start, method: "source-approximate" },
      },
    };
    expect(compareTelemetryLaps(approximate, b).alignment.status).toBe(
      "degraded",
    );
    const uncertain: LapTelemetry = {
      ...a,
      lap: {
        ...a.lap,
        start: {
          ...a.lap.start,
          uncertaintyMilliseconds: { status: "available", value: 10 },
        },
      },
    };
    expect(compareTelemetryLaps(uncertain, b).alignment.status).toBe(
      "degraded",
    );
    const invalidLap: LapTelemetry = {
      ...a,
      lap: { ...a.lap, validity: "invalid" },
    };
    expect(
      compareTelemetryLaps(invalidLap, b).lapDifferenceMilliseconds,
    ).toEqual({ status: "missing", reason: "invalid" });
  });
  it("does not align empty coverage and splits usable intervals at declared gaps", () => {
    const a = series("A", 90);
    const b = series("B", 91);
    expect(compareTelemetryLaps({ ...a, samples: [] }, b).alignment).toEqual({
      status: "unavailable",
      method: "none",
      reason: "insufficient-coverage",
    });
    const gap: LapTelemetry = {
      ...a,
      quality: {
        ...a.quality,
        completeness: "partial",
        missingIntervals: [
          {
            startMilliseconds: 500,
            endMilliseconds: 1500,
            channels: TELEMETRY_CHANNELS,
            reason: "not-recorded",
          },
        ],
      },
    };
    // A gap cannot create observed endpoints where no source sample exists.
    expect(compareTelemetryLaps(gap, b).alignment).toEqual({
      status: "unavailable",
      method: "none",
      reason: "insufficient-coverage",
    });
    const observed = normalizeTelemetrySamples(
      [
        input("2024-03-02T12:00:00.000000Z"),
        input("2024-03-02T12:00:00.200000Z", 100),
        input("2024-03-02T12:00:01.000000Z", 150),
        input("2024-03-02T12:00:01.800000Z", 200),
        input("2024-03-02T12:00:02.000000Z", 300),
      ],
      origin,
      request.window,
    ).samples;
    const result = compareTelemetryLaps({ ...gap, samples: observed }, b);
    if (result.alignment.status === "unavailable")
      throw new Error("Expected degraded elapsed alignment.");
    expect(result.alignment.validIntervals[0]).toEqual([
      { startMilliseconds: 0, endMilliseconds: 200 },
      { startMilliseconds: 1800, endMilliseconds: 2000 },
    ]);
    expect(result.alignment.status).toBe("degraded");
  });
  it("measures exact UTF-8 bytes and rejects non-JSON or non-finite payloads", () => {
    const multilingual = { label: "Vuelta — 日本 🏎️", rows: [0, false, null] };
    expect(telemetrySerializedBytes(multilingual)).toBe(
      Buffer.byteLength(JSON.stringify(multilingual), "utf8"),
    );
    const cyclic: { self?: unknown } = {};
    cyclic.self = cyclic;
    for (const invalid of [
      NaN,
      Infinity,
      undefined,
      BigInt(1),
      new Date(0),
      { value: undefined },
      cyclic,
    ]) {
      expect(enforceTelemetryPayloadBudget(invalid)).toBe(false);
    }
    expect(
      enforceTelemetryPayloadBudget(
        "x".repeat(TELEMETRY_LIMITS.serializedBytes - 2),
      ),
    ).toBe(true);
    expect(
      enforceTelemetryPayloadBudget(
        "x".repeat(TELEMETRY_LIMITS.serializedBytes - 1),
      ),
    ).toBe(false);
  });
  it("fits representative two-lap 1200-row four-channel JSON within the byte ceiling", () => {
    const a = series("A", 90);
    const b = series("B", 91);
    function displayRows(): readonly TelemetrySample[] {
      return Array.from({ length: 600 }, (_, index): TelemetrySample => ({
        timestamp: {
          original:
            "2024-03-02T12:00:" +
            String(Math.floor(index / 10)).padStart(2, "0") +
            "." +
            String(index % 10).padEnd(6, "0") +
            "Z",
          fractionalSecondDigits: 6,
        },
        elapsedMilliseconds: index * 100,
        sourceIndex: index,
        origin: "synthetic",
        values: {
          speed: { status: "available", value: 300 },
          throttle: { status: "available", value: 100 },
          brake: { status: "available", value: false },
          gear: { status: "available", value: 8 },
        },
      }));
    }
    const result = compareTelemetryLaps(
      {
        ...a,
        samples: displayRows(),
        reduction: { ...a.reduction, inputCount: 600, outputCount: 600 },
      },
      {
        ...b,
        samples: displayRows(),
        reduction: { ...b.reduction, inputCount: 600, outputCount: 600 },
      },
    );
    expect(
      result.laps.reduce((count, lap) => count + lap.samples.length, 0),
    ).toBe(1200);
    expect(telemetrySerializedBytes(result)).toBeLessThanOrEqual(
      TELEMETRY_LIMITS.serializedBytes,
    );
  });
});

describe("tribunal regressions for telemetry integrity", () => {
  it("rejects sparse channel selections instead of skipping absent elements", () => {
    const channels = new Array<"speed">(2);
    channels[1] = "speed";
    expect(
      validateTelemetryRequest("telemetry", { ...request, channels }),
    ).toContain("invalid-channels");
    expect(
      validateTelemetryRequest("telemetry", {
        ...request,
        channels: ["speed"],
      }),
    ).toEqual([]);
  });
  it("rejects sparse JSON collections rather than manufacturing null rows", () => {
    expect(enforceTelemetryPayloadBudget(new Array<TelemetrySample>(1))).toBe(
      false,
    );
    expect(
      enforceTelemetryPayloadBudget({ samples: new Array<TelemetrySample>(1) }),
    ).toBe(false);
    expect(enforceTelemetryPayloadBudget({ samples: [] })).toBe(true);
  });
  it.each(["partial", "unknown"] as const)(
    "degrades independent %s boundary coverage on a complete collection",
    (boundaryCoverage) => {
      const a = series("A", 90);
      const b = series("B", 91);
      const result = compareTelemetryLaps(
        { ...a, quality: { ...a.quality, boundaryCoverage } },
        b,
      );
      expect(result.alignment.status).toBe("degraded");
      expect(result.laps[0].quality.completeness).toBe("complete");
      expect(result.laps[0].samples).toEqual(a.samples);
      expect(result.lapDifferenceMilliseconds).toEqual({
        status: "available",
        value: 1000,
      });
    },
  );
  it.each([
    { status: "missing" },
    { status: "available", value: 2500 },
    { status: "unavailable", reason: "unknown" },
  ] satisfies readonly import("@/types/f1").FieldValue<number>[])(
    "degrades independent sample-clock uncertainty $status",
    (timestampUncertaintyMilliseconds) => {
      const a = series("A", 90);
      const result = compareTelemetryLaps(
        { ...a, quality: { ...a.quality, timestampUncertaintyMilliseconds } },
        series("B", 91),
      );
      expect(result.alignment.status).toBe("degraded");
      expect(result.lapDifferenceMilliseconds).toEqual({
        status: "available",
        value: 1000,
      });
      expect(result.laps[0].samples).toEqual(a.samples);
    },
  );
});
