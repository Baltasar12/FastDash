# Phase 01D — local integration candidate

Date: 2026-11-07. Common baseline: `7f63a8c353e44594aa05889d670b0f708d81b227`. Shared contract: `F1_CONTRACT_VERSION = 1`, unchanged. Main and existing worktrees are preserved. No push, remote PR or deployment is authorized or performed.

## Preservation and assembly

The initial audit matched exactly: Jolpica had eight untracked owned files, Overview seventeen, Race Center twenty-nine; all source HEADs equalled the common baseline, with no tracked or unrelated changes. No unknown concurrent changes were found. Before each authorized commit the coordinator rechecked inventory, boundaries, baseline and frozen hashes. Explicit owned path lists were staged; no unrestricted add, reset, stash or deletion was used.

| Stream      | Source branch                      | Exact source commit                        | Integration cherry-pick                    |
| ----------- | ---------------------------------- | ------------------------------------------ | ------------------------------------------ |
| Jolpica     | `codex/feature-jolpica-data-layer` | `3aae9b31483f1d6ba7b93ce37cc56537e4bca026` | `cb183decad289a96fcd193cc6a775a0d42b3adc3` |
| Overview    | `codex/feature-overview`           | `7acfd65ac5c7a8e26813987dac4b7cc0432d48ff` | `4df58aa5670432d46a4ff16de99e21809605c3bb` |
| Race Center | `codex/feature-race-center`        | `156230798eac1369ed763c1f88ab87480e9f4fc6` | `d12ec4385e8645432c3a07bcfc73730e9718eec4` |

Target: `E:\CODIGO\FastDash-integration-phase-01d`, branch `codex/integration-phase-01d`. Assembly order: data, Overview, Race Center; no conflicts. Integration HEAD after assembly: `d12ec4385e8645432c3a07bcfc73730e9718eec4`. Route/composition/test/documentation changes are a reviewable working-tree candidate; only the three requested feature preservation commits and their cherry-picks were created.

## Corrections

- INT-01: next-calendar selection accepts validated dates when explicit race status is absent/unknown and labels that uncertainty. Past dates only qualify bounded result probes; no completed/cancelled status is fabricated. Up to three sequential recent-event queries continue after unpublished results, stop after operational errors, and preserve provider outcomes and independent metadata.
- INT-02: explicit qualifying requests can retrieve a provider-confirmed result dataset even without a reported qualifying session. The model retains absent schedule/session and the UI explains independently requested results. No schedule control, time or weekend format is manufactured. Unavailable, empty and error responses retain meaning.

Conservative date policy: an event dated today with unknown status stays eligible for next-calendar display; date-based recent-result probes begin the following UTC day. Direct Race Center requests remain available. Overview may omit older published results outside its three-event bound; use Race Center for explicit exploration.

## Feature validation and targeted reviews

Each source passed format:check, typecheck, lint, test and build after corrections: Jolpica 109 tests / 4 files; Overview 88 / 7; Race Center 121 / 8. These source builds still used Foundation routes; they do not substitute for integrated route validation.

Independent behaviorally read-only reviewers inspected the candidates without editing. Their inherited environment was writable; no read-only sandbox was enforced. Targeted code and UX/security/reliability reviews reported PASS, with no confirmed Critical/High/Medium findings. Browser validation was explicitly deferred to integrated checks.

- Jolpica: eight-file snapshot verified unchanged before preservation; security/reliability review PASS.
- INT-01: seventeen-file manifest SHA-256 `b0a5deef6f3ba0fcf87dc4fc7b2280121c953670968a58ed7e64f9c28c430fd6`; every hash independently verified.
- INT-02: twenty-nine-file manifest SHA-256 `d5e59fe3bb6bfffaee4cd56aedacbf4eb9c1ec167b61f4493823066828113a15`; every hash independently verified.

## Application and test boundaries

`src/data/providers/server.ts` composes the existing singleton server-only adapter. `/overview` and `/race-center` validate query selectors and render existing feature exports; native forms preserve shareable URL state. `/` and unrelated placeholders remain. Loading and sanitized render-error boundaries cover route transitions. No shared contract, dependencies or lockfile changed.

Cross-module tests use the real adapter with original synthetic wire shapes. Playwright starts a non-reused production server on port 3107; only that child process preloads a fetch interceptor under `tests/e2e/`. Normal start/dev has no test flag, fixture fallback or transport override. Mocked browser data exercises the adapter and normal route rendering; it does not establish live service availability.

Integration files created (12):

```text
docs/PHASE_01D_INTEGRATION.md
src/app/overview/error.tsx
src/app/overview/loading.tsx
src/app/overview/page.tsx
src/app/race-center/error.tsx
src/app/race-center/loading.tsx
src/app/race-center/page.tsx
src/components/ui/route-error.tsx
src/data/providers/server.ts
src/tests/integration/jolpica-dashboard.test.tsx
tests/e2e/dashboard.spec.ts
tests/e2e/mock-jolpica.mjs
```

Integration files modified (9):

```text
README.md
docs/ARCHITECTURE.md
playwright.config.ts
src/app/[section]/page.tsx
src/app/globals.css
src/config/navigation.ts
src/features/overview/components/overview-dashboard.tsx
src/features/race-center/results-table.tsx
tests/e2e/smoke.spec.ts
```

