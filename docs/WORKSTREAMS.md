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

## Planned ownership after contract agreement

These are future boundaries, not active assignments. The actual Foundation paths are authoritative; no directories or routes are moved in this phase.

| Stream      | Primary owner                                               | Intended files                                                                                                         | Dependencies / exclusions                                                                                                                                                                                 |
| ----------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Data Layer  | `backend_developer`                                         | `src/data/providers/`; explicitly assigned canonical `src/types/` and `src/schemas/`; permitted adapter fixtures/tests | Verify Jolpica first, OpenF1 only in approved scope; agree consumers, provenance, missing/error and freshness semantics before dependent parallel work. No UI/token edits                                 |
| Overview    | `frontend_developer` with prior `ui_designer` specification | Existing `src/features/overview/` and assigned co-located tests                                                        | Consume agreed typed interface/fixtures. Preserve visible sample disclosure and existing landing until an approved feature replaces it. No adapter/shared contract edits                                  |
| Race Center | Separate `frontend_developer` session with design handoff   | Future `src/features/race-center/` within the existing feature convention; assigned co-located tests                   | Feature directory does not yet exist. Use agreed session/results interface and fixtures. Existing `/race-center` currently uses shared `src/app/[section]/page.tsx`; do not independently replace routing |

The coordinator assigns one integration owner for `src/app/page.tsx`, `src/app/[section]/page.tsx`, `src/config/navigation.ts`, `src/components/`, `src/app/globals.css`, `tests/e2e/`, package/lockfile and shared configuration. These are reserved from concurrent streams unless explicit disjoint files are assigned. In particular, any decision to add a dedicated Race Center route must be scoped and checked against the existing dynamic placeholder; do not make competing route changes in separate streams.

QA owns only assigned tests/fixtures. Tests co-located inside a feature are not automatically free for simultaneous edits by the implementer and QA. Reviewers own no files. Integrator ownership begins at an explicit handoff, not while implementers still write.

## Starting the three streams

1. Have the user authorize the necessary infrastructure commit; no commit is created automatically. Select its validated SHA and agree the next feature scope.
2. Perform the provider/contract preparation task first: verify permissions/semantics, assign one contract owner, agree minimal typed consumer interfaces and deterministic labeled fixtures. This work has not been implemented in Phase 00.5.
3. Validate and, when authorized, commit the shared contract baseline. Assign exact files and create READY records. API contracts remain provider-independent; no schema is guessed for speed.
4. Start Data Layer adapter implementation, Overview UI and Race Center UI from that same contract baseline. UI may use the agreed fixtures while adapters finish; no production fallback. Use up to three active native implementers with disjoint ownership, or three independent worktrees only when long-running sessions need isolation.
5. Collect handoffs, freeze a common review candidate, run the tribunal and full integration checks. Request explicit merge/release authorization only with a concrete reviewable result.
