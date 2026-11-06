# Phase 00.6 — contracts handoff

## Baseline and status

Foundation/infrastructure baseline: `59953485c21bf818d2aef7ccde369f561b37c69e`.
Contract introduction commit: `0aab47098bd629446afb945d3aef7cf281b11b49`.
Contract integration commit on `main`: `a72c5cb8adcc54343dd1e9dea68c0ec336879df2`, merged through [PR #2](https://github.com/Baltasar12/FastDash/pull/2).
Contract version: `F1_CONTRACT_VERSION = 1` in `src/types/f1.ts`.
Historical preparation branch: `codex/phase-00-6-shared-contracts`.
Historical preparation worktree: `E:/CODIGO/FastDash-phase-00-6-shared-contracts`.

Phase 00.6 contracts are committed and integrated into `main`. All 13 reviewed files at the integration commit match the frozen candidate. The original review record and manifest are archived in the [PR #2 description](https://github.com/Baltasar12/FastDash/pull/2), including the pre-commit status as historical evidence. The administrative files `CONTRACTS_REVIEW.md` and `CONTRACTS_SNAPSHOT.json` were deliberately excluded from the 13-file commit; they are not repository-relative links. The archived manifest SHA-256 is `17e3cb3310aa5a7f6241aeecaced4bf8990939a470c138672dd7fe16930148c5`. Its temporary patch path records local review history and is not a portable repository artifact.

## Final common development baseline

The introduction and integration commits identify contract history. The final development baseline also needs this documentation update integrated and validated; do not substitute the old Foundation baseline, feature branch tip or an unresolved moving `main` reference. No final baseline SHA is hardcoded into the commit that describes how to select it.

1. After this documentation update is merged with explicit approval, fetch `origin` without pruning and confirm both PR #2 and the documentation PR are merged into `main`.
2. Resolve `git rev-parse origin/main` once to a full SHA. Verify the contract integration commit and the documentation PR's actual merge/squash commit are ancestors of that SHA. If either check fails, do not start dependent sessions.
3. Validate that exact candidate in an isolated coordinator checkout using the required repository checks. Record the full SHA, `F1_CONTRACT_VERSION = 1` and evidence in the coordinator handoff and all three task records, outside this baseline commit; do not keep rewriting a document with its own HEAD SHA.
4. Approve each stream's bounded scope, ownership and design handoff, then create its branch/worktree from that same recorded immutable SHA. Future movement of `main` does not silently change an assigned baseline.

The three streams have not started. Contract integration alone does not authorize their implementation, a documentation merge, deployment or any other Git operation.

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

**A — Data Layer (`backend_developer`):** Read required docs and create your task record from the coordinator-provided final common development baseline. Own only the Data Layer files assigned in [WORKSTREAMS.md](WORKSTREAMS.md). Verify Jolpica official terms, public redistribution/attribution, quotas, coverage and actual schemas before HTTP integration. Implement all seven `F1DataProvider` methods with server-only enforcement, runtime wire validation, complete pagination, canonical ID mapping and documented caching. Test errors, timeouts, rate limits, no-data and corrected historical results. Do not change shared contracts or fixtures; request coordinated changes if source semantics expose a gap. No OpenF1, UI, auth, database or deployment.

**B — Overview (`frontend_developer`, `ui_designer` support):** Start from the same final common development baseline and separately approved Overview scope/specification. Own only `src/features/overview/**`. Use the shared fixture provider explicitly in development/tests and depend on the interface for server queries. Cover season/standings/next-event/recent-results presentation with loading, empty, unavailable, failed, stale and partial states. Keep synthetic data labeled. Preserve Foundation until an approved replacement. Request route wiring from the coordinator; do not change providers, globals, shared contracts or Race Center.

**C — Race Center (separate `frontend_developer`, `ui_designer` support):** Start from the same final common development baseline and approved Race Center scope/specification. Own only `src/features/race-center/**`. Consume the same provider and fixtures. Support reported event/session lists, stable keys, classification without numeric position, missing qualifying stages/times and all response states. Distinguish sprint context from supported main-race result operations. Request shared route/navigation wiring from the coordinator; do not change Overview, providers, globals or shared contracts.

Each session returns exact branch/HEAD, owned diff/untracked files, tests, contract compatibility, limitations and review evidence. QA test ownership must be transferred explicitly. The coordinator serializes cross-feature assembly, freezes the final candidate, obtains independent tribunal reviews and runs all required checks. See [WORKSTREAMS.md](WORKSTREAMS.md) for integration order and acceptance; readiness never permits a release operation.
