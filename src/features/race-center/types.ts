import type {
  GrandPrix,
  QualifyingResult,
  RaceResult,
  Season,
  Session,
  SessionKind,
} from "@/types/f1";
import type { DataResult } from "@/types/f1-provider";

/** Optional selectors are defaults only when omitted; invalid input never falls back. */
export interface RaceCenterSelection {
  readonly season?: number;
  readonly round?: number;
  readonly session?: SessionKind;
  readonly invalid?: boolean;
}

export type RaceCenterResults =
  | {
      readonly kind: "race";
      readonly result: DataResult<readonly RaceResult[]>;
    }
  | {
      readonly kind: "qualifying";
      readonly result: DataResult<readonly QualifyingResult[]>;
    }
  | { readonly kind: "unsupported"; readonly reason: string };

/** Serializable normalized data only. Never includes a provider or credentials. */
export interface RaceCenterModel {
  readonly selection: RaceCenterSelection;
  readonly seasons: DataResult<readonly Season[]>;
  readonly calendar?: DataResult<readonly GrandPrix[]>;
  readonly event?: DataResult<GrandPrix>;
  readonly session?: Session;
  readonly results?: RaceCenterResults;
  readonly selectionError?: string;
}
