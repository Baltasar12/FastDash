# Phase 02C handoff and validation record

## Task and ownership

- Task: SECTOR Phase 02C — Telemetry Lab UX and interactive prototype.
- Workspace: `E:\CODIGO\FastDash-phase02-telemetry-ux`.
- Branch: `codex/phase02-telemetry-ux`.
- Common baseline: `0a2d30a7e198d9f5dd3b2511d3620bdc0be2c061`; clean at start.
- Scope: only `src/features/telemetry-lab/**`. Application routes/navigation,
  providers, shared contracts, tokens, dependencies and lockfile are excluded.
- Authorization: the Phase 02C user request explicitly asks for one local commit
  after validation. It excludes push, PR, merge and deployment.
- Coordinator owns local model, contract proposal, README and this record.
- Native `ui_designer` `/root/design_spec` owned `DESIGN.md`; delivered and
  released ownership before review.
- Native `frontend_developer` `/root/frontend` owns component/CSS/index files.
- Native `qa_engineer` `/root/qa` owns co-located tests and `validation/**`.
- All agents share the checkout and were instructed to preserve other work and
  respect disjoint ownership. Shared model APIs were supplied before UI/tests.
- Fresh independent code, UX and security/performance reviewers inspect a frozen
  common candidate after implementation. Their behavioral read-only instruction
  does not create an enforced sandbox; permissions are inherited.

## Acceptance and design decisions

Historical context (2023+), sessions, two distinct fictional drivers and valid
driver-local lap selections update deterministic synthetic SVGs. Native selects
preserve keyboard/touch behavior. Dark continuous workbench and large light
editorial typography reuse SECTOR tokens, Geist and IBM Plex Mono. A is solid
lime; B is dashed lavender. No third-party assets or official branding are used.

Every analytical area identifies synthetic data. Tables provide complete local
sample alternatives. Missing values split paths and remain unavailable. Brake
and gear use discrete steps; continuous-channel connections are identified as
visual interpolation. Shared elapsed seconds never claim track-position
alignment. Track-distance delta is intentionally unavailable. Manual preview
states make no request and recover to the local samples.

See [DESIGN.md](DESIGN.md), [CONTRACT_PROPOSAL.md](CONTRACT_PROPOSAL.md) and
[README.md](README.md) for detailed design, proposed data capability and future
route/adapter integration steps.

## Evidence

Validation on 2026-11-07, against the feature candidate on the common baseline:

| Check                                                   | Actual result                                                                                                                                    |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `pnpm format:check`                                     | FAIL: 128 untouched baseline files have CRLF working-tree endings while the Git index has LF; `core.autocrlf=true`. No feature file is reported. |
| `pnpm exec prettier --check src/features/telemetry-lab` | PASS for all feature files                                                                                                                       |
| `pnpm typecheck`                                        | PASS, including Next route type generation                                                                                                       |
| `pnpm lint`                                             | PASS, zero warnings                                                                                                                              |
| `pnpm test`                                             | PASS, 16 files / 276 tests; 13 tests belong to this feature                                                                                      |
| `pnpm build`                                            | PASS; existing Telemetry Lab placeholder remains unchanged                                                                                       |
| `pnpm test:e2e` after fresh main build                  | PASS, 22 tests, desktop and mobile Chromium                                                                                                      |
| Preview `next build` with `SECTOR_TELEMETRY_PREVIEW=1`  | PASS, isolated production host                                                                                                                   |
| Feature-local Playwright after fresh preview build      | PASS, 8 tests                                                                                                                                    |
| Preview without environment variable                    | HTTP 404, explicitly checked using a separate server on port 3103                                                                                |

The global formatting failure is an inherited checkout limitation, not a waived
gate. Supplementary in-memory checks of every baseline warning pass after
converting CRLF to LF; no source file was changed by that check. Evidence:
`test-results/telemetry-format-baseline.json`. A separate checkout-normalization
task is required to make the raw global command green. Do not claim consolidated
release readiness or weaken the formatter to conceal this result.

Browser evidence is in ignored `test-results/telemetry-lab-preview/` (full-page
screenshots at 320/768/1440 and loading/unavailable/error) and
`test-results/telemetry-lab-evidence/` (hero/trace viewport screenshots, computed
checks and `final-browser.json`). Observed: no page overflow at all three widths,
no duplicate IDs, no visible-text AA contrast failures in the coordinator's
computed leaf-text scan, visible focus, native skip/keyboard navigation, touch
targets at least 44px, reduced motion and recoverable states. This computed scan
is supplementary, not a full accessibility audit. Screenshots were visually
inspected by the coordinator. Final production navigation reports no page errors
or external requests. All four SVG titles also exist with JavaScript disabled.

The preview loaded six JavaScript resources: 509,875 decoded bytes and 151,505
bytes with local gzip, including React/Next runtime. This is a preview-resource
observation, not an isolated feature-bundle estimate or a wire-transfer claim.
The generated local series has 98 rows total; table bodies mount on disclosure.

Validation found and corrected: an invalid test-only role-query option; a slow
RTL test that accumulated four open tables (split into independent channel
cases without increasing timeouts); Playwright label queries replaced with
exact accessible combobox names; and a genuine React 19 SSR/hydration failure
from multiple text children in SVG title. SVG titles now use one string. Fresh
production tests and a JavaScript-disabled inspection verify the correction.

The initial independent UX review also confirmed loss of keyboard focus when
the recovery button unmounted (UX-01, Medium), and loss of visible series context
while scrolling deep into traces (UX-02, Low). Both were corrected: recovery
focuses the persistent State preview select, and every chart has an accessible
group with a compact visible A/B name/lap/pattern legend. RTL and production
Playwright now verify Enter recovery and focus for all three preview states and
Race reset, plus legend context after changing drivers. Full unit, lint,
typecheck, main/preview production builds and both E2E suites pass after the
correction cycle. The final root E2E command used
`pnpm test:e2e --output=test-results/telemetry-main-regression` to preserve
independent review artifacts; test definitions and assertions were unchanged.

Generated Next dev instructions and next-env/type artifacts are ignored by the
validation host. No generated builds, browser reports or screenshots belong in
the commit. Fresh independent review results, findings and correction evidence
are consolidated in [REVIEW.md](REVIEW.md).

## Known boundaries

- No application route exposes this feature yet. Only the guarded local
  validation host composes it. Route integration is a separate authorized task.
- No OpenF1 adapter, final telemetry contracts, real driver IDs, data request,
  synchronization algorithm, distance delta, polling or persistence is provided.
- Fixed fictional lap menus are valid for every supported synthetic context;
  they are not a claim about real historical participation or session coverage.
- Synthetic generation is sparse and illustrative, not a physics or lap model.
  Arithmetic timing differences do not explain causality or real performance.
- Chromium desktop/mobile-emulation evidence does not establish real-device
  Safari/Firefox behavior or manual screen-reader compatibility.
- Reference access: Obys page was accessible; MECHA could not be fetched. No
  claim is made to have inspected unavailable third-party visual details.
- Proposal budgets and future adapter algorithms are requirements to evaluate,
  not measured performance guarantees or finalized shared domain interfaces.
