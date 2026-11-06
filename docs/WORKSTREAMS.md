# Workstreams and task records

This document defines coordination, not a list of started tasks. Phase 00.5 creates no Data Layer, Overview or Race Center implementation. Read [AGENT_WORKFLOW.md](AGENT_WORKFLOW.md), [API_CONTRACTS.md](API_CONTRACTS.md) and [REVIEW_PROCESS.md](REVIEW_PROCESS.md).

## Lightweight record

Copy this template into a task-specific handoff or an agreed coordination document. Use one coordinator as writer of shared records; independent sessions return reports rather than editing the same tracker concurrently.

```text
Task ID: <stable ID>
Feature: <name and bounded scope>
Responsible agent/session: <identifier and actual session reference>
Worktree / branch: <absolute path / verified branch or detached HEAD>
Integration baseline: <full validated SHA; contract revision>
File ownership: <explicit files/globs; exclusions; serialized shared-file handoffs>
Dependencies: <task IDs, contract symbols and readiness evidence>
Acceptance criteria: <observable outcomes>
Status: <one lifecycle status>
Blocked: <no | evidence, impact, owner, required decision>
Tests performed: <command, exit/result, revision; not-run reason>
Review outcome: <base/head or manifest; report references; findings/disposition>
Integration status: <not proposed | proposed | approved by user | integrated + SHA>
Approval evidence: <exact user instruction/reference and authorized operation>
Handoff: <changed files, actual HEAD, dirty state, risks and next owner>
```

Never fill unknown values with invented SHA, test pass, approval or zero. Reconstruct status from local evidence and explicitly identify missing session reports.

## Lifecycle

Normal path: `BACKLOG → READY → IN_PROGRESS → REVIEW → APPROVED → INTEGRATED`.
Correction path: `REVIEW → CHANGES_REQUESTED → IN_PROGRESS → REVIEW`.

| Status            | Entry evidence                                                                                                              |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------- |
| BACKLOG           | Requested scope recorded; no implementation claim                                                                           |
| READY             | Baseline validated, dependencies/contracts agreed, exclusive ownership and acceptance criteria assigned                     |
| IN_PROGRESS       | Assigned session has begun bounded work                                                                                     |
| REVIEW            | Writes frozen, identified diff and validation evidence available to independent reviewers                                   |
| CHANGES_REQUESTED | Evidence-backed findings assigned to owners                                                                                 |
| APPROVED          | Tribunal gates pass or explicit documented user risk acceptance; this is technical readiness, not Git/release authorization |
| INTEGRATED        | Authorized assembly completed; exact integration commit and checks recorded                                                 |

Any status can carry a blocker. A failed required validation prevents approval; unavailable checks stay unverified until resolved or explicitly accepted by the user. No majority voting. Integration changes may return to REVIEW. A task is not INTEGRATED merely because another worktree contains it.

## Phase 00.6 contract baseline

