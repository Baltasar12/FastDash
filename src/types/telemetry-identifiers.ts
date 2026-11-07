import type { DriverId, EventId, SessionId, SessionKind } from "@/types/f1";
import { SESSION_KINDS } from "@/types/f1";
import { createEventId, createSessionId } from "@/types/f1-identifiers";
import type {
  IdentityMapping,
  Reading,
  TelemetryEntryId,
  TelemetryLapId,
} from "@/types/telemetry";

export function validateTelemetrySessionId(value: unknown): SessionId {
  if (typeof value !== "string")
    throw new RangeError("Invalid session identity.");
  const match = /^f1:(\d{4}):([1-9]\d*):(.+)$/.exec(value);
  if (!match) throw new RangeError("Invalid session identity.");
  const eventId: EventId = createEventId(Number(match[1]), Number(match[2]));
  const kind: SessionKind | undefined = SESSION_KINDS.find(
    (item) => item === match[3],
  );
  if (!kind) throw new RangeError("Invalid session kind.");
  if (createSessionId(eventId, kind) !== value)
    throw new RangeError("Invalid session identity.");
  return value as SessionId;
}

export function createTelemetryEntryId(
  sessionId: SessionId,
  driverId: DriverId,
): TelemetryEntryId {
  validateTelemetrySessionId(sessionId);
  if (!/^driver:[a-zA-Z0-9][a-zA-Z0-9:_-]{0,119}$/.test(driverId))
    throw new RangeError("Invalid stable driver identity.");
  return `${sessionId}:entry:${encodeURIComponent(driverId)}`;
}
export function validateTelemetryEntryId(
  value: unknown,
  sessionId: SessionId,
): TelemetryEntryId {
  if (
    typeof value !== "string" ||
    value.length > 450 ||
    !value.startsWith(`${sessionId}:entry:`)
  )
    throw new RangeError("Entry belongs to another session.");
  const encoded = value.slice(`${sessionId}:entry:`.length);
  const decoded = decodeURIComponent(encoded);
  if (
    !decoded.startsWith("driver:") ||
    createTelemetryEntryId(sessionId, decoded as DriverId) !== value
  )
    throw new RangeError("Invalid entry identity.");
  return value as TelemetryEntryId;
}
export function createTelemetryLapId(
  entryId: TelemetryEntryId,
  lapNumber: number,
): TelemetryLapId {
  const sessionId = validateTelemetrySessionId(entryId.split(":entry:")[0]);
  validateTelemetryEntryId(entryId, sessionId);
  if (!Number.isSafeInteger(lapNumber) || lapNumber < 1)
    throw new RangeError("Lap number must be positive.");
  return `${entryId}:lap:${lapNumber}`;
}
export function validateTelemetryLapId(
  value: unknown,
  entryId: TelemetryEntryId,
): TelemetryLapId {
  if (
    typeof value !== "string" ||
    value.length > 480 ||
    !value.startsWith(`${entryId}:lap:`)
  )
    throw new RangeError("Lap belongs to another entry.");
  const number = Number(value.slice(`${entryId}:lap:`.length));
  if (createTelemetryLapId(entryId, number) !== value)
    throw new RangeError("Invalid lap identity.");
  return value as TelemetryLapId;
}

/** No name, driver-number, array-index or provider-key identity inference. */
export function resolveTelemetryMapping<C extends string, R>(
  mapping: IdentityMapping<C, R>,
): Reading<C> {
  return mapping.status === "verified"
    ? { status: "available", value: mapping.canonicalId }
    : { status: "missing", reason: "not-supported" };
}
