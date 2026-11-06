# Phase 00.6 — contracts handoff

## Baseline and status

Foundation/infrastructure baseline: `59953485c21bf818d2aef7ccde369f561b37c69e`.
Contract version: `F1_CONTRACT_VERSION = 1` in `src/types/f1.ts`.
Preparation branch: `codex/phase-00-6-shared-contracts`.
Worktree: `E:/CODIGO/FastDash-phase-00-6-shared-contracts`.

The Phase 00.6 changes are uncommitted. Do not start a new worktree from the baseline and assume it contains contracts. The coordinator must record the same user-authorized contract commit SHA in all future task records. No commit, merge, push, deployment or feature implementation is authorized by this document. Validation and frozen-snapshot tribunal evidence are recorded in [CONTRACTS_REVIEW.md](CONTRACTS_REVIEW.md).

## Imports and consumer rules

| Module                             | Use                                                                                                                        |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `@/types/f1`                       | `Season`, `Driver`, `DriverSeason`, `Constructor`, `GrandPrix`, `Session`, standings/results, `FieldValue`, units and IDs. |
| `@/types/f1-identifiers`           | `createEventId`, `createSessionId`; validate identity without names/dates/UI indexes.                                      |
| `@/types/f1-provider`              | Type-only `F1DataProvider`, `DataResult`, `DataState`, request/error/metadata types.                                       |
| `@/data/fixtures/f1`               | Deterministic synthetic entities and edge cases, shared across both features and tests.                                    |
| `@/data/fixtures/results`          | Synthetic response metadata, result and error scenarios.                                                                   |
| `@/data/fixtures/fixture-provider` | Explicit fixture provider for development/tests; never production fallback.                                                |

Use specific modules, not a global barrel. `Driver` is stable identity; `DriverSeason` carries contextual code/number. Result constructor association is event-specific; driver standings may include several constructors. Unknown data stays wrapped; an actual score of zero is an available value. A finished/retired status is independent of numeric classification. Event session arrays are authoritative; absence does not justify inventing sessions. Race/qualifying provider methods refer to the main race and its qualifying, not sprint results. Sprint sessions are modeled for selection/context; fetching sprint results requires future approved scope.

Inject a provider into a feature's server query. Both UIs can compile and test against fixtures while the real adapter develops. A client island receives serializable normalized data. Do not import an HTTP adapter into a client module.

```ts
import type { F1DataProvider } from "@/types/f1-provider";

export async function describeRace(
  provider: F1DataProvider,
  season: number,
  round: number,
): Promise<string> {
  const result = await provider.getRaceResults({ season, round });
  switch (result.status) {
    case "success": {
      const sample =
        result.metadata.source.kind === "synthetic" ? "SAMPLE — " : "";
      return `${sample}${result.data.length} entries (${result.metadata.freshness})`;
    }
    case "empty":
      return "No entries confirmed for this query";
    case "unavailable":
      return `Results unavailable: ${result.reason}`;
    case "error":
      return result.error.message;
  }
}
```

This example demonstrates narrowing only. Actual UI also surfaces partial/provisional context and required attribution, provides accessible state messages, and uses `DataState` only when it owns loading. Dataset source labels must appear at display, never only in a developer comment. Preserve the existing independent notice and Foundation specimen disclosure. Refer to [API_CONTRACTS.md](API_CONTRACTS.md) for full dates, units, error and cache policy.

## Instructions for the next three sessions

**A — Data Layer (`backend_developer`):** Read required docs and create your task record from the coordinator-provided contract SHA. Own only the Data Layer files assigned in [WORKSTREAMS.md](WORKSTREAMS.md). Verify Jolpica official terms, public redistribution/attribution, quotas, coverage and actual schemas before HTTP integration. Implement all seven `F1DataProvider` methods with server-only enforcement, runtime wire validation, complete pagination, canonical ID mapping and documented caching. Test errors, timeouts, rate limits, no-data and corrected historical results. Do not change shared contracts or fixtures; request coordinated changes if source semantics expose a gap. No OpenF1, UI, auth, database or deployment.

**B — Overview (`frontend_developer`, `ui_designer` support):** Start from the same contract SHA and separately approved Overview scope/specification. Own only `src/features/overview/**`. Use the shared fixture provider explicitly in development/tests and depend on the interface for server queries. Cover season/standings/next-event/recent-results presentation with loading, empty, unavailable, failed, stale and partial states. Keep synthetic data labeled. Preserve Foundation until an approved replacement. Request route wiring from the coordinator; do not change providers, globals, shared contracts or Race Center.

**C — Race Center (separate `frontend_developer`, `ui_designer` support):** Start from the same contract SHA and approved Race Center scope/specification. Own only `src/features/race-center/**`. Consume the same provider and fixtures. Support reported event/session lists, stable keys, classification without numeric position, missing qualifying stages/times and all response states. Distinguish sprint context from supported main-race result operations. Request shared route/navigation wiring from the coordinator; do not change Overview, providers, globals or shared contracts.

Each session returns exact branch/HEAD, owned diff/untracked files, tests, contract compatibility, limitations and review evidence. QA test ownership must be transferred explicitly. The coordinator serializes cross-feature assembly, freezes the final candidate, obtains independent tribunal reviews and runs all required checks. See [WORKSTREAMS.md](WORKSTREAMS.md) for integration order and acceptance; readiness never permits a release operation.
