# Phase 01C — Race Center handoff

Task ID: SECTOR-01C. Coordinator: main session. Implementation roles:
`ui_designer` and `frontend_developer`; feature tests and preview: `qa_engineer`.

Worktree: `E:/CODIGO/FastDash-race-center`.
Branch: `codex/feature-race-center`.
Starting HEAD: `7f63a8c353e44594aa05889d670b0f708d81b227`.
Contract revision: `F1_CONTRACT_VERSION = 1`.
Contract integration: `a72c5cb8adcc54343dd1e9dea68c0ec336879df2`.
The starting HEAD includes that integration and documentation PR #3.
Initial checkout was clean. `pnpm install --frozen-lockfile` passed.

## Ownership and scope

- Designer: `DESIGN.md`, `race-center.module.css`.
- Frontend: feature production TypeScript/React modules.
- QA: feature-local tests and `validation/**` preview/browser harness.
- Coordinator: this handoff and validation/review evidence.
- Independent tribunal: reports only; no file ownership or edits.

All paths are relative to `src/features/race-center/`. Shared contracts,
fixtures, routes, navigation, globals, dependencies and other features are outside
this task. The user approved this bounded implementation in the Phase 01C prompt.
No commit, merge, push or deployment is authorized or performed.

## Integration boundary

Route composition is intentionally deferred to the integration coordinator.
The feature accepts an injected `F1DataProvider`; production code must not select
the synthetic fixture provider as a fallback. Browser components receive only
serializable view models. Native GET selections allow navigation, keyboard use,
bookmarkable URLs and browser history without exposing providers to the browser.

Reported sessions remain the authoritative schedule. An explicitly requested
`session=qualifying` also queries the main-qualifying result dataset when no
qualifying session is reported. This does not create a session or scheduled time;
the view labels the independently requested dataset separately from the schedule.
The provider's race and qualifying methods refer to the main race and main
qualifying. Practice and sprint results remain explicitly unavailable. Unknown,
canceled and unpublished states must not be replaced with empty results or
fabricated values.

The integration route awaits its `searchParams`, parses them with
`parseRaceCenterSelection`, then renders `RaceCenter` with the explicit `provider`
and parsed `selection` props. Import these and `loadRaceCenter` from `./server`;
that public entry is server-only. The pure injected implementation in
`./query-model` exists for deterministic testing and must not be imported into a
browser component. The browser-safe `./index` exports `RaceCenterView`, which
accepts the serializable model, and `RaceCenterLoading` for host loading/Suspense
composition. It also exports `ResultsTable` and the public types.

`loadRaceCenter` accepts an optional third `RaceCenterQueryOptions` argument with
`now: () => UTCDateTime` for a trusted deterministic server clock. The default
captures the current attempt instant at query start. It does not change provider
retrieval/freshness metadata.

Selectors use `season`, `round` and `session` URL query parameters. Submitting a
season resets the selected event/session; submitting an event resets the session.
Invalid, repeated or unsupported unreported selectors show an explicit selection
message. The explicit qualifying dataset request is the bounded exception above.
Omitted selectors choose the latest supported season, first listed round and main
race when reported, otherwise the first reported session. No date-based finality
or fixed weekend template is inferred. Result rows preserve provider order.

The integration coordinator must retain the shared page landmark, skip link and
independent-project notice. Do not add a second h1 around the feature. Production
provider composition, route/navigation wiring, combined-build validation and
release approval remain separate work.

## Local preview

`validation/` is an isolated development/test host. Its fixture provider is only
enabled when `SECTOR_RACE_CENTER_PREVIEW=1`; this is an explicit preview, never a
production fallback. It has no dependency additions and writes its build under
the ignored root `.next/race-center-preview` directory. See
[validation/README.md](validation/README.md) for production-build and browser-test
commands. Root application routes remain Foundation placeholders.

## Review and validation record

Initial tribunal findings were consolidated without discarding dissent:

| Finding             | Severity                      | Correction                                                                                                                                                                             |
| ------------------- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RC-CODE-01          | Medium                        | Duration formatting now uses the original number's canonical decimal digits, including exponent/submillisecond values, without rounding an isolated fraction across a second boundary. |
| SEC-01 / RC-CODE-02 | Medium / Low, same root cause | Context mismatch errors now use a genuine validation instant through an injectable clock. Historical retrieval time is no longer relabeled as a failed attempt.                        |
| UX-01               | Low                           | Partial-dataset and discovery recovery messages use dataset-neutral or label-aware wording.                                                                                            |

The initial code/UX reviewers recommended PASS with findings; security recommended
FAIL until SEC-01 was corrected. All three root causes were assigned back to the
frontend owner, with independent QA regression tests. The corrected frozen
candidate is returned to all three reviewers; the final reports and consolidated
recommendation accompany this handoff in the coordinating chat.

