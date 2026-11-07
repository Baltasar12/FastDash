# Phase 03A handoff

Preparation baseline: `c886687a0070bfc9770f51464cde64b091291c01` (Phase 02 merged PR #5).
Branch: `codex/phase03-telemetry-contracts`.
Worktree: `E:/CODIGO/FastDash-phase03-contracts`.
Independent revision: `TELEMETRY_CONTRACT_VERSION = 1`; F1 v1 is unchanged.
Implementation and policy: [TELEMETRY_CONTRACTS.md](TELEMETRY_CONTRACTS.md).

## Same approved baseline

After the Product Owner approves this contract baseline, the coordinator must select and distribute **one exact full approved Git SHA containing these contracts** to both 03B and 03C. Do not start either session from the old Phase 02 preparation SHA or independently selected branch tips. This document cannot self-embed its own final commit SHA; resolve the reviewed contract commit with `git log -1 --format=%H -- docs/TELEMETRY_HANDOFF.md`, then verify the coordinator-approved common baseline contains it using `git merge-base --is-ancestor <contract-commit> <approved-common-sha>`. A local technical GO is not PR, merge or release authorization.

Both sessions record full baseline, contract revision, branch, worktree and clean status. Create distinct feature worktrees only when assigned; never repurpose existing ones. Use frozen lockfile and existing checks. Propose contract changes back to the coordinator before implementing; neither stream owns shared files. No competing provider, shared composition, route activation or public dataset publication.

## Phase 03B — OpenF1 Data Layer

Owner: backend session. Exclusive files: `src/data/providers/openf1/**`, including server-only boundary, wire schemas, mapping, transport/cache/normalization and dedicated tests/docs. Read shared contracts, proposal, architecture/API/workflow/review instructions. Import `TelemetryProvider` from `@/types/telemetry-provider`; do not extend or alter `F1DataProvider`.

Acceptance:

1. Reverify official schemas, coverage, limits, historical/live exclusion and terms. Record unresolved publication rights as a release blocker. No paid access or credentials are needed for historical scope.
2. Implement the five bounded operations with strict runtime wire validation and canonical mappings. Start with historical race/main qualifying; discovery reflects actual coverage. Reject unresolved session/person joins. Do not join by driver number or names.
3. Preserve units, source timestamp fractions, approximate boundaries, source order, missing channels, rejected samples, finality and warnings. Reuse pure validation helpers or provide equally strict verified wire decoding before normalized construction. Never return synthetic data on failure.
4. Enforce request/membership/collection/source-byte/sample/request-count/deadline/output-byte budgets. Shared quota limiter must honor 3/s and 30/min across all operations, with aborts, bounded retries, validated Retry-After and no retry storms. Returned catalog truncation must be explicit partial; never fake complete. No undocumented pagination assumptions.
5. Implement source-aware bounded caching, original retrieval/expiry, mapping/normalization/request/channel/window/version keys, finality independent of freshness, in-flight deduplication and conservative historical correction policy. Existing TTL guidance is provisional pending provider terms; do not cache forever or reset age on hits.
6. If adding reduction, implement the documented feature-preserving policy with fidelity/byte tests; otherwise return budget-exceeded for oversized windows. Distance delta stays unavailable. Elapsed alignment needs evidenced origin and conservative quality.
7. Deterministic offline wire/transport tests for errors, coverage, parsing, precision, quotas, retries, mapping, duplicates, gaps and payload bounds; no live API tests. Fixtures of real permitted responses must be separately labelled and licensed, never copied into synthetic fixtures.
8. Run required project checks and return exact commit/diff, evidence, limitations and independent tribunal reports. No shared composition, F1/Jolpica edits, UI, routes, navigation, dependencies or global config without coordinator handoff.

## Phase 03C — Telemetry Lab Real Data Consumer

Owner: frontend session. Exclusive files: `src/features/telemetry-lab/**`, including existing guarded local validation host and feature-local tests/docs. Use shared `TelemetryProvider` injection at the server/query boundary and serializable normalized envelopes in minimal client islands. Fixtures are explicit development/test imports only. Never import OpenF1/server modules into browser components or add environment-controlled production synthetic fallback.

Acceptance:

1. Replace local prototype assumptions with canonical IDs and discovered contexts, entries and laps. Reset dependent selections deterministically; preserve distinct drivers and reject stale cross-session/lap selections.
2. Narrow every success/empty/unavailable/error/loading state exhaustively, including mapping, coverage and budget reasons. Usable partial data remains visibly partial; no hidden zero substitution.
3. Render four channel units/semantics accurately. Keep independent timestamp/cadence rows and explicit gaps. Label source, synthetic development data, stale/provisional/partial status, approximate origin, reduced samples and elapsed-time alignment. Source validity unknown is visible. Scalar B-minus-A lap difference is separate from disabled continuous-distance delta.
4. Preserve chart/table parity, real observed sample times, accessible names, keyboard/touch controls, focus/status behavior and reduced motion. Verify 320px, tablet and desktop without horizontal page overflow; data tables remain usable.
5. Use shared fixture provider scenarios to exercise healthy race/qualifying, partial/gaps, cadence differences, mapping ambiguity, missing boundaries, failures and budget recovery. Do not create a competing provider or promote local presentation models to shared domain.
6. Preserve the guarded isolated preview and run fresh production/feature-preview E2E with deterministic transport. No public route or navigation activation during development.
7. Return exact commit/diff, tests, responsive/keyboard evidence, limits and independent reviews. No adapter, shared-contract/fixture, route/global/config/dependency edits.

## Coordinator-owned assembly — deferred

Reserved: `src/types/**`, `src/data/fixtures/**`, provider composition outside OpenF1, all `src/app/**`, global navigation, shared tokens/components/configuration, dependencies/lockfile, CI and cross-feature E2E. Integrate only after both streams meet one approved baseline, explicit ownership handoffs, same-candidate code/UX/security reviews and Product Owner approval. Public route/release and dataset rights remain separate gates.

## Validation and review evidence

The final report supplies exact local commit and check results. The companion [TELEMETRY_REVIEW.md](TELEMETRY_REVIEW.md) records frozen manifests, findings, corrections, limits and final tribunal recommendation. No push, PR, merge or deployment is authorized by this handoff.
