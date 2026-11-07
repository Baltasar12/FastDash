import type {
  ConstructorStanding,
  DriverStanding,
  GrandPrix,
  RaceResult,
  Season,
  UTCDateTime,
} from "@/types/f1";
import type { DataState } from "@/types/f1-provider";

export interface OverviewRequest {
  readonly season?: number;
  /** An explicit reference instant makes previews and tests deterministic. */
  readonly now?: UTCDateTime;
}

/** Serializable feature view model. No provider implementation crosses this boundary. */
export interface OverviewModel {
  readonly requestedSeason?: number;
  readonly season: number | null;
  readonly selection:
    "requested" | "current" | "latest-supported" | "unavailable";
  readonly seasons: DataState<readonly Season[]>;
  readonly calendar: DataState<readonly GrandPrix[]>;
  readonly drivers: DataState<readonly DriverStanding[]>;
  readonly constructors: DataState<readonly ConstructorStanding[]>;
  readonly nextEvent: DataState<GrandPrix>;
  readonly recentRaceState: DataState<GrandPrix>;
  readonly recentRace: {
    readonly event: GrandPrix;
    readonly results: DataState<readonly RaceResult[]>;
  } | null;
}

export interface RaceCenterContext {
  readonly season: number;
  readonly round: number;
}
