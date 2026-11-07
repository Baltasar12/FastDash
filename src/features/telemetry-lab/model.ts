/** Local presentation model only. Not a shared telemetry or OpenF1 wire contract. */
export type Channel = "speed" | "throttle" | "brake" | "gear";
export type PreviewState = "ready" | "loading" | "unavailable" | "error";
export type DriverId = "vale" | "sato" | "mercer";
export type SessionId = "qualifying" | "practice" | "race";
export type EventId = "silverstone-2024" | "monza-2023";

export interface Selection {
  eventId: EventId;
  sessionId: SessionId;
  driverA: DriverId;
  driverB: DriverId;
  lapA: number;
  lapB: number;
  preview: PreviewState;
}

export interface Sample {
  elapsedMs: number;
  speed: number | null;
  throttle: number | null;
  brake: number | null;
  gear: number | null;
}

export interface SyntheticLap {
  driverId: DriverId;
  lapNumber: number;
  durationMs: number;
  sectorsMs: readonly [number, number, number];
  samples: readonly Sample[];
}

export const EVENTS: readonly {
  id: EventId;
  label: string;
  location: string;
}[] = [
  {
    id: "silverstone-2024",
    label: "2024 / British Grand Prix",
    location: "Silverstone",
  },
  { id: "monza-2023", label: "2023 / Italian Grand Prix", location: "Monza" },
];
export const SESSIONS: readonly { id: SessionId; label: string }[] = [
  { id: "qualifying", label: "Qualifying" },
  { id: "practice", label: "Practice · partial sample" },
  { id: "race", label: "Race · unavailable preview" },
];
export const DRIVERS: readonly {
  id: DriverId;
  name: string;
  short: string;
  seed: number;
  laps: readonly number[];
}[] = [
  { id: "vale", name: "Alex Vale", short: "VAL", seed: 1, laps: [12, 13, 14] },
  { id: "sato", name: "Rin Sato", short: "SAT", seed: 2, laps: [18, 19, 20] },
  {
    id: "mercer",
    name: "Jules Mercer",
    short: "MER",
    seed: 3,
    laps: [8, 9, 10],
  },
];
export const CHANNELS: readonly {
  id: Channel;
  label: string;
  unit: string;
  min: number;
  max: number;
}[] = [
  { id: "speed", label: "Speed", unit: "km/h", min: 0, max: 360 },
  { id: "throttle", label: "Throttle", unit: "%", min: 0, max: 100 },
  { id: "brake", label: "Braking", unit: "on/off", min: 0, max: 1 },
  { id: "gear", label: "Gear", unit: "gear", min: 0, max: 8 },
];
export const INITIAL_SELECTION: Selection = {
  eventId: "silverstone-2024",
  sessionId: "qualifying",
  driverA: "vale",
  driverB: "sato",
  lapA: 12,
  lapB: 18,
  preview: "ready",
};

export function driverById(id: DriverId) {
  const driver = DRIVERS.find((entry) => entry.id === id);
  if (!driver) throw new Error("Unknown local sample driver");
  return driver;
}

export type SelectionAction =
  | { type: "event"; value: EventId }
  | { type: "session"; value: SessionId }
  | { type: "driver"; slot: "A" | "B"; value: DriverId }
  | { type: "lap"; slot: "A" | "B"; value: number }
  | { type: "preview"; value: PreviewState }
  | { type: "reset" };

export function selectionReducer(
  state: Selection,
  action: SelectionAction,
): Selection {
  switch (action.type) {
    case "event":
      return { ...state, eventId: action.value, preview: "ready" };
    case "session":
      return { ...state, sessionId: action.value, preview: "ready" };
    case "driver": {
      const other = action.slot === "A" ? state.driverB : state.driverA;
      if (action.value === other) return state;
      const lap = driverById(action.value).laps[0];
      if (lap === undefined) return state;
      return action.slot === "A"
        ? { ...state, driverA: action.value, lapA: lap }
        : { ...state, driverB: action.value, lapB: lap };
    }
    case "lap": {
      const driver = driverById(
        action.slot === "A" ? state.driverA : state.driverB,
      );
      if (!driver.laps.includes(action.value)) return state;
      return action.slot === "A"
        ? { ...state, lapA: action.value }
        : { ...state, lapB: action.value };
    }
    case "preview":
      return { ...state, preview: action.value };
    case "reset":
      return { ...INITIAL_SELECTION };
  }
}

/** Invented waveforms, deliberately sparse; no observed/provider telemetry is used. */
export function createSyntheticLap(
  selection: Selection,
  slot: "A" | "B",
): SyntheticLap {
  const driverId = slot === "A" ? selection.driverA : selection.driverB;
  const lapNumber = slot === "A" ? selection.lapA : selection.lapB;
  const driver = driverById(driverId);
  const durationMs =
    (selection.eventId === "silverstone-2024" ? 86800 : 81200) +
    driver.seed * 173 +
    lapNumber * 23 +
    (selection.sessionId === "practice" ? 2600 : 0);
  const s1 = Math.round(durationMs * (0.317 + driver.seed * 0.001));
  const s2 = Math.round(durationMs * (0.386 - driver.seed * 0.001));
  const samples = Array.from({ length: 49 }, (_, index): Sample => {
    const progress = index / 48;
    const phase =
      progress * Math.PI * (selection.eventId === "silverstone-2024" ? 10 : 8) +
      driver.seed * 0.07 +
      lapNumber * 0.015;
    const wave = (Math.cos(phase) + 1) / 2;
    const speed = Math.round(95 + 232 * wave + Math.sin(progress * 19) * 7);
    const missing =
      (driverId === "sato" && index >= 20 && index <= 22) ||
      (selection.sessionId === "practice" && index >= 32 && index <= 36);
    return {
      elapsedMs: Math.round(progress * durationMs),
      speed: missing ? null : speed,
      throttle: missing
        ? null
        : Math.round(wave > 0.33 ? 70 + wave * 30 : wave * 90),
      brake: missing ? null : wave < 0.24 ? 1 : 0,
      gear: missing ? null : Math.min(8, Math.max(2, Math.round(speed / 43))),
    };
  });
  return {
    driverId,
    lapNumber,
    durationMs,
    sectorsMs: [s1, s2, durationMs - s1 - s2],
    samples,
  };
}

export function comparisonState(selection: Selection): PreviewState {
  if (selection.preview !== "ready") return selection.preview;
  return selection.sessionId === "race" ? "unavailable" : "ready";
}

export function formatTime(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  return `${minutes}:${((ms % 60000) / 1000).toFixed(3).padStart(6, "0")}`;
}

export function channelValue(value: number | null, channel: Channel): string {
  if (value === null) return "Unavailable";
  return channel === "brake" ? (value === 1 ? "On" : "Off") : String(value);
}
