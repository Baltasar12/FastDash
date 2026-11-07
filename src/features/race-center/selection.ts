import { SESSION_KINDS } from "@/types/f1";
import type { SessionKind } from "@/types/f1";
import type { RaceCenterSelection } from "./types";

export type RaceCenterSearchParams = Readonly<
  Record<string, string | readonly string[] | undefined>
>;

function isSessionKind(value: string): value is SessionKind {
  return SESSION_KINDS.some((kind) => kind === value);
}

/** Repeated, blank, non-decimal and unsafe selectors are rejected explicitly. */
export function parseRaceCenterSelection(
  params: RaceCenterSearchParams,
): RaceCenterSelection {
  const { season, round, session } = params;
  if (
    (season !== undefined &&
      (typeof season !== "string" || !/^\d{4}$/.test(season))) ||
    (round !== undefined &&
      (typeof round !== "string" || !/^[1-9]\d*$/.test(round))) ||
    (session !== undefined &&
      (typeof session !== "string" || !isSessionKind(session)))
  ) {
    return { invalid: true };
  }
  const year = season === undefined ? undefined : Number(season);
  const roundNumber = round === undefined ? undefined : Number(round);
  if (
    (year !== undefined && (year < 1950 || year > 9999)) ||
    (roundNumber !== undefined && !Number.isSafeInteger(roundNumber))
  ) {
    return { invalid: true };
  }
  return {
    ...(year === undefined ? {} : { season: year }),
    ...(roundNumber === undefined ? {} : { round: roundNumber }),
    ...(typeof session === "string" && isSessionKind(session)
      ? { session }
      : {}),
  };
}