Contract revision: `F1_CONTRACT_VERSION = 1` (see [API_CONTRACTS.md](API_CONTRACTS.md)). Historical preparation baseline: `59953485c21bf818d2aef7ccde369f561b37c69e`. Introduction commit: `0aab47098bd629446afb945d3aef7cf281b11b49`. Contract status: **INTEGRATED** through [PR #2](https://github.com/Baltasar12/FastDash/pull/2) at `a72c5cb8adcc54343dd1e9dea68c0ec336879df2` on `main`. The original frozen review record and manifest are archived in that PR description; their pre-commit statements describe history, not current integration status.

The final common development baseline is selected only after this documentation update is merged and the resulting candidate from `main` is validated. Follow the exact selection and recording procedure in [CONTRACTS_HANDOFF.md](CONTRACTS_HANDOFF.md). Each task record must distinguish the contract integration SHA above from the same coordinator-selected development baseline SHA. These planned streams remain BACKLOG until that baseline is distributed and their scope, exclusive ownership and acceptance criteria are approved. No Data Layer, Overview or Race Center work has started.

## Exclusive ownership matrix

| Stream / owner                                                         | Exclusive files                                                                                                                                                                                                                                                                                    | Dependencies and acceptance                                                                                                                                                                                                                                                                                                                            |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A — Data Layer / `backend_developer`                                   | `src/data/providers/jolpica/**` including wire schemas, normalization, cache helpers and co-located provider tests; `src/data/providers/jolpica.ts` entry if needed                                                                                                                                | Implement `F1DataProvider` unchanged. Verify official terms, attribution, coverage, quotas and schemas first. Validate all responses, normalize identities, cover pagination, errors and unavailable data. Follow freshness policy. No UI, shared domain or shared fixture edits.                                                                      |
| B — Overview / `frontend_developer`, `ui_designer` support             | Existing `src/features/overview/**`, including its feature-local specimen and co-located feature tests                                                                                                                                                                                             | Use approved provider interface via injected server query; use shared synthetic fixtures only in explicit development/test mode. Season dashboard, championship/next-event/recent-results states require separately approved scope. Preserve current landing until approved replacement. No providers, Race Center, contracts, routes or global edits. |
| C — Race Center / separate `frontend_developer`, `ui_designer` support | Future `src/features/race-center/**`, including feature queries and co-located tests; create directory only when work starts                                                                                                                                                                       | Same baseline/interfaces. Event/session selection, classifications and qualifying must handle variable weekends, unavailable fields, all result states and responsive/keyboard behavior. No Overview, providers, contracts, routes or global edits.                                                                                                    |
| Shared / integration coordinator (`integrator` after explicit handoff) | `src/types/**`; `src/data/fixtures/**`; `src/schemas/**`; provider-level shared entry/composition files outside A; `src/app/**`; `src/config/**`; `src/components/**`; `src/lib/**`; `src/hooks/**`; `src/tests/**`; `tests/e2e/**`; package/lockfile/configuration; docs and coordination records | Single writer. Includes navigation, root layout, global styling/tokens, shared routing and all cross-feature assembly. Route wiring occurs after feature handoff, never competing changes to `src/app/[section]/page.tsx`.                                                                                                                             |

An owner owns only the task's assigned files, not an entire role's potential remit. QA may receive exclusive ownership of individual feature tests by explicit handoff; never while the feature implementer writes them. Reviewers own no files. Change shared contracts only through the coordinator with impact analysis, consumer agreement, fixtures/tests and re-review. No stream may redefine domain types or fork fixture models.

## Dependencies and integration order

1. Phase 00.6 validation, tribunal and contract integration are complete. After explicit approval and merge of this documentation update, select, validate and record the final common development baseline using [CONTRACTS_HANDOFF.md](CONTRACTS_HANDOFF.md). Do not confuse the contract introduction commit with that final baseline.
2. Approve each feature's bounded scope and UI specifications. Create task records with exact disjoint paths, contract integration SHA and the same final development baseline, then mark READY. For separate long-running sessions use distinct feature branches/worktrees from the recorded baseline and `pnpm install --frozen-lockfile`.
3. A, B and C can then develop independently. B/C depend on contracts and fixture provider, not on A's implementation. No automatic production fixture fallback. A alone resolves provider payload validation and legal/coverage prerequisites; unverified publication rights remain a release blocker for real data.
4. Validate and review each stream. Recommended assembly order: A provider, B Overview, C Race Center; coordinator serializes provider injection, route composition and navigation. Feature commits must never assume another unintegrated branch's files exist. Resolve shared contract changes before further dependent work.
5. Freeze the combined candidate, repeat tribunal and integration checks. Obtain explicit approval before any merge, push, main modification or deployment. Readiness is not permission.

Acceptance across all streams: strict shared types, meaningful data/edge-state tests, no raw provider responses in UI, visible sample/provenance/freshness, unknown values never zero, no unauthorized branding, all required checks pass. UI streams additionally verify 320px/tablet/desktop, keyboard/touch, focus, reduced motion and native scroll; route/interaction changes require Playwright against a fresh production build.