The full unit suite passed: 8 files / 112 tests, including 5 Race Center files /
77 tests. `pnpm format:check`, `pnpm typecheck` and `pnpm lint` passed with no
warnings. `pnpm build` and `pnpm test:e2e` passed (10 Foundation browser tests).
The isolated preview production build and its 9 Playwright tests passed after
the mobile table-wrapping correction.

Browser evidence covers 320px, 768px and 1440px, native event/session navigation,
unsupported sprint results, search/constructor filters, captioned/scoped tables,
keyboard disclosure toggling and focus retention, skip navigation, keyboard table
scrolling, touch selection, 44px targets, reduced motion, empty/unavailable/error
states, and synthetic/stale/partial/provisional labels. A separate production
server probe without the opt-in variable returned 404 with no results table.
The preview screenshots are ignored artifacts under
`test-results/race-center-preview/`.

Visual inspection caught per-character constructor wrapping at 320px despite
the original overflow checks passing. CSS now preserves readable table columns;
browser regression checks limit closed row height and verify constructor names
occupy no more than three rendered lines. Final screenshots were inspected.
Measured token contrast is 5.54:1 for muted ink/canvas and 8.12:1 for
panel-muted/panel. Browser coverage is Chromium desktop/mobile emulation;
real-device Safari, Firefox and assistive-technology testing remain unperformed.
The reference sites could not be fetched. No real provider integration, licensing
verification or live-feed claim is part of this fixture-backed feature.

One preview command exited 1 without diagnostic output; the complete rerun with
the line reporter passed all 9 tests. Initial local type/lint failures were fixed
without weakening checks. Next's build added its generated-type include paths to
the feature-local validation tsconfig; no shared configuration changed.

The coordinator freezes all files below as one uncommitted candidate using a
SHA-256 manifest and explicit untracked-file list in the OS temporary directory.
Fresh code, UX and security/QA/performance reviewers inspect that same snapshot;
their reports, dispositions, manifest identity and final recommendation accompany
this handoff in the coordinating chat. Reviewer instructions are behaviorally
read-only; this writable parent does not enforce a separate read-only sandbox.
No technical PASS authorizes Git integration or release.

## Exact changed files and Git state

HEAD remains the starting SHA above. All 29 files below are new and untracked;
there are no modifications to previously tracked files. No commits were created.
Paths are relative to this feature directory:

```text
DESIGN.md
HANDOFF.md
data-state.tsx
format.test.ts
format.ts
index.ts
loading.tsx
queries.test.ts
queries.ts
query-model.ts
race-center.module.css
race-center.tsx
results-table.test.tsx
results-table.tsx
selection.test.ts
selection.ts
server.ts
types.ts
validation/.gitignore
validation/README.md
validation/app/layout.tsx
validation/app/page.tsx
validation/next.config.mjs
validation/package.json
validation/playwright.config.ts
validation/race-center.spec.ts
validation/tsconfig.json
view.test.tsx
view.tsx
```

The branch alone does not carry uncommitted files. The integration coordinator
must explicitly include this working-tree diff when preparing the approved
integration. Recheck branch, HEAD, status, worktrees and this manifest before any
assembly. Combine provider composition and route wiring in a separately approved
integration task, then repeat combined production/browser checks and tribunal as
required by the project workflow.

## Phase 01D — INT-02 compatibility correction

The audited failure was reproduced by a calendar/event without a qualifying
session while the provider's main-qualifying method returned a successful result.
`query-model.ts` now permits that lookup only for an explicit qualifying selector,
including direct URL selections parsed by `parseRaceCenterSelection`. It retains
the selected season/round and validates returned session/season context. The
reported event and `session` model stay unchanged; no scheduled time or weekend
format is synthesized. A reported canceled session still prevents result lookup.
Default race navigation makes no additional qualifying request.

The results header distinguishes a successful independent dataset from an
independent request that has no available results. Reported-session controls stay
limited to the authoritative calendar list. Unavailable, empty and error results
remain typed provider responses with their original provenance. No synthetic
fallback, provider modification, shared-contract change or route change was added.

Correction files: `query-model.ts`, `view.tsx`, `queries.test.ts`, `view.test.tsx`,
this handoff and `DESIGN.md`. Regression coverage verifies success without a
reported qualifying entry; direct URL parsing; unavailable session-list coverage;
not-published, not-covered, empty and error results; no speculative background
probe; distinct result labeling; absence of a manufactured scheduled start or
qualifying button; and visible synthetic provenance.

Executed against this correction: `pnpm test -- src/features/race-center` passed
8 files / 121 tests (the project script ran the complete unit suite),
`pnpm format:check`, `pnpm typecheck`, `pnpm lint` and `pnpm build` passed. The
source build still composes Foundation placeholder routes; it verifies compilation
without claiming integrated route behavior. Frozen snapshot identity is recorded
in the current coordinator handoff. Browser checks from Phase 01C above are
historical evidence, not validation of this correction. The integration
coordinator owns the fresh combined build, Playwright and independent correction
review. No commit was made by the correcting agent.
