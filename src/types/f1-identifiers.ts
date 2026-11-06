import { SESSION_KINDS } from "@/types/f1";
import type { EventId, SessionId, SessionKind } from "@/types/f1";

/** Validated canonical season/round identity, independent of provider names. */
export function createEventId(season: number, round: number): EventId {
  if (!Number.isSafeInteger(season) || season < 1950 || season > 9999) {
    throw new RangeError("Season must be an integer year from 1950 to 9999.");
  }
  if (!Number.isSafeInteger(round) || round < 1) {
    throw new RangeError("Round must be a positive safe integer.");
  }
  return `f1:${season}:${round}`;
}

/** An event has at most one canonical session per listed kind. */
export function createSessionId(
  eventId: EventId,
  kind: SessionKind,
): SessionId {
  const match = /^f1:(\d{4}):([1-9]\d*)$/.exec(eventId);
  if (!match || createEventId(Number(match[1]), Number(match[2])) !== eventId) {
    throw new RangeError("Invalid canonical event identifier.");
  }
  if (!SESSION_KINDS.some((sessionKind) => sessionKind === kind)) {
    throw new RangeError("Unsupported session kind.");
  }
  return `${eventId}:${kind}`;
}