Git's checkout-EOL stat noise was cleared only for files whose unfiltered Git blob exactly matched HEAD, refreshing their index metadata. No content was staged; the index remains empty. The final source worktrees are clean and retain their original branches and commits.

## Publication limitations

Official [Jolpica terms](https://github.com/jolpica/jolpica-f1/blob/main/TERMS.md) and [rate limits](https://github.com/jolpica/jolpica-f1/blob/main/docs/rate_limits.md) were rechecked on 2026-11-07. Offered data license: CC BY-NC-SA 4.0, non-commercial use; commercial use requires provider contact. Preserve provider credit, license, normalization notice and independent-project disclaimer. Current unauthenticated limits are 4 requests/second and 500/hour and may decrease.

The singleton bounds requests/cache per process and shares cooldown by transport identity. This is not IP-wide coordination across processes/hosts. Public rollout requires coordinated quota planning, confirmation of the intended non-commercial use and attribution/ShareAlike compliance, assessment of underlying rights where relevant, current terms verification and Product Owner release approval. Technical tests confer no redistribution rights. No deployment is performed.

## Combined validation and tribunal

Executed on the integrated worktree: `pnpm format:check`, `pnpm typecheck`, `pnpm lint`, `pnpm test` (260 tests / 14 files) and `pnpm build` all PASS. Build output confirms dynamic `/overview` and `/race-center`, static landing and three preserved placeholders. Initial formatting failure was checkout CRLF; Prettier normalized line endings without content changes to shared contracts, fixtures or dependencies. Initial type/lint errors in new integration code/tests were corrected before the passing suite.

The first `pnpm test:e2e` run passed 20/22; both failures were the same ambiguous alert locator matching Next's route announcer as well as the expected page alert. The locator now targets the main landmark and asserts the actual invalid-season message. Production code/build did not change for this correction. The full rerun passed **22/22** in 33.8 seconds against the fresh production build with a new non-reused server.

Browser evidence covers loading streaming, failure/unavailable states, navigation/context/shared URLs, invalid selectors, reported sessions and independent qualifying, unsupported sprint, keyboard focus, mobile dialog and reduced motion. Both feature pages have no document overflow at 320, 768 and 1440px. Real Chromium screenshots of Overview and Race Center were generated at each width; the coordinator inspected Overview mobile and both desktop captures. Real-device Safari and live upstream availability were not tested.

The first combined frozen manifest contained 73 files, SHA-256 `69cae69e6bf9a30f5be50722217cceec9ebdea0fabf4e0b75b1d2183549f6dcf`. Three fresh reviewers independently verified every hash before/after. Code and security requested changes; UX found no visual blocker but required the same correction. No Critical/High findings were reported. Reviewers inspected actual code and six real screenshots; they did not execute the coordinator's tests or claim live browser/assistive-technology verification. Read-only remained behavioral, not sandbox-enforced.

| Finding IDs                 | Severity          | Evidence and disposition                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| --------------------------- | ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CODE-01 / UX-01 / SEC-QA-01 | Medium, confirmed | Race Center race/qualifying rows and Overview recent results keyed only by driver ID, while the adapter preserves legitimate historical entries for one driver in different cars. Corrected in integration only with stable session/driver/constructor/racing-number keys. Added adapter-to-UI regressions for both result types, filtering/restoration and independent details state, plus Overview rendering, asserting no duplicate-key warning. Source feature commits remain intact. |

Correction validation: format:check, typecheck, lint, **263 tests / 14 files**, build and **22/22 Playwright cases** all PASS; the last browser run took 36.1 seconds against the newly built combined application. Targeted integration suite: 15/15 PASS. No production files changed after this build.

Final executable snapshot v2: 73-file manifest SHA-256 `4e39a7536d6550643d52811023e2c4a6ce3d66aa9f91566889927129d54262b4`. All three reviewers verified every hash before and after their re-review and independently confirmed that only the four declared files differed from v1.

| Final reviewer            | Recommendation | Finding disposition                                                            |
| ------------------------- | -------------- | ------------------------------------------------------------------------------ |
| Fresh `code_reviewer`     | PASS           | CODE-01 resolved; no confirmed findings open                                   |
| Fresh `ux_reviewer`       | PASS           | UX-01 resolved; visual conclusions carried forward, no confirmed findings open |
| Fresh `security_reviewer` | PASS           | SEC-QA-01 resolved; no confirmed findings open                                 |

No voting was used; the common confirmed defect was fixed and each lens independently re-reviewed it. No unresolved Critical/High/Medium technical issue remains. This final evidence update changes only this report; executable files remain identical to reviewed v2. Manifests for v1, v2 and the final evidence snapshot are retained in the coordinator's temporary evidence directory as `sector-phase01d-frozen-v1.txt`, `sector-phase01d-frozen-v2.txt` and `sector-phase01d-frozen-final.txt`.

## Readiness and next authorized operation

Technical recommendation: GO for the integrated local candidate. Before opening a remote integration PR, preserve the 21 reviewed integration files in an additional Conventional Commit and obtain the separately required push/PR authorization. The task explicitly authorized the three source preservation commits; integration wiring remains uncommitted and the source worktrees remain clean. Nothing has been merged into main, pushed, submitted as a remote PR or deployed. Public deployment remains NO-GO until the publication conditions above and Product Owner approval are satisfied.

Run `pnpm start` from the integration worktree to use the built application locally with the real provider. Automated browser fixtures are loaded only by `pnpm test:e2e`.
